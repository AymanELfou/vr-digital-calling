import { Router } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import { requireAdmin } from '../../middleware/role.middleware'
import { prisma } from '../../services/prisma.service'
import { createError } from '../../middleware/error.middleware'
import { env } from '../../config/env'

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

// DELETE /api/admin/companies/:id — delete company and user
router.delete('/companies/:id', async (req, res) => {
  const company = await prisma.company.findUnique({
    where: { id: req.params.id },
    include: { user: true },
  })
  if (!company) throw createError(404, 'Company not found')

  await prisma.user.delete({
    where: { id: company.userId },
  })

  res.status(204).send()
})

// GET /api/admin/calls — paginated platform calls across all companies
router.get('/calls', async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1)
  const limit = Math.min(50, parseInt(req.query.limit as string) || 10)
  const skip = (page - 1) * limit
  const status = req.query.status as string | undefined

  const whereClause: Record<string, unknown> = {}
  if (status && ['COMPLETED', 'FAILED', 'MISSED'].includes(status)) {
    whereClause.status = status
  }

  const [calls, total] = await Promise.all([
    prisma.call.findMany({
      where: whereClause,
      orderBy: { startedAt: 'desc' },
      take: limit,
      skip,
      include: {
        company: { select: { id: true, name: true } },
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

// DELETE /api/admin/calls/:id — delete a call record
router.delete('/calls/:id', async (req, res) => {
  const call = await prisma.call.findUnique({
    where: { id: req.params.id },
  })
  if (!call) throw createError(404, 'Call record not found')

  await prisma.call.delete({
    where: { id: req.params.id },
  })

  res.status(204).send()
})

// GET /api/admin/stats — platform-wide statistics & Control Tower
router.get('/stats', async (_req, res) => {
  const startOfToday = new Date(new Date().setHours(0, 0, 0, 0))
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)

  const [
    totalCompanies,
    activeCompanies,
    totalCalls,
    callsToday,
    callsThisMonth,
    durationAgg,
    durationTodayAgg,
    durationMonthAgg,
    recentCalls,
  ] = await Promise.all([
    prisma.company.count(),
    prisma.company.count({ where: { isActive: true } }),
    prisma.call.count(),
    prisma.call.count({ where: { startedAt: { gte: startOfToday } } }),
    prisma.call.count({ where: { startedAt: { gte: startOfMonth } } }),
    prisma.call.aggregate({ _sum: { duration: true } }),
    prisma.call.aggregate({ where: { startedAt: { gte: startOfToday } }, _sum: { duration: true } }),
    prisma.call.aggregate({ where: { startedAt: { gte: startOfMonth } }, _sum: { duration: true } }),
    prisma.call.findMany({
      take: 8,
      orderBy: { startedAt: 'desc' },
      select: {
        id: true,
        callerNumber: true,
        status: true,
        duration: true,
        startedAt: true,
        company: { select: { name: true } },
      },
    }),
  ])

  // Total seconds & minutes
  const totalDurationSeconds = durationAgg._sum.duration ?? 0
  const totalDurationMinutes = Math.round(totalDurationSeconds / 60)

  const todayDurationSeconds = durationTodayAgg._sum.duration ?? 0
  const monthDurationSeconds = durationMonthAgg._sum.duration ?? 0

  // Estimated OpenAI Realtime API cost ($0.06 / min audio output + tokens)
  const RATE_PER_MIN = 0.06
  const estimatedCostToday = Number(((todayDurationSeconds / 60) * RATE_PER_MIN).toFixed(2))
  const estimatedCostMonth = Number(((monthDurationSeconds / 60) * RATE_PER_MIN).toFixed(2))

  // 7-day weekly call flow peaks
  const callFlow = []
  for (let i = 6; i >= 0; i--) {
    const dayDate = new Date()
    dayDate.setDate(dayDate.getDate() - i)
    const dayStart = new Date(dayDate.setHours(0, 0, 0, 0))
    const dayEnd = new Date(dayDate.setHours(23, 59, 59, 999))

    const count = await prisma.call.count({
      where: { startedAt: { gte: dayStart, lte: dayEnd } },
    })

    const dayName = dayStart.toLocaleDateString('en-US', { weekday: 'short' })
    callFlow.push({ day: dayName, date: dayStart.toLocaleDateString(), calls: count })
  }

  // 30-day monthly call flow peaks (4 weeks breakdown)
  const monthlyFlow = []
  for (let i = 3; i >= 0; i--) {
    const weekEnd = new Date()
    weekEnd.setDate(weekEnd.getDate() - i * 7)
    const weekStart = new Date(weekEnd)
    weekStart.setDate(weekStart.getDate() - 6)

    const count = await prisma.call.count({
      where: { startedAt: { gte: weekStart, lte: weekEnd } },
    })

    monthlyFlow.push({
      day: `Week ${4 - i}`,
      date: `${weekStart.getDate()}/${weekStart.getMonth() + 1}`,
      calls: count,
    })
  }

  // Infrastructure health status
  const infrastructure = {
    webhookServer: 'online',
    database: 'online',
    openAiRealtime: env.OPENAI_API_KEY ? 'online' : 'offline',
    twilioPhone: env.TWILIO_PHONE_NUMBER ? 'online' : 'offline',
    twilioNumber: env.TWILIO_PHONE_NUMBER ?? '+17373457612',
  }

  res.json({
    totalCompanies,
    activeCompanies,
    suspendedCompanies: totalCompanies - activeCompanies,
    totalCalls,
    callsToday,
    callsThisMonth,
    totalDurationSeconds,
    totalDurationMinutes,
    estimatedCostToday,
    estimatedCostMonth,
    callFlow,
    monthlyFlow,
    infrastructure,
    recentCalls,
  })
})

export { router as adminRouter }
