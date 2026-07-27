import WebSocket from 'ws'
import dotenv from 'dotenv'

dotenv.config()

const apiKey = process.env.OPENAI_API_KEY!

const url = 'wss://api.openai.com/v1/realtime?model=gpt-realtime-mini'
const ws = new WebSocket(url, {
  headers: { Authorization: `Bearer ${apiKey}` },
})

ws.on('open', () => {
  console.log('✅ WebSocket Connected. Testing gpt-realtime-mini session.update with audio/pcmu...')

  ws.send(
    JSON.stringify({
      type: 'session.update',
      session: {
        type: 'realtime',
        instructions: 'Tu es un assistant vocal. Réponds en français.',
        audio: {
          input: {
            format: {
              type: 'audio/pcmu',
            },
            transcription: {
              model: 'whisper-1',
            },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 500,
            },
          },
          output: {
            format: {
              type: 'audio/pcmu',
            },
            voice: 'alloy',
          },
        },
      },
    }),
  )
})

ws.on('message', (data: WebSocket.RawData) => {
  const msg = JSON.parse(data.toString())
  console.log('📩 OpenAI Event:', msg.type)
  if (msg.type === 'session.updated') {
    console.log('🎉 SUCCESS! session.update ACCEPTED BY OPENAI!')
    console.log('Updated session:', JSON.stringify(msg.session, null, 2))
    ws.close()
    process.exit(0)
  }
  if (msg.type === 'error') {
    console.error('❌ OpenAI Error details:', JSON.stringify(msg, null, 2))
    ws.close()
    process.exit(1)
  }
})

ws.on('error', (err) => {
  console.error('❌ Connection Error:', err.message)
  process.exit(1)
})
