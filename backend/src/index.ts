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
import { handleMediaStream } from './modules/twilio/twilio.ws'

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
    const callSid = req.url?.split('/').pop() ?? 'unknown'
    console.log(`[WS] Twilio Media Stream connected — callSid: ${callSid}`)
    handleMediaStream(ws, callSid)
  })

  wss.on('error', (err) => {
    console.error('[WS] WebSocket server error:', err)
  })

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
