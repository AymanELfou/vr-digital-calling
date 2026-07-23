import { Router } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import { requireCompany } from '../../middleware/role.middleware'
import { prisma } from '../../services/prisma.service'
import { createError } from '../../middleware/error.middleware'
import { z } from 'zod'

const router = Router()

const serviceSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().max(2000).optional(),
  price: z.number().nonnegative().optional(),
  duration: z.string().max(50).optional(),
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

// GET /api/services
router.get('/', authenticate, requireCompany, async (req, res) => {
  const companyId = await getCompanyId(req.user!.sub)
  const services = await prisma.service.findMany({
    where: { companyId },
    orderBy: { createdAt: 'asc' },
  })
  res.json(services)
})

// POST /api/services
router.post('/', authenticate, requireCompany, async (req, res) => {
  const input = serviceSchema.parse(req.body)
  const companyId = await getCompanyId(req.user!.sub)
  const service = await prisma.service.create({
    data: { companyId, ...input },
  })
  res.status(201).json(service)
})

// PATCH /api/services/:id
router.patch('/:id', authenticate, requireCompany, async (req, res) => {
  const input = serviceSchema.partial().parse(req.body)
  const companyId = await getCompanyId(req.user!.sub)

  const existing = await prisma.service.findFirst({
    where: { id: req.params.id, companyId },
  })
  if (!existing) throw createError(404, 'Service not found')

  const updated = await prisma.service.update({
    where: { id: req.params.id },
    data: input,
  })
  res.json(updated)
})

// DELETE /api/services/:id
router.delete('/:id', authenticate, requireCompany, async (req, res) => {
  const companyId = await getCompanyId(req.user!.sub)
  const existing = await prisma.service.findFirst({
    where: { id: req.params.id, companyId },
  })
  if (!existing) throw createError(404, 'Service not found')

  await prisma.service.delete({ where: { id: req.params.id } })
  res.status(204).send()
})

export { router as servicesRouter }
