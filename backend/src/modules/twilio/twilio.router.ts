// ─────────────────────────────────────────────────────────────────────────────
// Twilio Voice Webhook Router — MVP Single-Account Architecture
//
// Architecture:
//   - ONE Twilio account configured via .env (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN)
//   - ONE Twilio phone number (TWILIO_PHONE_NUMBER = +17373457612)
//   - ALL incoming calls are routed to DEMO_COMPANY_ID
//
// Flow:
//   1. Customer calls +17373457612
//   2. Twilio POSTs to /api/twilio/voice
//   3. Validate X-Twilio-Signature using platform TWILIO_AUTH_TOKEN
//   4. Load DEMO_COMPANY_ID company from DB, verify active + has AI config
//   5. Create Call record in PostgreSQL
//   6. Return TwiML instructing Twilio to open a WebSocket Media Stream
//
// Note: Multi-company routing can be added later by looking up the company
// based on a URL parameter or custom Twilio subaccount.
// ─────────────────────────────────────────────────────────────────────────────

import { Router, Request, Response } from 'express'
import twilio from 'twilio'
import { prisma } from '../../services/prisma.service'
import { env } from '../../config/env'

const router = Router()

// ─── Twilio client (lazy initialization) ─────────────────────────────────────
// We lazily create the client so the backend starts without Twilio credentials.
// If TWILIO_ACCOUNT_SID/AUTH_TOKEN are not set, calls will fail gracefully.
let _twilioClient: ReturnType<typeof twilio> | null = null

function getTwilioClient() {
  if (!_twilioClient) {
    if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
      throw new Error(
        'Twilio credentials not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in .env',
      )
    }
    _twilioClient = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN)
  }
  return _twilioClient
}

// ─── Helper: build the exact webhook URL as Twilio computed it ────────────────
// Must match perfectly for HMAC-SHA1 signature validation.
// When behind Nginx/proxy, X-Forwarded-Proto provides the real scheme.
function buildWebhookUrl(req: Request): string {
  const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol
  const host = (req.headers['x-forwarded-host'] as string) || req.hostname
  return `${proto}://${host}${req.originalUrl}`
}

// ─── Helper: send a polite TwiML error response and hang up ──────────────────
function sendErrorTwiML(res: Response, message: string): void {
  const twiml = new twilio.twiml.VoiceResponse()
  twiml.say({ voice: 'alice', language: 'en-US' }, message)
  twiml.hangup()
  res.type('text/xml').status(200).send(twiml.toString())
}

// ─── POST /api/twilio/voice (or /api/twilio/incoming) ─────────────────────────
// Entry point for all incoming calls. Twilio calls this webhook when a
// customer dials TWILIO_PHONE_NUMBER. Returns TwiML to start a Media Stream.

