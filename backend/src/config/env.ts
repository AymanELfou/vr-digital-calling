// ─────────────────────────────────────────────────────────────────────────────
// Environment configuration with Zod validation.
// The app fails fast at startup if any required variable is missing.
// This prevents silent runtime errors from missing configuration.
//
// MVP Architecture:
//   - Single Twilio account (platform-level, not per-company)
//   - Single demo company defined by DEMO_COMPANY_ID
//   - OpenAI API Key is platform-level
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config()
dotenv.config({ path: path.resolve(__dirname, '../../../.env') })
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const envSchema = z.object({
  // ── Server ─────────────────────────────────────────────────────────────────
  PORT: z.string().default('4000').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // ── Database ───────────────────────────────────────────────────────────────
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid PostgreSQL connection string'),

  // ── JWT ────────────────────────────────────────────────────────────────────
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),

  // ── OpenAI (platform-level key for all AI sessions) ───────────────────────
  OPENAI_API_KEY: z.string().startsWith('sk-', 'OPENAI_API_KEY must start with sk-'),

  // ── Twilio (single platform account — no per-company credentials) ──────────────────
  // Optional at startup — missing values produce a warning (not a crash).
  // Real calls will fail gracefully if not configured.
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),

  // ── Demo Company (MVP routing) ─────────────────────────────────────────────
  // All incoming calls are routed to this company's AI configuration.
  // Set this to the company's cuid after first registration.
  DEMO_COMPANY_ID: z
    .string()
    .min(10, 'DEMO_COMPANY_ID must be a valid company cuid')
    .optional(), // Optional so app starts without it, but calls will fail gracefully
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ Invalid environment variables:')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = parsed.data

export type Env = typeof env
