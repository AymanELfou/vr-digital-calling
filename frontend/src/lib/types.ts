// ─────────────────────────────────────────────────────────────────────────────
// Shared TypeScript Types — Frontend
// Mirrors the backend Prisma models and API response shapes.
// ─────────────────────────────────────────────────────────────────────────────

// ── Enums ─────────────────────────────────────────────────────────────────────

export type Role = 'ADMIN' | 'COMPANY'

export type CallStatus =
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'FAILED'
  | 'MISSED'
  | 'NO_ANSWER'

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string
  email: string
  role: Role
}

export interface AuthCompany {
  id: string
  name: string
  isActive?: boolean
}

export interface AuthResponse {
  user: AuthUser
  company: AuthCompany | null
}

// ── Company ───────────────────────────────────────────────────────────────────

export interface Company {
  id: string
  name: string
  description: string | null
  address: string | null
  website: string | null
  email: string | null
  phone: string | null       // Moroccan contact number (display only)
  isActive: boolean
  createdAt: string
  updatedAt: string
  aiConfig: AiConfig | null  // null if not yet configured
}

// TwilioConfig types removed — MVP uses single platform Twilio account.
// Credentials are stored only in the backend .env file.
// See: TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_PHONE_NUMBER

// ── AI Config ─────────────────────────────────────────────────────────────────

export type AiVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'
export type AiEngine = 'realtime' | 'chat_tts'

export interface AiConfig {
  id: string
  companyId: string
  systemPrompt: string
  voice: AiVoice
  allowGeneral: boolean
  temperature: number
  engine: AiEngine
  language: string     // 'auto' | 'en' | 'fr' | 'ar' | ...
  maxTokens: number
  silenceMs: number
  updatedAt: string
}

// ── Services ──────────────────────────────────────────────────────────────────

export interface Service {
  id: string
  companyId: string
  name: string
  description: string | null
  price: number | null
  duration: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// ── Knowledge Base ────────────────────────────────────────────────────────────

export interface KnowledgeBaseEntry {
  id: string
  companyId: string
  question: string
  answer: string
  category: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// ── Calls ─────────────────────────────────────────────────────────────────────

export interface Call {
  id: string
  companyId: string
  twilioCallSid: string
  callerNumber: string
  status: CallStatus
  duration: number | null
  startedAt: string
  endedAt: string | null
}

export interface CallDetail extends Call {
  transcript: TranscriptEntry[] | null  // Stored as JSON in DB, parsed by backend
  aiSummary: string | null              // AI-generated post-call summary
  detectedLang: string | null           // Language detected from caller
}

export interface TranscriptEntry {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

// ── Pagination ────────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// ── Admin ─────────────────────────────────────────────────────────────────────

export interface AdminCompany {
  id: string
  name: string
  isActive: boolean
  createdAt: string
  user: {
    email: string
    createdAt: string
    isActive: boolean
  }
  twilioConfig: {
    phoneNumber: string
    isVerified: boolean
  } | null
  _count: {
    calls: number
    services: number
    knowledgeBase: number
  }
}

export interface AdminStats {
  totalCompanies: number
  activeCompanies: number
  suspendedCompanies: number
  totalCalls: number
  callsToday: number
}
