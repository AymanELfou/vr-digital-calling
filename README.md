# VR Digital Calling

A production-ready SaaS Progressive Web Application that lets companies use an AI Voice Agent (OpenAI Realtime API) to automatically answer incoming phone calls through Twilio.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS v3 + shadcn/ui |
| Backend | Express.js + TypeScript + Prisma ORM |
| Database | PostgreSQL 16 |
| AI | OpenAI Realtime API (WebSocket) |
| Phone | Twilio Media Streams |
| Deploy | Docker + Docker Compose + Nginx |
| PWA | vite-plugin-pwa + Workbox |

## Quick Start

### 1. Clone and configure environment

```bash
cp .env.example .env
# Edit .env with your secrets (see comments in the file)
```

### 2. Generate secrets

```bash
# JWT Secret (64+ chars)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Encryption Key (exactly 32 bytes = 64 hex chars)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Start with Docker Compose

```bash
docker-compose up
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:4000/api
- Backend health: http://localhost:4000/health

### 4. Run database migrations

```bash
docker-compose exec backend npx prisma migrate dev --name init
```

## Project Structure

```
vr-digital-calling/
├── docker-compose.yml
├── nginx.conf              ← Nginx with WebSocket upgrade for /ws/*
├── .env                    ← Your secrets (never commit)
├── .env.example            ← Template
├── backend/
│   ├── prisma/schema.prisma
│   └── src/
│       ├── modules/        ← Feature modules (auth, company, twilio, ...)
│       ├── middleware/     ← JWT, RBAC, error handler
│       ├── services/       ← Prisma singleton, OpenAI
│       ├── utils/          ← AES-256-GCM crypto
│       ├── app.ts          ← Express setup
│       └── index.ts        ← HTTP + WebSocket server
└── frontend/
    └── src/
        ├── pages/          ← Auth + Company + Admin pages
        ├── components/     ← Layout + shared + shadcn/ui
        ├── lib/            ← API client, Zustand store, types
        └── hooks/          ← React Query hooks
```

## Call Flow

```
Customer calls company's Twilio number
  → POST /api/twilio/voice (Twilio webhook)
  → TwiML: <Connect><Stream url="wss://server/ws/media">
  → Twilio opens WebSocket to /ws/media
  → Backend bridges audio to OpenAI Realtime API
  → AI responds in real time
  → Audio returned to caller
  → Call transcript saved to DB
```

## Security Architecture

- JWT stored in **HttpOnly cookies** (XSS protection)
- Twilio Auth Tokens **encrypted with AES-256-GCM** at rest
- Twilio webhooks validated using **X-Twilio-Signature**
- RBAC: `ADMIN` vs `COMPANY` roles
- CORS configured with `credentials: true` for cookie auth

## Development Commands

```bash
# Backend
cd backend && npm run dev           # Start with hot reload
cd backend && npm run prisma:studio # Open Prisma Studio
cd backend && npm run prisma:migrate # Run migrations

# Frontend
cd frontend && npm run dev          # Start Vite dev server
cd frontend && npm run build        # Production build
```
