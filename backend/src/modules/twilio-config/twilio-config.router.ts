// ─────────────────────────────────────────────────────────────────────────────
// Twilio Config Router
// Allows companies to configure their own Twilio credentials.
// Auth tokens are encrypted before storage (AES-256-GCM).
// Auth tokens are NEVER returned in responses.
// ─────────────────────────────────────────────────────────────────────────────

import { Router } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import { requireCompany } from '../../middleware/role.middleware'
import { prisma } from '../../services/prisma.service'
import { createError } from '../../middleware/error.middleware'
import { encrypt } from '../../utils/crypto'
import { z } from 'zod'

const router = Router()

const twilioConfigSchema = z.object({
  accountSid: z
    .string()
    .startsWith('AC', 'Twilio Account SID must start with "AC"')
    .length(34, 'Twilio Account SID must be 34 characters'),
  authToken: z
    .string()
    .length(32, 'Twilio Auth Token must be 32 characters'),
  phoneNumber: z
    .string()
    .regex(/^\+[1-9]\d{1,14}$/, 'Phone number must be in E.164 format (e.g., +1234567890)'),
  apiKey: z.string().startsWith('SK').optional(),
  apiSecret: z.string().optional(),
})

async function getCompanyId(userId: string): Promise<string> {
  const company = await prisma.company.findUnique({
    where: { userId },
    select: { id: true },
  })
  if (!company) throw createError(404, 'Company not found')
  return company.id
}

// GET /api/twilio-config — returns masked config (no secrets)
router.get('/', authenticate, requireCompany, async (req, res) => {
  const companyId = await getCompanyId(req.user!.sub)
  const config = await prisma.twilioConfig.findUnique({
    where: { companyId },
    select: {
      id: true,
      accountSid: true,
      phoneNumber: true,
      apiKey: true,
      isVerified: true,
      updatedAt: true,
      // authToken and apiSecret are intentionally excluded
    },
  })
  res.json(config)
})

// POST /api/twilio-config — create or update Twilio credentials
router.post('/', authenticate, requireCompany, async (req, res) => {
  const input = twilioConfigSchema.parse(req.body)
  const companyId = await getCompanyId(req.user!.sub)

  // Encrypt sensitive fields before storage
  const encryptedAuthToken = encrypt(input.authToken)
  const encryptedApiSecret = input.apiSecret ? encrypt(input.apiSecret) : null

  const config = await prisma.twilioConfig.upsert({
    where: { companyId },
    create: {
      companyId,
      accountSid: input.accountSid,
      authToken: encryptedAuthToken,
      phoneNumber: input.phoneNumber,
      apiKey: input.apiKey,
      apiSecret: encryptedApiSecret,
      isVerified: false, // Reset verification when credentials change
    },
    update: {
      accountSid: input.accountSid,
      authToken: encryptedAuthToken,
      phoneNumber: input.phoneNumber,
      apiKey: input.apiKey,
      apiSecret: encryptedApiSecret,
      isVerified: false, // Must re-verify after update
    },
    select: {
      id: true,
      accountSid: true,
      phoneNumber: true,
      apiKey: true,
      isVerified: true,
      updatedAt: true,
    },
  })

  res.status(201).json(config)
})

// DELETE /api/twilio-config — remove Twilio configuration
router.delete('/', authenticate, requireCompany, async (req, res) => {
  const companyId = await getCompanyId(req.user!.sub)
  await prisma.twilioConfig.deleteMany({ where: { companyId } })
  res.status(204).send()
})

export { router as twilioConfigRouter }
