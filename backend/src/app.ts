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
import rateLimit from 'express-rate-limit'

const app = express()

// Trust proxy for rate limiting behind Docker / reverse proxies / Render
app.set('trust proxy', 1)

// ─── 1. CORS Configuration (MUST BE FIRST) ──────────────────────────────────
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Dynamically allow all origins with credentials (Vercel, localhost, etc.)
    callback(null, true)
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cookie', 'Accept'],
  optionsSuccessStatus: 204,
}

app.use(cors(corsOptions))
app.options('*', cors(corsOptions))

// ─── 2. Security headers ─────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: false,
  }),
)

// ─── 3. Request parsing ──────────────────────────────────────────────────────
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

// ─── 4. Security Rate Limiters (Skip preflight OPTIONS requests) ─────────────
const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS',
  message: { error: 'Too many API requests from this IP, please try again after 15 minutes' },
})

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS',
  message: { error: 'Too many login attempts, please try again after 15 minutes' },
})

app.use('/api/auth/login', authLimiter)
app.use('/api', generalApiLimiter)

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
