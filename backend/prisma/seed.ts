// ─────────────────────────────────────────────────────────────────────────────
// Database Seeder
// Creates default ADMIN user and optionally a demo COMPANY user.
// ─────────────────────────────────────────────────────────────────────────────

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seeding...')

  // 1. Create / Upsert Admin User (admin@gmail.com & admin@vrdigital.com)
  const adminCredentials = [
    { email: 'admin@gmail.com', password: 'mdp12345678' },
    { email: 'admin@vrdigital.com', password: 'AdminPassword123!' },
  ]

  for (const cred of adminCredentials) {
    const existing = await prisma.user.findUnique({ where: { email: cred.email } })
    const passwordHash = await bcrypt.hash(cred.password, 12)
    if (!existing) {
      const admin = await prisma.user.create({
        data: {
          email: cred.email,
          passwordHash,
          role: 'ADMIN',
          isActive: true,
        },
      })
      console.log(`✅ Admin user created: ${admin.email} (Password: ${cred.password})`)
    } else {
      // Update password hash to match requested credentials
      await prisma.user.update({
        where: { email: cred.email },
        data: { passwordHash },
      })
      console.log(`ℹ️ Admin user updated: ${cred.email} (Password: ${cred.password})`)
    }
  }

  // 2. Create / Upsert Company Users (company@gmail.com)
  const companyCredentials = [
    { email: 'company@gmail.com', password: 'mdp12345678', name: 'VR Digital Company' },
    { email: 'demo@company.com', password: 'Company123456!', name: 'Demo Enterprise' },
  ]

  for (const cred of companyCredentials) {
    const existingUser = await prisma.user.findUnique({
      where: { email: cred.email },
      include: { company: true },
    })
    const passwordHash = await bcrypt.hash(cred.password, 12)

    if (!existingUser) {
      const companyUser = await prisma.user.create({
        data: {
          email: cred.email,
          passwordHash,
          role: 'COMPANY',
          isActive: true,
          company: {
            create: {
              name: cred.name,
              description: 'AI voice receptionist workspace for handling incoming calls.',
              phone: '0634847654',
              aiConfig: {
                create: {
                  systemPrompt: `You are a professional AI voice assistant for ${cred.name}. Answer customer questions politely and accurately.`,
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
      console.log(`✅ Company user created: ${companyUser.email} (Password: ${cred.password})`)
    } else {
      await prisma.user.update({
        where: { email: cred.email },
        data: { passwordHash },
      })
      console.log(`ℹ️ Company user updated: ${cred.email} (Password: ${cred.password})`)
    }
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
