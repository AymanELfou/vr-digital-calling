import { prisma } from './prisma.service'

export async function buildSystemPrompt(companyId: string, allowGeneral: boolean): Promise<string> {
  const [company, aiConfig, services, knowledgeBase] = await Promise.all([
    prisma.company.findUnique({
      where: { id: companyId },
      select: { name: true, description: true, address: true, email: true, website: true },
    }),
    prisma.aiConfig.findUnique({
      where: { companyId },
    }),
    prisma.service.findMany({
      where: { companyId, isActive: true },
      select: { name: true, description: true, price: true, duration: true },
      take: 30, // Limit to prevent prompt overflow
    }),
    prisma.knowledgeBase.findMany({
      where: { companyId, isActive: true },
      select: { question: true, answer: true, category: true },
      take: 50, // Limit to keep prompt manageable
    }),
  ])

  if (!company || !aiConfig) {
    return 'You are a helpful AI voice assistant. Answer caller questions politely.'
  }

  // ── Company Info Block ───────────────────────────────────────────────────
  const companyLines = [
    company.name && `Name: ${company.name}`,
    company.description && `About: ${company.description}`,
    company.address && `Address: ${company.address}`,
    company.email && `Email: ${company.email}`,
    company.website && `Website: ${company.website}`,
  ]
    .filter(Boolean)
    .join('\n')

  // ── Services Block ───────────────────────────────────────────────────────
  const servicesBlock =
    services.length > 0
      ? `\n\n## Our Services\n${services
          .map((s) => {
            const parts = [`- ${s.name}`]
            if (s.price != null) parts.push(`$${s.price}`)
            if (s.duration) parts.push(`(${s.duration})`)
            if (s.description) parts.push(`— ${s.description}`)
            return parts.join(' ')
          })
          .join('\n')}`
      : ''

  // ── Knowledge Base Block ─────────────────────────────────────────────────
  const kbBlock =
    knowledgeBase.length > 0
      ? `\n\n## Frequently Asked Questions\n${knowledgeBase
          .map((kb) => `Q: ${kb.question}\nA: ${kb.answer}`)
          .join('\n\n')}`
      : ''

  // ── Language Instruction ─────────────────────────────────────────────────
  const languageInstruction =
    aiConfig.language === 'auto'
      ? "\n\nIMPORTANT: Automatically detect the caller's language from their first message and respond in that same language throughout the entire call."
      : `\n\nIMPORTANT: Always respond in ${aiConfig.language} regardless of what language the caller uses.`

  // ── General Knowledge Instruction ────────────────────────────────────────
  const generalKnowledgeInstruction = allowGeneral
    ? '\n\nYou may use your general knowledge to help callers when the question is not covered by the company information above. However, never invent or guess company-specific details such as prices, addresses, or policies.'
    : '\n\nCRITICAL: Only answer questions based on the company information provided above. If you do not have enough information to answer a question accurately, say: "I don\'t have that information right now. Please contact us directly and our team will be happy to help."'

  return `${aiConfig.systemPrompt}

## Company Information
${companyLines}
${servicesBlock}
${kbBlock}
${languageInstruction}
${generalKnowledgeInstruction}

## Voice Interaction Rules
- You are a professional AI phone receptionist
- Keep responses concise — this is a phone call, not a chat
- Never use markdown, bullet points, or special characters in spoken responses
- Speak naturally and conversationally
- If you must list items, use natural language: "We offer three services: first... second... and third..."
- When the caller seems frustrated, stay calm, empathetic, and solution-focused
- If unsure about something company-specific, offer to take a message or provide contact info`
}
