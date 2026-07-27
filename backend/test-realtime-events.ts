import WebSocket from 'ws'
import dotenv from 'dotenv'

dotenv.config()

const apiKey = process.env.OPENAI_API_KEY!

const url = 'wss://api.openai.com/v1/realtime?model=gpt-realtime-mini'
const ws = new WebSocket(url, {
  headers: { Authorization: `Bearer ${apiKey}` },
})

ws.on('open', () => {
  console.log('✅ WebSocket Connected. Initializing session and requesting audio response...')

  ws.send(
    JSON.stringify({
      type: 'session.update',
      session: {
        type: 'realtime',
        output_modalities: ['text', 'audio'],
        instructions: 'Tu es un assistant vocal. Réponds en une seule phrase.',
        voice: 'alloy',
      },
    }),
  )

  // Send user message
  ws.send(
    JSON.stringify({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: 'Bonjour, dis-moi bonjour de manière chaleureuse !',
          },
        ],
      },
    }),
  )

  // Trigger response
  ws.send(
    JSON.stringify({
      type: 'response.create',
    }),
  )
})

ws.on('message', (data: WebSocket.RawData) => {
  const msg = JSON.parse(data.toString())
  console.log(`[EVENT] ${msg.type}`, msg.delta ? `(delta size: ${msg.delta.length})` : '')
  if (msg.type === 'error') {
    console.error('❌ Error:', msg.error)
  }
  if (msg.type === 'response.done') {
    console.log('\n🎉 Response done! Closing test...')
    ws.close()
    process.exit(0)
  }
})

ws.on('error', (err) => {
  console.error('❌ WebSocket Error:', err.message)
  process.exit(1)
})
