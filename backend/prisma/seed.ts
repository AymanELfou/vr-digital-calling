// ─────────────────────────────────────────────────────────────────────────────
// Database Seeder
// Creates default ADMIN user and optionally a demo COMPANY user.
// ─────────────────────────────────────────────────────────────────────────────

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seeding...')

  // 1. Admin User
  const adminEmail = 'admin@vrdigital.com'
  const adminPassword = 'admin123'
  const adminPasswordHash = await bcrypt.hash(adminPassword, 12)

  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } })
  if (!existingAdmin) {
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: adminPasswordHash,
        role: 'ADMIN',
        isActive: true,
      },
    })
    console.log(`✅ Admin user created: ${admin.email} (Password: ${adminPassword})`)
  } else {
    await prisma.user.update({
      where: { email: adminEmail },
      data: { passwordHash: adminPasswordHash },
    })
    console.log(`ℹ️ Admin user updated: ${adminEmail} (Password: ${adminPassword})`)
  }

  // 2. Company User
  const companyEmail = 'company@gmail.com'
  const companyPassword = '12345678'
  const companyName = 'VR Digital Company'
  const companyPasswordHash = await bcrypt.hash(companyPassword, 12)

  const existingCompanyUser = await prisma.user.findUnique({
    where: { email: companyEmail },
    include: { company: true },
  })

  if (!existingCompanyUser) {
    const companyUser = await prisma.user.create({
      data: {
        email: companyEmail,
        passwordHash: companyPasswordHash,
        role: 'COMPANY',
        isActive: true,
        company: {
          create: {
            name: companyName,
            description: 'AI voice receptionist workspace for handling incoming customer calls.',
            phone: '0634847654',
            aiConfig: {
              create: {
                systemPrompt: `You are a professional AI voice assistant for ${companyName}. Answer customer questions politely and accurately.`,
                voice: 'alloy',
                engine: 'realtime',
                allowGeneral: true,
              },
            },
          },
        },
      },
      include: { company: true },
    })
    console.log(`✅ Company user created: ${companyUser.email} (Password: ${companyPassword})`)
  } else {
    await prisma.user.update({
      where: { email: companyEmail },
      data: { passwordHash: companyPasswordHash },
    })
    console.log(`ℹ️ Company user updated: ${companyEmail} (Password: ${companyPassword})`)
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
