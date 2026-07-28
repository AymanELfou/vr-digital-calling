// ─────────────────────────────────────────────────────────────────────────────
// Twilio Media Stream — WebSocket Bridge (Production + Dev Simulation)
//
// ARCHITECTURE:
//   [Customer Phone] ←→ [Twilio] ←→ [This Handler] ←→ [OpenAI Realtime API]
//
// AUDIO FORMAT:
//   Twilio sends/receives: g711_ulaw (8kHz, 8-bit, mono) — base64 encoded
//   OpenAI Realtime API accepts and sends: same format — no transcoding needed
//
// LIFECYCLE:
//   1. Twilio "connected" event
//   2. Twilio "start" event → load company config → open OpenAI WS → session.update
//   3. Twilio "media" events → forward audio to OpenAI
//   4. OpenAI "response.audio.delta" → forward audio to Twilio
//   5. Twilio "stop" event → finalize call record → close OpenAI WS
//
// DEV SIMULATION MODE:
//   When NODE_ENV !== 'production', a /dev/simulate-call endpoint triggers
//   a fake Twilio stream using a sine wave audio buffer for testing.
// ─────────────────────────────────────────────────────────────────────────────

import WebSocket from 'ws'
import { prisma } from '../../services/prisma.service'
import { env } from '../../config/env'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TranscriptEntry {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

interface CompanyCallConfig {
  systemPrompt: string
  voice: string
  temperature: number
  silenceMs: number
  maxTokens: number
  allowGeneral: boolean
  language: string
  engine: string
}

// ─── Active Sessions Map ──────────────────────────────────────────────────────
// This allows the /status webhook to interact with live sessions if needed.
export const activeSessions = new Map<string, TwilioWsHandler>()

import { buildSystemPrompt } from '../../services/prompt-builder.service'

// ─── Load Company Call Config ─────────────────────────────────────────────────

async function loadCompanyConfig(companyId: string): Promise<CompanyCallConfig | null> {
  const aiConfig = await prisma.aiConfig.findUnique({
    where: { companyId },
  })

  if (!aiConfig) return null

  const systemPrompt = await buildSystemPrompt(companyId, aiConfig.allowGeneral)

  return {
    systemPrompt,
    voice: aiConfig.voice,
    temperature: aiConfig.temperature,
    silenceMs: aiConfig.silenceMs,
    maxTokens: aiConfig.maxTokens,
    allowGeneral: aiConfig.allowGeneral,
    language: aiConfig.language,
    engine: aiConfig.engine,
  }
}

// ─── TwilioWsHandler Class ────────────────────────────────────────────────────

export class TwilioWsHandler {
  private twilioWs: WebSocket
  private openAiWs: WebSocket | null = null

  private callSid: string
  private companyId: string | null = null
  private streamSid: string | null = null
  private callerNumber: string | null = null

  private transcript: TranscriptEntry[] = []
  private currentAssistantText = ''
  private isOpenAiReady = false
  private hasGreeted = false
  private audioQueue: string[] = [] // Buffer audio before OpenAI is ready

  private startedAt: Date = new Date()
  private callDbId: string | null = null

  // Idle timeout — if no audio for 30s after call start, clean up
  private idleTimeout: ReturnType<typeof setTimeout> | null = null
  private readonly IDLE_TIMEOUT_MS = 30_000

  constructor(twilioWs: WebSocket, callSid: string) {
    this.twilioWs = twilioWs
    this.callSid = callSid

    this.attachTwilioListeners()
    this.resetIdleTimeout()

    console.log(`[WS] Handler created for callSid: ${callSid}`)
  }

  // ─── Twilio Event Handlers ─────────────────────────────────────────────────

  private attachTwilioListeners(): void {
    this.twilioWs.on('message', async (raw: WebSocket.RawData) => {
      try {
        const msg = JSON.parse(raw.toString())
        await this.handleTwilioMessage(msg)
      } catch (err) {
        console.error(`[WS:${this.callSid}] Error processing Twilio message:`, err)
      }
    })

    this.twilioWs.on('close', async () => {
      console.log(`[WS:${this.callSid}] Twilio WebSocket closed`)
      await this.finalizeCall('COMPLETED')
    })

    this.twilioWs.on('error', (err) => {
      console.error(`[WS:${this.callSid}] Twilio WebSocket error:`, err)
    })
  }

  private async handleTwilioMessage(msg: Record<string, unknown>): Promise<void> {
    switch (msg.event) {
      case 'connected':
        console.log(`[WS:${this.callSid}] Twilio stream connected`)
        break

      case 'start': {
        const start = msg.start as Record<string, unknown>
        this.streamSid = start.streamSid as string
        const params = (start.customParameters ?? {}) as Record<string, string>
        this.companyId = params.companyId ?? null
        this.callerNumber = params.callerNumber ?? 'unknown'

        // The real callSid comes from customParameters (more reliable than URL)
        const realCallSid = params.callSid ?? this.callSid
        if (realCallSid !== this.callSid) {
          // Re-register under the real callSid
          activeSessions.delete(this.callSid)
          this.callSid = realCallSid
          activeSessions.set(this.callSid, this)
        }

        console.log(
          `[WS:${this.callSid}] Stream started — companyId: ${this.companyId}, caller: ${this.callerNumber}`,
        )

        if (!this.companyId) {
          console.error(`[WS:${this.callSid}] No companyId in stream parameters`)
          this.sendTwilioError('AI assistant configuration error.')
          this.twilioWs.close()
          return
        }

        // Look up DB call record
        const callRecord = await prisma.call.findUnique({
          where: { twilioCallSid: this.callSid },
          select: { id: true },
        })
        this.callDbId = callRecord?.id ?? null
        this.startedAt = new Date()

        // Load company config and connect to OpenAI
        await this.initOpenAi()
        break
      }

      case 'media': {
        const media = msg.media as Record<string, string>
        const payload = media.payload

        if (!payload) break
        this.resetIdleTimeout()

        if (this.isOpenAiReady && this.openAiWs?.readyState === WebSocket.OPEN) {
          // Flush queued audio first
          if (this.audioQueue.length > 0) {
            for (const queued of this.audioQueue) {
              this.sendToOpenAi({ type: 'input_audio_buffer.append', audio: queued })
            }
            this.audioQueue = []
          }
          this.sendToOpenAi({ type: 'input_audio_buffer.append', audio: payload })
        } else {
          // Buffer until OpenAI is ready (brief window at call start)
          this.audioQueue.push(payload)
          if (this.audioQueue.length > 100) this.audioQueue.shift() // Prevent unbounded growth
        }
        break
      }

      case 'stop':
        console.log(`[WS:${this.callSid}] Twilio stream stopped`)
        await this.finalizeCall('COMPLETED')
        break
    }
  }

  // ─── OpenAI Realtime API ──────────────────────────────────────────────────

  private async initOpenAi(): Promise<void> {
    if (!this.companyId) return

    const config = await loadCompanyConfig(this.companyId)

    if (!config) {
      console.error(`[WS:${this.callSid}] No AI config for company: ${this.companyId}`)
      this.sendTwilioError('AI assistant is not configured. Please contact us directly.')
      await this.finalizeCall('FAILED')
      return
    }

    console.log(`[WS:${this.callSid}] Connecting to OpenAI Realtime API (voice: ${config.voice})`)

    this.openAiWs = new WebSocket(
      'wss://api.openai.com/v1/realtime?model=gpt-realtime-mini',
      {
        headers: {
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        },
      },
    )

    this.openAiWs.on('open', () => {
      console.log(`[WS:${this.callSid}] OpenAI Realtime connected`)

      // Configure the session matching OpenAI GA schema
      this.sendToOpenAi({
        type: 'session.update',
        session: {
          type: 'realtime',
          instructions: config.systemPrompt,
          audio: {
            input: {
              format: {
                type: 'audio/pcmu',
              },
              transcription: {
                model: 'whisper-1', // Enable real-time user speech transcription
              },
              turn_detection: {
                type: 'server_vad',             // Automatic voice activity detection
                threshold: 0.5,                 // VAD sensitivity
                prefix_padding_ms: 300,         // Pre-speech buffer
                silence_duration_ms: config.silenceMs, // End-of-speech detection
              },
            },
            output: {
              format: {
                type: 'audio/pcmu',
              },
              voice: config.voice,
            },
          },
        },
      })

      this.isOpenAiReady = true

      // Flush any audio that arrived before OpenAI was ready
      if (this.audioQueue.length > 0) {
        console.log(`[WS:${this.callSid}] Flushing ${this.audioQueue.length} buffered audio chunks`)
        for (const chunk of this.audioQueue) {
          this.sendToOpenAi({ type: 'input_audio_buffer.append', audio: chunk })
        }
        this.audioQueue = []
      }
    })

    this.openAiWs.on('message', (raw: WebSocket.RawData) => {
      try {
        const msg = JSON.parse(raw.toString())
        this.handleOpenAiMessage(msg)
      } catch (err) {
        console.error(`[WS:${this.callSid}] Error parsing OpenAI message:`, err)
      }
    })

    this.openAiWs.on('error', async (err) => {
      console.error(`[WS:${this.callSid}] OpenAI WebSocket error:`, err)
      // Send graceful fallback message to caller
      this.sendTwilioError(
        'I\'m experiencing a technical issue. Please hold on or call back shortly.',
      )
      await this.finalizeCall('FAILED')
    })

    this.openAiWs.on('close', () => {
      console.log(`[WS:${this.callSid}] OpenAI WebSocket closed`)
      this.isOpenAiReady = false
    })
  }

  // ─── OpenAI Message Handler ───────────────────────────────────────────────

  private handleOpenAiMessage(msg: Record<string, unknown>): void {
    // 🔍 Temporary trace logging for debugging OpenAI Realtime GA events
    console.log(`[WS:${this.callSid}] OpenAI Event: ${msg.type}`)
    if (msg.type === 'error') {
      console.error(`[WS:${this.callSid}] OpenAI Error event payload:`, JSON.stringify(msg, null, 2))
    }

    switch (msg.type) {
      // AI audio chunk → forward to Twilio to play to caller
      case 'response.output_audio.delta': {
        const audioDelta = msg.delta as string
        if (audioDelta && this.streamSid && this.twilioWs.readyState === WebSocket.OPEN) {
          this.twilioWs.send(
            JSON.stringify({
              event: 'media',
              streamSid: this.streamSid,
              media: { payload: audioDelta },
            }),
          )
        }
        break
      }

      // AI text delta → accumulate for transcript
      case 'response.output_audio_transcript.delta': {
        this.currentAssistantText += (msg.delta as string) ?? ''
        break
      }

      // AI finished one complete response turn
      case 'response.output_audio_transcript.done': {
        if (this.currentAssistantText.trim()) {
          this.transcript.push({
            role: 'assistant',
            content: this.currentAssistantText.trim(),
            timestamp: new Date().toISOString(),
          })
          console.log(`[WS:${this.callSid}] AI said: "${this.currentAssistantText.trim().slice(0, 80)}..."`)
        }
        this.currentAssistantText = ''
        break
      }

      // User speech transcript (from Whisper transcription)
      case 'conversation.item.input_audio_transcription.completed': {
        const userText = (msg.transcript as string) ?? ''
        if (userText.trim()) {
          this.transcript.push({
            role: 'user',
            content: userText.trim(),
            timestamp: new Date().toISOString(),
          })
          console.log(`[WS:${this.callSid}] Caller said: "${userText.trim().slice(0, 80)}..."`)
        }
        break
      }

      // Clear audio buffer request from OpenAI (happens when AI interrupts)
      case 'input_audio_buffer.cleared': {
        console.log(`[WS:${this.callSid}] Audio buffer cleared by OpenAI`)
        break
      }

      // OpenAI session ready confirmation
      case 'session.created':
        console.log(`[WS:${this.callSid}] OpenAI session created`)
        break

      case 'session.updated':
        console.log(`[WS:${this.callSid}] OpenAI session updated`)
        if (!this.hasGreeted) {
          this.hasGreeted = true
          console.log(`[WS:${this.callSid}] Triggering initial AI voice greeting...`)
          this.sendToOpenAi({
            type: 'response.create',
          })
        }
        break

      // Error from OpenAI
      case 'error': {
        const error = msg.error as Record<string, unknown>
        console.error(`[WS:${this.callSid}] OpenAI API error:`, error)
        break
      }
    }
  }

  // ─── Call Finalization ────────────────────────────────────────────────────

  private finalizing = false

  async finalizeCall(status: 'COMPLETED' | 'FAILED'): Promise<void> {
    if (this.finalizing) return // Prevent double-finalization
    this.finalizing = true

    if (this.idleTimeout) {
      clearTimeout(this.idleTimeout)
      this.idleTimeout = null
    }

    const endedAt = new Date()
    const duration = Math.round((endedAt.getTime() - this.startedAt.getTime()) / 1000)

    // Save transcript and finalize call record
    if (this.callDbId || this.callSid) {
      try {
        await prisma.call.updateMany({
          where: { twilioCallSid: this.callSid },
          data: {
            status,
            duration,
            endedAt,
            transcript: this.transcript.length > 0 ? (this.transcript as object[]) : undefined,
          },
        })
        console.log(
          `[WS:${this.callSid}] Call finalized — status: ${status}, duration: ${duration}s, transcript: ${this.transcript.length} entries`,
        )
      } catch (err) {
        console.error(`[WS:${this.callSid}] Failed to save call record:`, err)
      }
    }

    // Close OpenAI connection
    if (this.openAiWs && this.openAiWs.readyState !== WebSocket.CLOSED) {
      this.openAiWs.close()
    }
    this.openAiWs = null

    // Remove from active sessions
    activeSessions.delete(this.callSid)
    console.log(`[WS:${this.callSid}] Session cleaned up. Active sessions: ${activeSessions.size}`)
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private sendToOpenAi(msg: Record<string, unknown>): void {
    if (this.openAiWs?.readyState === WebSocket.OPEN) {
      this.openAiWs.send(JSON.stringify(msg))
    }
  }

  /** Play a TTS error message to the caller via Twilio */
  private sendTwilioError(text: string): void {
    if (this.streamSid && this.twilioWs.readyState === WebSocket.OPEN) {
      // Send a clear mark to interrupt any current audio
      this.twilioWs.send(
        JSON.stringify({
          event: 'clear',
          streamSid: this.streamSid,
        }),
      )
    }
  }

  private resetIdleTimeout(): void {
    if (this.idleTimeout) clearTimeout(this.idleTimeout)
    this.idleTimeout = setTimeout(async () => {
      console.warn(`[WS:${this.callSid}] Idle timeout — finalizing call`)
      await this.finalizeCall('COMPLETED')
      if (this.twilioWs.readyState !== WebSocket.CLOSED) {
        this.twilioWs.close()
      }
    }, this.IDLE_TIMEOUT_MS)
  }
}

// ─── Main Entry Point ─────────────────────────────────────────────────────────
// Called from index.ts when Twilio opens a WebSocket to /ws/media

export function handleMediaStream(twilioWs: WebSocket, callSid: string): void {
  const handler = new TwilioWsHandler(twilioWs, callSid)
  activeSessions.set(callSid, handler)
  console.log(
    `[WS] New session registered. Active sessions: ${activeSessions.size}`,
  )
}

// ─── Dev Simulation Mode ──────────────────────────────────────────────────────
// Simulates a Twilio Media Stream WebSocket for local testing without Twilio.
// Triggered by POST /dev/simulate-call (only available when NODE_ENV !== 'production').

import { Router } from 'express'
import { IncomingMessage } from 'http'
import type { WebSocketServer } from 'ws'

export const devRouter = Router()

export function attachDevSimulationRoute(wss: WebSocketServer): void {
  if (env.NODE_ENV === 'production') return

  devRouter.post('/simulate-call', async (req, res) => {
    const { companyId, callerNumber = '+15551234567' } = req.body as {
      companyId?: string
      callerNumber?: string
    }

    if (!companyId) {
      res.status(400).json({ error: 'companyId is required' })
      return
    }

    // Verify company exists
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true },
    })

    if (!company) {
      res.status(404).json({ error: 'Company not found' })
      return
    }

    const fakeCallSid = `CAdev${Date.now()}`

    // Create a fake call record
    await prisma.call.create({
      data: {
        companyId,
        twilioCallSid: fakeCallSid,
        callerNumber,
        status: 'IN_PROGRESS',
      },
    })

    // Simulate a Twilio WebSocket connection in-process
    const wsUrl = `ws://localhost:${env.PORT}/ws/media`

    const fakeClient = new WebSocket(wsUrl)

    fakeClient.on('open', () => {
      console.log(`[DEV SIM] Simulated Twilio client connected`)

      // Send "connected" event
      fakeClient.send(JSON.stringify({ event: 'connected', protocol: 'Call' }))

      // Send "start" event with custom parameters
      setTimeout(() => {
        fakeClient.send(
          JSON.stringify({
            event: 'start',
            start: {
              streamSid: `MZdev${Date.now()}`,
              callSid: fakeCallSid,
              customParameters: {
                companyId,
                callSid: fakeCallSid,
                callerNumber,
              },
            },
          }),
        )
        console.log(`[DEV SIM] Sent start event for company: ${company.name}`)
      }, 100)

      // Send fake silence audio for 5 seconds (simulates caller connected)
      const silenceChunk = Buffer.alloc(160, 0xFF).toString('base64') // g711_ulaw silence
      let audioInterval: ReturnType<typeof setInterval> | null = null
      let elapsed = 0

      audioInterval = setInterval(() => {
        if (fakeClient.readyState !== WebSocket.OPEN) {
          if (audioInterval) clearInterval(audioInterval)
          return
        }
        fakeClient.send(
          JSON.stringify({
            event: 'media',
            media: { payload: silenceChunk, track: 'inbound' },
          }),
        )
        elapsed += 20
        // Stop after 10 seconds
        if (elapsed >= 10_000) {
          if (audioInterval) clearInterval(audioInterval)
          setTimeout(() => {
            fakeClient.send(JSON.stringify({ event: 'stop', stop: {} }))
            fakeClient.close()
          }, 500)
        }
      }, 20) // 20ms = 160 bytes of g711_ulaw at 8kHz
    })

    fakeClient.on('error', (err) => {
      console.error('[DEV SIM] Client error:', err)
    })

    res.json({
      message: 'Simulation started',
      callSid: fakeCallSid,
      companyId,
      callerNumber,
      note: 'Check backend logs for OpenAI session activity. Call auto-ends in 10 seconds.',
    })
  })

  console.log('[DEV] Simulation route registered at POST /dev/simulate-call')
}
