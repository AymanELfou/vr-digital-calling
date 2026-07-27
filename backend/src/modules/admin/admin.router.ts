import { Router } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import { requireAdmin } from '../../middleware/role.middleware'
import { prisma } from '../../services/prisma.service'
import { createError } from '../../middleware/error.middleware'

const router = Router()

// All admin routes require authentication + ADMIN role
router.use(authenticate, requireAdmin)

// GET /api/admin/companies — list all companies with stats
router.get('/companies', async (_req, res) => {
  const companies = await prisma.company.findMany({
    include: {
      user: { select: { email: true, createdAt: true, isActive: true } },
      _count: { select: { calls: true, services: true, knowledgeBase: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  res.json(companies)
})

// GET /api/admin/companies/:id
router.get('/companies/:id', async (req, res) => {
  const company = await prisma.company.findUnique({
    where: { id: req.params.id },
    include: {
      user: { select: { id: true, email: true, createdAt: true, isActive: true } },
      aiConfig: true,
      _count: { select: { calls: true } },
    },
  })
  if (!company) throw createError(404, 'Company not found')
  res.json(company)
})

// PATCH /api/admin/companies/:id/status — suspend or activate a company
router.patch('/companies/:id/status', async (req, res) => {
  const { isActive } = req.body
  if (typeof isActive !== 'boolean') {
    throw createError(400, 'isActive must be a boolean')
  }

  const company = await prisma.company.findUnique({
    where: { id: req.params.id },
    include: { user: true },
  })
  if (!company) throw createError(404, 'Company not found')

  // Update both the Company and the associated User
  await prisma.$transaction([
    prisma.company.update({
      where: { id: req.params.id },
      data: { isActive },
    }),
    prisma.user.update({
      where: { id: company.userId },
      data: { isActive },
    }),
  ])

  res.json({ message: isActive ? 'Company activated' : 'Company suspended' })
})

// GET /api/admin/stats — platform-wide statistics
router.get('/stats', async (_req, res) => {
  const [totalCompanies, activeCompanies, totalCalls, callsToday] = await Promise.all([
    prisma.company.count(),
    prisma.company.count({ where: { isActive: true } }),
    prisma.call.count(),
    prisma.call.count({
      where: {
        startedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    }),
  ])

  res.json({
    totalCompanies,
    activeCompanies,
    suspendedCompanies: totalCompanies - activeCompanies,
    totalCalls,
    callsToday,
  })
})

export { router as adminRouter }
