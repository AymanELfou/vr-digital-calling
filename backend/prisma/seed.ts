// ─────────────────────────────────────────────────────────────────────────────
// Database Seeder
// Creates default ADMIN user and optionally a demo COMPANY user.
// ─────────────────────────────────────────────────────────────────────────────

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seeding...')

  // 1. Create Admin User
  const adminEmail = 'admin@vrdigital.com'
  const adminPassword = 'Admin123456!'

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  })

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 12)
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        role: 'ADMIN',
        isActive: true,
      },
    })
    console.log(`✅ Admin user created: ${admin.email} (Password: ${adminPassword})`)
  } else {
    console.log(`ℹ️ Admin user ${adminEmail} already exists.`)
  }

  // 2. Create Demo Company User
  const companyEmail = 'demo@company.com'
  const companyPassword = 'Company123456!'
  const companyName = 'Demo Enterprise'

  const existingCompanyUser = await prisma.user.findUnique({
    where: { email: companyEmail },
  })

  if (!existingCompanyUser) {
    const passwordHash = await bcrypt.hash(companyPassword, 12)
    const companyUser = await prisma.user.create({
      data: {
        email: companyEmail,
        passwordHash,
        role: 'COMPANY',
        isActive: true,
        company: {
          create: {
            name: companyName,
            description: 'Demo company for AI voice calling platform testing.',
            aiConfig: {
              create: {
                systemPrompt: `You are an AI assistant for ${companyName}. Answer customer questions politely and accurately.`,
                voice: 'alloy',
                engine: 'realtime',
              },
            },
          },
        },
      },
      include: { company: true },
    })
    console.log(`✅ Demo Company user created: ${companyUser.email} (Password: ${companyPassword})`)
  } else {
    console.log(`ℹ️ Demo Company user ${companyEmail} already exists.`)
  }

  console.log('🎉 Seeding completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
