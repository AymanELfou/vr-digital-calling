// ─────────────────────────────────────────────────────────────────────────────
// AI Config Router
// Manages the AI voice agent configuration for each company.
//
// Fields:
//   systemPrompt  — Custom instructions for the AI agent
//   voice         — OpenAI TTS voice (alloy, echo, fable, onyx, nova, shimmer)
//   allowGeneral  — Allow AI to answer off-topic questions from general knowledge
//   temperature   — Response creativity (0.0 = strict, 1.0 = creative)
//   engine        — "realtime" (production) or "chat_tts" (dev fallback)
//   language      — "auto" detects caller language, or force e.g. "fr", "en", "ar"
//   maxTokens     — Max tokens per AI response turn
//   silenceMs     — VAD silence threshold in milliseconds
// ─────────────────────────────────────────────────────────────────────────────

import { Router } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import { requireCompany } from '../../middleware/role.middleware'
import { prisma } from '../../services/prisma.service'
import { buildSystemPrompt } from '../../services/prompt-builder.service'
import { createError } from '../../middleware/error.middleware'
import { z } from 'zod'

const router = Router()

// ─── Validation Schema ────────────────────────────────────────────────────────

const VALID_VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'] as const
const VALID_ENGINES = ['realtime', 'chat_tts'] as const

const updateAiConfigSchema = z.object({
  systemPrompt: z
    .string()
    .min(10, 'System prompt must be at least 10 characters')
    .max(12000, 'System prompt must be under 12,000 characters')
    .optional(),
  voice: z.enum(VALID_VOICES).optional(),
  allowGeneral: z.boolean().optional(),
  temperature: z.number().min(0).max(1).optional(),
  engine: z.enum(VALID_ENGINES).optional(),
  language: z
    .string()
    .refine(
      (v) => v === 'auto' || /^[a-z]{2}(-[A-Z]{2})?$/.test(v),
      'Language must be "auto" or a valid ISO 639-1 code (e.g. "fr", "en", "ar")',
    )
    .optional(),
})

// ─── Helper ───────────────────────────────────────────────────────────────────

async function getCompanyId(userId: string): Promise<string> {
  const company = await prisma.company.findUnique({
    where: { userId },
    select: { id: true },
  })
  if (!company) throw createError(404, 'Company not found')
  return company.id
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET /api/ai-config
router.get('/', authenticate, requireCompany, async (req, res) => {
  const companyId = await getCompanyId(req.user!.sub)

  const config = await prisma.aiConfig.findUnique({
    where: { companyId },
    select: {
      id: true,
      systemPrompt: true,
      voice: true,
      allowGeneral: true,
      temperature: true,
      engine: true,
      language: true,
      updatedAt: true,
    },
  })

  if (!config) {
    res.json(null)
    return
  }

  res.json(config)
})

// PATCH /api/ai-config
// Partial update — only provided fields are changed
router.patch('/', authenticate, requireCompany, async (req, res) => {
  const input = updateAiConfigSchema.parse(req.body)
  const companyId = await getCompanyId(req.user!.sub)

  const config = await prisma.aiConfig.upsert({
    where: { companyId },
    update: input,
    create: {
      companyId,
      systemPrompt: input.systemPrompt ?? 'You are a helpful AI voice assistant for this company. Answer caller questions politely and accurately based on the company information provided.',
      voice: input.voice ?? 'alloy',
      allowGeneral: input.allowGeneral ?? true,
      temperature: input.temperature ?? 0.6,
      engine: input.engine ?? 'realtime',
      language: input.language ?? 'auto',
    },
    select: {
      id: true,
      systemPrompt: true,
      voice: true,
      allowGeneral: true,
      temperature: true,
      engine: true,
      language: true,
      updatedAt: true,
    },
  })

  res.json(config)
})

// GET /api/ai-config/compiled-prompt
// Returns the fully compiled system prompt including company info, active services, and KB entries
router.get('/compiled-prompt', authenticate, requireCompany, async (req, res) => {
  const companyId = await getCompanyId(req.user!.sub)

  const config = await prisma.aiConfig.findUnique({
    where: { companyId },
  })

  if (!config) {
    res.json({ compiledPrompt: '', servicesCount: 0, kbCount: 0 })
    return
  }

  const compiledPrompt = await buildSystemPrompt(companyId, config.allowGeneral)

  const [servicesCount, kbCount] = await Promise.all([
    prisma.service.count({ where: { companyId, isActive: true } }),
    prisma.knowledgeBase.count({ where: { companyId, isActive: true } }),
  ])

  res.json({
    compiledPrompt,
    servicesCount,
    kbCount,
  })
})

// GET /api/ai-config/voices
// Returns available voices with metadata for the frontend selector
router.get('/voices', authenticate, requireCompany, async (_req, res) => {
  const voices = [
    { id: 'alloy', name: 'Alloy', description: 'Neutral, balanced voice', gender: 'neutral' },
    { id: 'echo', name: 'Echo', description: 'Warm, clear male voice', gender: 'male' },
    { id: 'fable', name: 'Fable', description: 'Expressive, British-accent voice', gender: 'male' },
    { id: 'onyx', name: 'Onyx', description: 'Deep, authoritative male voice', gender: 'male' },
    { id: 'nova', name: 'Nova', description: 'Friendly, young female voice', gender: 'female' },
    { id: 'shimmer', name: 'Shimmer', description: 'Soft, warm female voice', gender: 'female' },
  ]
  res.json(voices)
})

export { router as aiConfigRouter }
