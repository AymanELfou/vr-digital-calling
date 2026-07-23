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
  isActive: boolean
  createdAt: string
  updatedAt: string
  twilioConfig: TwilioConfigPublic | null
  aiConfig: AiConfig | null
}

// ── Twilio Config (public view — no secrets) ──────────────────────────────────

export interface TwilioConfigPublic {
  id: string
  accountSid: string
  phoneNumber: string
  apiKey: string | null
  isVerified: boolean
  updatedAt: string
}

export interface TwilioConfigInput {
  accountSid: string
  authToken: string
  phoneNumber: string
  apiKey?: string
  apiSecret?: string
}

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
  language: string
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
  transcript: TranscriptEntry[] | null
  recordingUrl: string | null
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