router.post(['/voice', '/incoming'], async (req: Request, res: Response) => {
  const callSid: string = (req.body.CallSid ?? '').trim()
  const callerNumber: string = (req.body.From ?? '').trim()
  const toNumber: string = (req.body.To ?? '').trim()

  console.log(`[TWILIO VOICE] Incoming call — from: ${callerNumber} to: ${toNumber} callSid: ${callSid}`)

  // ── 1. Basic validation ──────────────────────────────────────────────────
  if (!callSid) {
    console.warn('[TWILIO VOICE] Missing CallSid — rejecting request')
    sendErrorTwiML(res, 'Invalid request. Please call back.')
    return
  }

  // ── 2. Validate X-Twilio-Signature (skip in development) ─────────────────
  // This prevents malicious actors from spoofing Twilio webhooks.
  const isProd = env.NODE_ENV === 'production'

  if (isProd) {
    const webhookUrl = buildWebhookUrl(req)
    const signature = req.headers['x-twilio-signature'] as string

    const isValid = twilio.validateRequest(
      env.TWILIO_AUTH_TOKEN ?? '',
      signature,
      webhookUrl,
      req.body,
    )

    if (!isValid) {
      console.error(`[TWILIO VOICE] Invalid X-Twilio-Signature — callSid: ${callSid}`)
      res.status(403).send('Forbidden: Invalid Twilio signature')
      return
    }
  } else {
    console.log('[TWILIO VOICE] Skipping signature validation (NODE_ENV=development)')
  }

  // ── 3. Resolve demo company via DEMO_COMPANY_ID ───────────────────────────
  const demoCompanyId = env.DEMO_COMPANY_ID

  if (!demoCompanyId) {
    console.error('[TWILIO VOICE] DEMO_COMPANY_ID is not set in environment')
    sendErrorTwiML(
      res,
      'The AI assistant is not yet configured. Please contact us directly.',
    )
    return
  }

  const company = await prisma.company.findUnique({
    where: { id: demoCompanyId },
    select: { id: true, name: true, isActive: true },
  })

  if (!company) {
    console.error(`[TWILIO VOICE] DEMO_COMPANY_ID "${demoCompanyId}" not found in database`)
    sendErrorTwiML(res, 'Service configuration error. Please contact support.')
    return
  }

  if (!company.isActive) {
    console.warn(`[TWILIO VOICE] Demo company is suspended: ${company.id}`)
    sendErrorTwiML(
      res,
      'This service is temporarily unavailable. Please try again later.',
    )
    return
  }

  // ── 4. Check AI configuration ────────────────────────────────────────────
  const aiConfig = await prisma.aiConfig.findUnique({
    where: { companyId: company.id },
    select: { id: true, engine: true },
  })

  if (!aiConfig) {
    console.warn(`[TWILIO VOICE] No AI config for company: ${company.id} (${company.name})`)
    sendErrorTwiML(
      res,
      'The AI assistant is not yet configured. Please contact us directly.',
    )
    return
  }

  // ── 5. Create Call record in DB ──────────────────────────────────────────
  try {
    await prisma.call.create({
      data: {
        companyId: company.id,
        twilioCallSid: callSid,
        callerNumber,
        status: 'IN_PROGRESS',
      },
    })
    console.log(`[TWILIO VOICE] Call record created — company: ${company.name} callSid: ${callSid}`)
  } catch {
    // Twilio may retry — duplicate callSid is safe to ignore
    console.warn(`[TWILIO VOICE] Call record already exists for callSid: ${callSid} (possible retry)`)
  }

  // ── 6. Return TwiML to open a WebSocket Media Stream ────────────────────
  // Twilio opens a WebSocket to /ws/media and streams μ-law audio bidirectionally.
  // companyId and callSid are passed as custom parameters to the WS handler.
  const wsProtocol = 'wss'
  const host = (req.headers['x-forwarded-host'] as string) || req.hostname

  const twiml = new twilio.twiml.VoiceResponse()
  const connect = twiml.connect()
  const stream = connect.stream({
    url: `${wsProtocol}://${host}/ws/media`,
  })

  stream.parameter({ name: 'companyId', value: company.id })
  stream.parameter({ name: 'callSid', value: callSid })
  stream.parameter({ name: 'callerNumber', value: callerNumber })

  console.log(`[TWILIO VOICE] Sending TwiML stream response — companyId: ${company.id} callSid: ${callSid}`)
  res.type('text/xml').send(twiml.toString())
})

// ─── POST /api/twilio/status ─────────────────────────────────────────────────
// Twilio calls this when the call ends or status changes.
// Set as the "Status Callback URL" in your Twilio console.

router.post('/status', async (req: Request, res: Response) => {
  const callSid: string = req.body.CallSid ?? ''
  const callStatus: string = req.body.CallStatus ?? ''
  const callDuration: string = req.body.CallDuration ?? '0'

  if (!callSid) {
    res.status(200).send()
    return
  }

  // Map Twilio call statuses to our internal enum
  const statusMap: Record<string, string> = {
    completed:    'COMPLETED',
    failed:       'FAILED',
    busy:         'MISSED',
    'no-answer':  'NO_ANSWER',
    canceled:     'MISSED',
    'in-progress':'IN_PROGRESS',
  }

  const status = statusMap[callStatus] ?? 'COMPLETED'
  const duration = parseInt(callDuration, 10) || 0

  try {
    await prisma.call.updateMany({
      where: { twilioCallSid: callSid },
      data: {
        status: status as 'COMPLETED' | 'FAILED' | 'MISSED' | 'NO_ANSWER' | 'IN_PROGRESS',
        duration,
        endedAt: status !== 'IN_PROGRESS' ? new Date() : undefined,
      },
    })
    console.log(`[TWILIO STATUS] callSid: ${callSid} → ${status} (${duration}s)`)
  } catch (err) {
    console.error(`[TWILIO STATUS] Failed to update call: ${callSid}`, err)
  }

  // Always 200 — never let status callbacks fail
  res.status(200).send()
})

export { router as twilioWebhookRouter, getTwilioClient as twilioClient }
