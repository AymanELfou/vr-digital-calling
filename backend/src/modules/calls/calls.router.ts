import { Router } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import { requireCompany } from '../../middleware/role.middleware'
import { prisma } from '../../services/prisma.service'
import { createError } from '../../middleware/error.middleware'

const router = Router()

// GET /api/calls — paginated call history for company
router.get('/', authenticate, requireCompany, async (req, res) => {
  const company = await prisma.company.findUnique({
    where: { userId: req.user!.sub },
    select: { id: true },
  })
  if (!company) throw createError(404, 'Company not found')

  const page = Math.max(1, parseInt(req.query.page as string) || 1)
  const limit = Math.min(50, parseInt(req.query.limit as string) || 20)
  const skip = (page - 1) * limit

  const status = req.query.status as string | undefined
  const whereClause: any = { companyId: company.id }
  if (status && ['COMPLETED', 'FAILED', 'MISSED'].includes(status)) {
    whereClause.status = status
  }

  const [calls, total] = await Promise.all([
    prisma.call.findMany({
      where: whereClause,
      orderBy: { startedAt: 'desc' },
      take: limit,
      skip,
      select: {
        id: true,
        twilioCallSid: true,
        callerNumber: true,
        status: true,
        duration: true,
        startedAt: true,
        endedAt: true,
        // transcript excluded from list — too large, fetched individually
      },
    }),
    prisma.call.count({ where: whereClause }),
  ])

  res.json({
    data: calls,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  })
})

// GET /api/calls/:id — get single call with full transcript
router.get('/:id', authenticate, requireCompany, async (req, res) => {
  const company = await prisma.company.findUnique({
    where: { userId: req.user!.sub },
    select: { id: true },
  })
  if (!company) throw createError(404, 'Company not found')

  const call = await prisma.call.findFirst({
    where: { id: req.params.id, companyId: company.id },
  })
  if (!call) throw createError(404, 'Call not found')

  res.json(call)
})

// DELETE /api/calls/:id — delete call record
router.delete('/:id', authenticate, requireCompany, async (req, res) => {
  const company = await prisma.company.findUnique({
    where: { userId: req.user!.sub },
    select: { id: true },
  })
  if (!company) throw createError(404, 'Company not found')

  const call = await prisma.call.findFirst({
    where: { id: req.params.id, companyId: company.id },
  })
  if (!call) throw createError(404, 'Call not found')

  await prisma.call.delete({
    where: { id: req.params.id },
  })

  res.status(204).send()
})

export { router as callsRouter }
