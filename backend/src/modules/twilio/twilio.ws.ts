// ─────────────────────────────────────────────────────────────────────────────
// Twilio Media Stream — WebSocket Handler
//
// This is the CORE of VR Digital Calling.
//
// When Twilio connects a Media Stream, it opens a WebSocket to our server.
// We simultaneously open a WebSocket to OpenAI Realtime API.
// We bridge audio between the two connections in real time.
//
// Architecture:
//   Caller → [Twilio] ←→ [Our WS] ←→ [OpenAI Realtime] → AI Response
//
// Message format from Twilio Media Streams (JSON):
//   - event: "start"    → Call metadata + streamSid
//   - event: "media"    → Audio chunk (base64 mulaw, 8kHz)
//   - event: "stop"     → Call ended
//
// OpenAI Realtime API (JSON messages):
//   - session.update    → Configure the session (system prompt, voice, etc.)
//   - input_audio_buffer.append → Send audio from caller
//   - response.audio.delta → Receive AI audio to play back
//   - response.audio_transcript.delta → Receive transcript text
// ─────────────────────────────────────────────────────────────────────────────

import WebSocket from 'ws'
import OpenAI from 'openai'
import { prisma } from '../../services/prisma.service'
import { env } from '../../config/env'

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY })

// Transcript entry stored in the DB after the call
interface TranscriptEntry {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

/**
 * Builds the system prompt for the AI by combining:
 * 1. The company's custom instructions
 * 2. Business context (services, FAQ, hours, etc.)
 *
 * This is injected into the OpenAI Realtime session.
 */
async function buildSystemPrompt(companyId: string): Promise<string> {
  const [company, aiConfig, services, knowledgeBase] = await Promise.all([
    prisma.company.findUnique({
      where: { id: companyId },
      select: { name: true, description: true, address: true, email: true },
    }),
    prisma.aiConfig.findUnique({
      where: { companyId },
    }),
    prisma.service.findMany({
      where: { companyId, isActive: true },
      select: { name: true, description: true, price: true, duration: true },
    }),
    prisma.knowledgeBase.findMany({
      where: { companyId, isActive: true },
      select: { question: true, answer: true, category: true },
    }),
  ])

  if (!company || !aiConfig) {
    return 'You are a helpful AI assistant. Answer caller questions politely.'
  }

  const servicesText =
    services.length > 0
      ? `\n\n## Our Services\n${services
          .map(
            (s) =>
              `- **${s.name}**${s.price ? ` — $${s.price}` : ''}${s.duration ? ` (${s.duration})` : ''}${s.description ? `: ${s.description}` : ''}`,
          )
          .join('\n')}`
      : ''

  const faqText =
    knowledgeBase.length > 0
      ? `\n\n## Knowledge Base / FAQ\n${knowledgeBase
          .map((kb) => `**Q: ${kb.question}**\nA: ${kb.answer}`)
          .join('\n\n')}`
      : ''

  const companyInfo = [
    company.name && `Company: ${company.name}`,
    company.description && `About us: ${company.description}`,
    company.address && `Address: ${company.address}`,
    company.email && `Email: ${company.email}`,
  ]
    .filter(Boolean)
    .join('\n')

  const generalKnowledgeInstruction = aiConfig.allowGeneral
    ? '\n\nYou may use your general knowledge to answer questions not covered above.'
    : '\n\nIMPORTANT: Only answer questions based on the company information provided above. If you do not have the information to answer a question, politely say you do not have that information and suggest the caller contact us directly.'

  return `${aiConfig.systemPrompt}

## Company Information
${companyInfo}
${servicesText}
${faqText}
${generalKnowledgeInstruction}

## Voice Interaction Rules
- Keep responses concise and natural for a phone call
- Do not use markdown, bullet points, or formatting in your responses
- Speak conversationally and warmly
- If the caller is frustrated, stay calm and empathetic`
}

/**
 * Main WebSocket handler called from index.ts when Twilio connects.
 * Manages the full lifecycle of one phone call.
 */
export function handleMediaStream(twilioWs: WebSocket, callSid: string): void {
  let openAiWs: WebSocket | null = null
  let companyId: string | null = null
  let streamSid: string | null = null
  const transcript: TranscriptEntry[] = []
  let currentAssistantText = ''

  // ─── Connect to OpenAI Realtime API ───────────────────────────────────────
  function connectToOpenAI(systemPrompt: string, voice: string) {
    openAiWs = new WebSocket(
      'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17',
      {
        headers: {
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
          'OpenAI-Beta': 'realtime=v1',
        },
      },
    )

    openAiWs.on('open', () => {
      console.log(`[OPENAI] Connected for callSid: ${callSid}`)

      // Configure the Realtime session
      sendToOpenAI({
        type: 'session.update',
        session: {
          turn_detection: { type: 'server_vad' }, // Server-side voice activity detection
          input_audio_format: 'g711_ulaw',         // Twilio sends mulaw (ulaw)
          output_audio_format: 'g711_ulaw',        // Send mulaw back to Twilio
          voice,
          instructions: systemPrompt,
          modalities: ['text', 'audio'],
          temperature: 0.6,
        },
      })
    })

    openAiWs.on('message', (data: WebSocket.RawData) => {
      try {
        const message = JSON.parse(data.toString())
        handleOpenAIMessage(message)
      } catch (err) {
        console.error('[OPENAI] Failed to parse message:', err)
      }
    })

    openAiWs.on('error', (err) => {
      console.error(`[OPENAI] WebSocket error for callSid ${callSid}:`, err)
    })

    openAiWs.on('close', () => {
      console.log(`[OPENAI] Disconnected for callSid: ${callSid}`)
    })
  }

  // ─── Handle OpenAI messages ───────────────────────────────────────────────
  function handleOpenAIMessage(message: Record<string, unknown>) {
    switch (message.type) {
      // AI audio delta — forward to Twilio
      case 'response.audio.delta': {
        const audioDelta = message.delta as string
        if (audioDelta && streamSid && twilioWs.readyState === WebSocket.OPEN) {
          const twilioMessage = {
            event: 'media',
            streamSid,
            media: { payload: audioDelta }, // Already base64 mulaw
          }
          twilioWs.send(JSON.stringify(twilioMessage))
        }
        break
      }

      // AI text transcript delta — accumulate for storage
      case 'response.audio_transcript.delta': {
        currentAssistantText += (message.delta as string) ?? ''
        break
      }

      // AI finished speaking — save transcript entry
      case 'response.audio_transcript.done': {
        if (currentAssistantText.trim()) {
          transcript.push({
            role: 'assistant',
            content: currentAssistantText.trim(),
            timestamp: new Date().toISOString(),
          })
        }
        currentAssistantText = ''
        break
      }

      // User speech transcript — save transcript entry
      case 'conversation.item.input_audio_transcription.completed': {
        const userText = (message.transcript as string) ?? ''
        if (userText.trim()) {
          transcript.push({
            role: 'user',
            content: userText.trim(),
            timestamp: new Date().toISOString(),
          })
        }
        break
      }

      case 'error': {
        console.error('[OPENAI] API Error:', message.error)
        break
      }
    }
  }

  // ─── Handle Twilio messages ────────────────────────────────────────────────
  twilioWs.on('message', async (data: WebSocket.RawData) => {
    try {
      const message = JSON.parse(data.toString())

      switch (message.event) {
        // Call started — initialize the session
        case 'start': {
          streamSid = message.start.streamSid
          const customParams = message.start.customParameters ?? {}
          companyId = customParams.companyId ?? null

          console.log(`[TWILIO] Stream started — streamSid: ${streamSid}, companyId: ${companyId}`)

          if (!companyId) {
            console.error('[TWILIO] No companyId in custom parameters')
            twilioWs.close()
            return
          }

          // Load company config and build system prompt
          const [systemPrompt, aiConfig] = await Promise.all([
            buildSystemPrompt(companyId),
            prisma.aiConfig.findUnique({
              where: { companyId },
              select: { voice: true },
            }),
          ])

          const voice = aiConfig?.voice ?? 'alloy'
          connectToOpenAI(systemPrompt, voice)
          break
        }

        // Audio chunk from caller → forward to OpenAI
        case 'media': {
          if (openAiWs?.readyState === WebSocket.OPEN) {
            sendToOpenAI({
              type: 'input_audio_buffer.append',
              audio: message.media.payload, // base64 mulaw audio
            })
          }
          break
        }

        // Call ended — save transcript and close connections
        case 'stop': {
          console.log(`[TWILIO] Stream stopped for callSid: ${callSid}`)
          await saveTranscript()
          cleanup()
          break
        }
      }
    } catch (err) {
      console.error('[TWILIO] Failed to handle message:', err)
    }
  })

  twilioWs.on('close', async () => {
    console.log(`[TWILIO] WebSocket closed for callSid: ${callSid}`)
    await saveTranscript()
    cleanup()
  })

  twilioWs.on('error', (err) => {
    console.error(`[TWILIO] WebSocket error for callSid ${callSid}:`, err)
  })

  // ─── Helpers ──────────────────────────────────────────────────────────────

  function sendToOpenAI(message: Record<string, unknown>): void {
    if (openAiWs?.readyState === WebSocket.OPEN) {
      openAiWs.send(JSON.stringify(message))
    }
  }

  async function saveTranscript(): Promise<void> {
    if (transcript.length === 0 || !callSid) return
    try {
      await prisma.call.updateMany({
        where: { twilioCallSid: callSid },
        data: { transcript: JSON.stringify(transcript) },
      })
      console.log(`[DB] Transcript saved for callSid: ${callSid} (${transcript.length} entries)`)
    } catch (err) {
      console.error(`[DB] Failed to save transcript for callSid ${callSid}:`, err)
    }
  }

  function cleanup(): void {
    if (openAiWs && openAiWs.readyState !== WebSocket.CLOSED) {
      openAiWs.close()
    }
    openAiWs = null
  }
}
