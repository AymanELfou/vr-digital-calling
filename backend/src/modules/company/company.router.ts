import { Router } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import { requireCompany } from '../../middleware/role.middleware'
import { prisma } from '../../services/prisma.service'
import { createError } from '../../middleware/error.middleware'
import { env } from '../../config/env'
import { z } from 'zod'

const router = Router()

const updateCompanySchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(2000).optional(),
  address: z.string().max(500).optional(),
  website: z.string().url().optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  phone: z
    .string()
    .regex(/^(?:\+212|0)([567]\d{8})$/, 'Only Moroccan Phone Number accepted')
    .optional(),
})

// GET /api/company/profile
router.get('/profile', authenticate, requireCompany, async (req, res) => {
  const company = await prisma.company.findUnique({
    where: { userId: req.user!.sub },
    include: { aiConfig: true },
  })
  if (!company) throw createError(404, 'Company not found')

  res.json(company)
})

// PUT /api/company/profile
router.put('/profile', authenticate, requireCompany, async (req, res) => {
  const input = updateCompanySchema.parse(req.body)
  const company = await prisma.company.update({
    where: { userId: req.user!.sub },
    data: input,
  })
  res.json(company)
})

// PATCH /api/company/profile (alias for backwards compatibility)
router.patch('/profile', authenticate, requireCompany, async (req, res) => {
  const input = updateCompanySchema.parse(req.body)
  const company = await prisma.company.update({
    where: { userId: req.user!.sub },
    data: input,
  })
  res.json(company)
})

// GET /api/company/phone-status
// Returns platform Twilio phone info (read-only, no credentials exposed).
// Used by the frontend PhoneStatusPage to show connection info.
router.get('/phone-status', authenticate, requireCompany, async (_req, res) => {
  // Validate that env is configured (graceful response, not 500)
  const configured =
    !!env.TWILIO_ACCOUNT_SID &&
    !!env.TWILIO_AUTH_TOKEN &&
    !!env.TWILIO_PHONE_NUMBER

  res.json({
    phoneNumber: env.TWILIO_PHONE_NUMBER ?? null,
    accountSidPrefix: env.TWILIO_ACCOUNT_SID
      ? `${env.TWILIO_ACCOUNT_SID.slice(0, 6)}...${env.TWILIO_ACCOUNT_SID.slice(-4)}`
      : null,
    configured,
    webhookVoiceUrl: '/api/twilio/voice',
    webhookStatusUrl: '/api/twilio/status',
  })
})

export { router as companyRouter }
