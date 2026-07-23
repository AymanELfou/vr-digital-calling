// ─────────────────────────────────────────────────────────────────────────────
// Twilio Voice Webhook Router
//
// This is the endpoint Twilio calls when someone dials a company's number.
// It MUST NOT require JWT auth — Twilio authenticates using its own
// X-Twilio-Signature header validated against the company's Auth Token.
//
// Flow:
//   1. Twilio POSTs to /api/twilio/voice
//   2. We look up the company by the "To" phone number
//   3. We validate the Twilio signature using the company's Auth Token
//   4. We return TwiML telling Twilio to connect a Media Stream
//   5. Twilio opens a WebSocket to /ws/media (handled in twilio.ws.ts)
// ─────────────────────────────────────────────────────────────────────────────

import { Router, Request, Response } from 'express'
import twilio from 'twilio'
import { prisma } from '../../services/prisma.service'
import { decrypt } from '../../utils/crypto'

const router = Router()

// POST /api/twilio/voice — incoming call webhook
router.post('/voice', async (req: Request, res: Response) => {
  const toNumber: string = req.body.To ?? ''
  const callSid: string = req.body.CallSid ?? ''
  const callerNumber: string = req.body.From ?? ''

  // 1. Find the company that owns this phone number
  const twilioConfig = await prisma.twilioConfig.findUnique({
    where: { phoneNumber: toNumber },
    include: {
      company: {
        select: { id: true, name: true, isActive: true },
      },
    },
  })

  if (!twilioConfig || !twilioConfig.company.isActive) {
    // Company not found or suspended — play a generic message
    const twiml = new twilio.twiml.VoiceResponse()
    twiml.say(
      { voice: 'alice' },
      'We are unable to take your call at this time. Please try again later.',
    )
    res.type('text/xml').send(twiml.toString())
    return
  }

  // 2. Validate Twilio signature to prevent spoofing
  // We must use the company's own Auth Token for this
  const authToken = decrypt(twilioConfig.authToken)
  const webhookUrl = `${req.protocol}://${req.hostname}/api/twilio/voice`

  const isValid = twilio.validateRequest(
    authToken,
    req.headers['x-twilio-signature'] as string,
    webhookUrl,
    req.body,
  )

  if (!isValid && process.env.NODE_ENV === 'production') {
    res.status(403).send('Forbidden: Invalid Twilio signature')
    return
  }

  // 3. Create a Call record in the database
  await prisma.call.create({
    data: {
      companyId: twilioConfig.company.id,
      twilioCallSid: callSid,
      callerNumber,
      status: 'IN_PROGRESS',
    },
  })

  // 4. Return TwiML instructing Twilio to start a Media Stream
  // The Media Stream will connect to our WebSocket server at /ws/media
  const twiml = new twilio.twiml.VoiceResponse()
  const connect = twiml.connect()
  const stream = connect.stream({
    url: `wss://${req.hostname}/ws/media`,
  })
  // Pass the companyId to the WebSocket handler via custom parameters
  stream.parameter({ name: 'companyId', value: twilioConfig.company.id })
  stream.parameter({ name: 'callSid', value: callSid })

  res.type('text/xml').send(twiml.toString())
})

// POST /api/twilio/status — call status callback (called by Twilio when call ends)
router.post('/status', async (req: Request, res: Response) => {
  const callSid: string = req.body.CallSid ?? ''
  const callStatus: string = req.body.CallStatus ?? ''
  const duration: string = req.body.CallDuration ?? '0'

  // Map Twilio status to our enum
  const statusMap: Record<string, string> = {
    completed: 'COMPLETED',
    failed: 'FAILED',
    busy: 'MISSED',
    'no-answer': 'NO_ANSWER',
    canceled: 'MISSED',
  }

  const status = statusMap[callStatus] ?? 'COMPLETED'

  await prisma.call.updateMany({
    where: { twilioCallSid: callSid },
    data: {
      status: status as any,
      duration: parseInt(duration),
      endedAt: new Date(),
    },
  })

  res.status(200).send()
})

export { router as twilioWebhookRouter }
