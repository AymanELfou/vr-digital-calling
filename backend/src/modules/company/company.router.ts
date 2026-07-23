import { Router } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import { requireCompany } from '../../middleware/role.middleware'
import { prisma } from '../../services/prisma.service'
import { createError } from '../../middleware/error.middleware'
import { z } from 'zod'

const router = Router()

const updateCompanySchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(2000).optional(),
  address: z.string().max(500).optional(),
  website: z.string().url().optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
})

// GET /api/company/profile
router.get('/profile', authenticate, requireCompany, async (req, res) => {
  const company = await prisma.company.findUnique({
    where: { userId: req.user!.sub },
    include: { twilioConfig: true, aiConfig: true },
  })
  if (!company) throw createError(404, 'Company not found')

  // Mask the authToken — never send raw credentials to client
  const response = {
    ...company,
    twilioConfig: company.twilioConfig
      ? {
          id: company.twilioConfig.id,
          accountSid: company.twilioConfig.accountSid,
          phoneNumber: company.twilioConfig.phoneNumber,
          apiKey: company.twilioConfig.apiKey,
          isVerified: company.twilioConfig.isVerified,
          // authToken and apiSecret are NEVER returned to the client
        }
      : null,
  }

  res.json(response)
})

// PATCH /api/company/profile
router.patch('/profile', authenticate, requireCompany, async (req, res) => {
  const input = updateCompanySchema.parse(req.body)
  const company = await prisma.company.update({
    where: { userId: req.user!.sub },
    data: input,
  })
  res.json(company)
})

export { router as companyRouter }
