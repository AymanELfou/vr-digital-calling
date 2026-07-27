import { prisma } from './src/services/prisma.service'

async function checkRecentCalls() {
  const calls = await prisma.call.findMany({
    orderBy: { startedAt: 'desc' },
    take: 5,
    select: { id: true, startedAt: true, status: true, duration: true, twilioCallSid: true }
  })
  console.log('📋 Recent call records in DB:')
  console.log(JSON.stringify(calls, null, 2))
  process.exit(0)
}

checkRecentCalls()
