// ─────────────────────────────────────────────────────────────────────────────
// OpenAI Realtime API Test Script
// Tests your OPENAI_API_KEY and model access directly via WebSockets.
// Captures full HTTP status code, headers, and raw JSON error from OpenAI.
// Run with: docker-compose exec backend npx ts-node test-ai.ts
// ─────────────────────────────────────────────────────────────────────────────

import WebSocket from 'ws'
import dotenv from 'dotenv'
import type { IncomingMessage } from 'http'

dotenv.config()

const apiKey = process.env.OPENAI_API_KEY

if (!apiKey || !apiKey.startsWith('sk-')) {
  console.error('❌ Missing or invalid OPENAI_API_KEY in .env')
  process.exit(1)
}

console.log('🔑 Testing OpenAI Realtime API connection...')
console.log(`🔑 Key prefix: ${apiKey.slice(0, 15)}...`)

const modelsToTest = [
  'gpt-realtime-mini',
  'gpt-4o-mini-realtime-preview',
  'gpt-4o-realtime-preview',
  'gpt-4o-realtime-preview-2024-12-17',
]

async function testModel(modelName: string): Promise<boolean> {
  return new Promise((resolve) => {
    console.log(`\n==================================================`)
    console.log(`🧪 Testing model: "${modelName}"...`)
    console.log(`==================================================`)
    const url = `wss://api.openai.com/v1/realtime?model=${modelName}`

    const ws = new WebSocket(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    })

    let resolved = false
    const finish = (result: boolean) => {
      if (!resolved) {
        resolved = true
        clearTimeout(timeout)
        try { ws.close() } catch {}
        resolve(result)
      }
    }

    const timeout = setTimeout(() => {
      console.log(`⏳ Timeout waiting for response from ${modelName}`)
      finish(false)
    }, 10000)

    // Capture HTTP handshake rejection (401, 403, 404, etc.)
    ws.on('unexpected-response', (_req: unknown, res: IncomingMessage) => {
      console.error(`\n❌ HTTP Handshake Failed!`)
      console.error(`   HTTP Status Code: ${res.statusCode} ${res.statusMessage}`)
      console.error(`   Headers:`, JSON.stringify(res.headers, null, 2))

      let body = ''
      res.on('data', (chunk) => { body += chunk })
      res.on('end', () => {
        console.error(`   Raw Response Body:`)
        try {
          const parsed = JSON.parse(body)
          console.error(JSON.stringify(parsed, null, 2))
        } catch {
          console.error(body || '(empty response body)')
        }
        finish(false)
      })
    })

    ws.on('open', () => {
      console.log(`✅ Connected to WebSocket endpoint for ${modelName}! Sending test session...`)

      // Send session initialization
      ws.send(
        JSON.stringify({
          type: 'session.update',
          session: {
            modalities: ['text'],
            instructions: 'Tu es un assistant IA de test. Réponds en une phrase courte.',
          },
        }),
      )

      // Request a response
      ws.send(
        JSON.stringify({
          type: 'response.create',
          response: {
            instructions: 'Dis "Bonjour! La connexion OpenAI est fonctionnelle."',
          },
        }),
      )
    })

    ws.on('message', (data: WebSocket.RawData) => {
      try {
        const msg = JSON.parse(data.toString())
        console.log(`📩 OpenAI Event [${msg.type}]:`, JSON.stringify(msg, null, 2))

        if (msg.type === 'response.text.done') {
          console.log('\n🎉 Realtime Answer Received Successfully!')
          finish(true)
        }
        if (msg.type === 'error') {
          console.error(`\n❌ OpenAI Event Error [${modelName}]:`)
          console.error(JSON.stringify(msg, null, 2))
          finish(false)
        }
      } catch (err) {
        console.error('Error parsing msg:', err)
      }
    })

    ws.on('error', (err: Error) => {
      console.error(`❌ WebSocket Error [${modelName}]:`, err.message)
      finish(false)
    })
  })
}

async function runTests() {
  for (const model of modelsToTest) {
    const ok = await testModel(model)
    if (ok) {
      console.log(`\n✨ SUCCESS! Model "${model}" works 100% with your API key!`)
      process.exit(0)
    }
  }

  console.error('\n❌ All Realtime models failed.')
  process.exit(1)
}

runTests()
