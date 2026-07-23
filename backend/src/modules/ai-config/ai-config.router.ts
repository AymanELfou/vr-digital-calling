import { Router } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import { requireCompany } from '../../middleware/role.middleware'
import { prisma } from '../../services/prisma.service'
import { createError } from '../../middleware/error.middleware'
import { z } from 'zod'

const router = Router()

const updateAiConfigSchema = z.object({
  systemPrompt: z.string().min(10, 'System prompt must be at least 10 characters').max(10000),
  voice: z.enum(['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']).optional(),
  allowGeneral: z.boolean().optional(),
  temperature: z.number().min(0).max(1).optional(),
  engine: z.enum(['realtime', 'chat_tts']).optional(),
  language: z.string().length(2).optional(),
})

// GET /api/ai-config
router.get('/', authenticate, requireCompany, async (req, res) => {
  const company = await prisma.company.findUnique({
    where: { userId: req.user!.sub },
    select: { id: true },
  })
  if (!company) throw createError(404, 'Company not found')

  const config = await prisma.aiConfig.findUnique({
    where: { companyId: company.id },
  })
  if (!config) throw createError(404, 'AI config not found')

  res.json(config)
})

// PATCH /api/ai-config
router.patch('/', authenticate, requireCompany, async (req, res) => {
  const input = updateAiConfigSchema.parse(req.body)
  const company = await prisma.company.findUnique({
    where: { userId: req.user!.sub },
    select: { id: true },
  })
  if (!company) throw createError(404, 'Company not found')

  const config = await prisma.aiConfig.upsert({
    where: { companyId: company.id },
    update: input,
    create: {
      companyId: company.id,
      systemPrompt: input.systemPrompt ?? 'You are a helpful AI assistant.',
      voice: input.voice ?? 'alloy',
      allowGeneral: input.allowGeneral ?? false,
      temperature: input.temperature ?? 0.6,
      engine: input.engine ?? 'realtime',
      language: input.language ?? 'en',
    },
  })
  res.json(config)
})

export { router as aiConfigRouter }
