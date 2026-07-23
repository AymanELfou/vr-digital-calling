# ─── Stage 1: Development ─────────────────────────────────────────────────
FROM node:22-alpine AS development

# Install OpenSSL and compatibility libraries required by Prisma CLI in Alpine
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Install dependencies first (layer cache)
COPY package*.json ./
RUN npm install

# Copy prisma schema and generate client
COPY prisma ./prisma
RUN npm run prisma:generate

# Copy source
COPY . .

EXPOSE 4000

CMD ["npm", "run", "dev"]

# ─── Stage 2: Builder ─────────────────────────────────────────────────────
FROM node:22-alpine AS builder

RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY prisma ./prisma
RUN npm run prisma:generate

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ─── Stage 3: Production ──────────────────────────────────────────────────
FROM node:22-alpine AS production

RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY package*.json ./

EXPOSE 4000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
