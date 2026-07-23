// ─────────────────────────────────────────────────────────────────────────────
// Prisma Client singleton.
// We use a single instance to avoid exhausting the DB connection pool,
// especially in development where ts-node-dev hot-reloads the module.
// ─────────────────────────────────────────────────────────────────────────────

import { PrismaClient } from '@prisma/client'
import { env } from '../config/env'

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined
}

// In development, preserve the instance across hot reloads
// In production, always create a new instance (no global caching)
export const prisma: PrismaClient =
  global.__prisma ??
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (env.NODE_ENV !== 'production') {
  global.__prisma = prisma
}
