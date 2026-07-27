// ─────────────────────────────────────────────────────────────────────────────
// Application Entry Point
//
// Creates the HTTP server from the Express app.
// Attaches the WebSocket server for Twilio Media Streams.
// Connects to the database and starts listening.
// ─────────────────────────────────────────────────────────────────────────────

import http from 'http'
import { WebSocketServer } from 'ws'
import { app } from './app'
import { env } from './config/env'
import { prisma } from './services/prisma.service'
import { handleMediaStream, devRouter, attachDevSimulationRoute } from './modules/twilio/twilio.ws'

async function bootstrap() {
  // ─── Verify database connection ─────────────────────────────────────────
  try {
    await prisma.$connect()
    console.log('✅ Database connected')
  } catch (error) {
    console.error('❌ Database connection failed:', error)
    process.exit(1)
  }

  // ─── HTTP Server ─────────────────────────────────────────────────────────
  // We create the HTTP server manually so we can attach the WebSocket server
  // to the same port. This is required for Twilio Media Streams.
  const server = http.createServer(app)

  // ─── WebSocket Server (Twilio Media Streams) ─────────────────────────────
  // Twilio connects to /ws/media/:callSid after our TwiML instructs it to.
  // The WebSocket server shares the same HTTP server (same port as REST API).
  const wss = new WebSocketServer({
    server,
    path: '/ws/media',
  })

  wss.on('connection', (ws, req) => {
    // Note: callSid is received inside the Twilio 'start' event message,
    // not in the URL path. We use a temporary ID here; the handler resolves
    // the real callSid from the Twilio stream parameters.
    const tempId = `pending-${Date.now()}`
    console.log(`[WS] Twilio Media Stream connected from: ${req.socket.remoteAddress}`)
    handleMediaStream(ws, tempId)
  })

  wss.on('error', (err) => {
    console.error('[WS] WebSocket server error:', err)
  })

  // ─── Dev Simulation (development only) ─────────────────────────────────────
  // Registers POST /dev/simulate-call to test the OpenAI bridge without Twilio.
  if (env.NODE_ENV !== 'production') {
    attachDevSimulationRoute(wss)
    console.log('🧪 Dev simulation mode active: POST http://localhost:4000/dev/simulate-call')
  }

  // ─── Start listening ──────────────────────────────────────────────────────
  server.listen(env.PORT, () => {
    console.log(`🚀 VR Digital Calling backend running on port ${env.PORT}`)
    console.log(`📡 WebSocket server ready at ws://localhost:${env.PORT}/ws/media`)
    console.log(`🌍 Environment: ${env.NODE_ENV}`)
  })

  // ─── Graceful shutdown ────────────────────────────────────────────────────
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received. Shutting down gracefully...`)
    wss.close()
    server.close(async () => {
      await prisma.$disconnect()
      console.log('✅ Server closed. Database disconnected.')
      process.exit(0)
    })
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

bootstrap().catch((err) => {
  console.error('❌ Fatal startup error:', err)
  process.exit(1)
})
