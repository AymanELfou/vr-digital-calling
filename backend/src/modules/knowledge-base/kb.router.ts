import { Router } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import { requireCompany } from '../../middleware/role.middleware'
import { prisma } from '../../services/prisma.service'
import { createError } from '../../middleware/error.middleware'
import { z } from 'zod'

const router = Router()

const kbSchema = z.object({
  question: z.string().min(3).max(500),
  answer: z.string().min(3).max(5000),
  category: z.string().max(100).optional(),
  isActive: z.boolean().optional(),
})

async function getCompanyId(userId: string): Promise<string> {
  const company = await prisma.company.findUnique({
    where: { userId },
    select: { id: true },
  })
  if (!company) throw createError(404, 'Company not found')
  return company.id
}

// GET /api/knowledge-base
router.get('/', authenticate, requireCompany, async (req, res) => {
  const companyId = await getCompanyId(req.user!.sub)
  const items = await prisma.knowledgeBase.findMany({
    where: { companyId },
    orderBy: { createdAt: 'asc' },
  })
  res.json(items)
})

// POST /api/knowledge-base
router.post('/', authenticate, requireCompany, async (req, res) => {
  const input = kbSchema.parse(req.body)
  const companyId = await getCompanyId(req.user!.sub)
  const item = await prisma.knowledgeBase.create({
    data: { companyId, ...input },
  })
  res.status(201).json(item)
})

// PATCH /api/knowledge-base/:id
router.patch('/:id', authenticate, requireCompany, async (req, res) => {
  const input = kbSchema.partial().parse(req.body)
  const companyId = await getCompanyId(req.user!.sub)

  const existing = await prisma.knowledgeBase.findFirst({
    where: { id: req.params.id, companyId },
  })
  if (!existing) throw createError(404, 'Knowledge base entry not found')

  const updated = await prisma.knowledgeBase.update({
    where: { id: req.params.id },
    data: input,
  })
  res.json(updated)
})

// DELETE /api/knowledge-base/:id
router.delete('/:id', authenticate, requireCompany, async (req, res) => {
  const companyId = await getCompanyId(req.user!.sub)
  const existing = await prisma.knowledgeBase.findFirst({
    where: { id: req.params.id, companyId },
  })
  if (!existing) throw createError(404, 'Knowledge base entry not found')

  await prisma.knowledgeBase.delete({ where: { id: req.params.id } })
  res.status(204).send()
})

export { router as knowledgeBaseRouter }
