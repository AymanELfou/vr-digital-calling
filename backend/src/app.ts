// ─────────────────────────────────────────────────────────────────────────────
// Express Application Configuration
// Registers middleware, routes, and error handling.
// WebSocket server is configured in index.ts (on the HTTP server level).
// ─────────────────────────────────────────────────────────────────────────────

import 'express-async-errors' // Must be imported BEFORE express
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'

import { env } from './config/env'
import { errorMiddleware } from './middleware/error.middleware'

// ─── Routers (imported as we build each module) ───────────────────────────────
import { authRouter } from './modules/auth/auth.router'
import { companyRouter } from './modules/company/company.router'
import { aiConfigRouter } from './modules/ai-config/ai-config.router'
import { knowledgeBaseRouter } from './modules/knowledge-base/kb.router'
import { servicesRouter } from './modules/services/services.router'
import { callsRouter } from './modules/calls/calls.router'
import { adminRouter } from './modules/admin/admin.router'
import { twilioWebhookRouter } from './modules/twilio/twilio.router'
import { devRouter } from './modules/twilio/twilio.ws'

const app = express()

// ─── Security headers ─────────────────────────────────────────────────────────
// Helmet sets security-related HTTP headers (CSP, HSTS, etc.)
// ContentSecurityPolicy is relaxed because Twilio needs to POST to our webhooks
app.use(
  helmet({
    contentSecurityPolicy: false, // Twilio webhook validation needs flexibility
  }),
)

// ─── CORS ─────────────────────────────────────────────────────────────────────
// In production, restrict origin to the frontend domain
const allowedOrigins =
  env.NODE_ENV === 'production'
    ? [process.env.FRONTEND_URL ?? 'https://yourapp.com']
    : ['http://localhost:5173', 'http://localhost:3000']

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true, // Required for HttpOnly cookies to be sent cross-origin
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  }),
)

// ─── Request parsing ──────────────────────────────────────────────────────────
app.use(express.json())
app.use(express.urlencoded({ extended: true })) // Required for Twilio webhook (form-encoded)
app.use(cookieParser())

// ─── Logging ──────────────────────────────────────────────────────────────────
if (env.NODE_ENV !== 'test') {
  app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'))
}

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', authRouter)
app.use('/api/company', companyRouter)
app.use('/api/ai-config', aiConfigRouter)
app.use('/api/knowledge-base', knowledgeBaseRouter)
app.use('/api/services', servicesRouter)
app.use('/api/calls', callsRouter)
app.use('/api/admin', adminRouter)

// ─── Twilio Webhook (NO JWT auth — verified by Twilio signature instead) ──────
// Twilio calls this endpoint when a company receives a phone call.
// It must NOT be behind JWT auth — Twilio can't send our JWT token.
// Security is provided by validating the X-Twilio-Signature header.
app.use('/api/twilio', twilioWebhookRouter)

// ─── Dev Simulation (development only) ─────────────────────────────────────
if (env.NODE_ENV !== 'production') {
  app.use('/dev', devRouter)
}

// ─── 404 handler ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

// ─── Global error handler (must be last!) ────────────────────────────────────
app.use(errorMiddleware)

export { app }
