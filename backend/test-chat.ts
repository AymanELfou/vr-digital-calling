import OpenAI from 'openai'
import dotenv from 'dotenv'

dotenv.config()

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

async function testStandardChat() {
  console.log('🧪 Testing standard Chat Completions (gpt-4o-mini)...')
  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Bonjour! Réponds en 3 mots.' }],
    })
    console.log('✅ Chat Completions Success:', res.choices[0]?.message?.content)
    return true
  } catch (err: unknown) {
    console.error('❌ Chat Completions Error:', (err as Error).message)
    return false
  }
}

testStandardChat()
