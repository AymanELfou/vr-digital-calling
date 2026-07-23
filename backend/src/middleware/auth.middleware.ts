// ─────────────────────────────────────────────────────────────────────────────
// JWT Authentication Middleware
// Reads the JWT from the HttpOnly cookie (secure) OR the Authorization header
// (Bearer token — kept as fallback for API clients / mobile apps).
// ─────────────────────────────────────────────────────────────────────────────

import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../config/env'
import { createError } from './error.middleware'
import { Role } from '@prisma/client'

export interface JwtPayload {
  sub: string    // User ID
  email: string
  role: Role
  iat: number
  exp: number
}

// Extend Express Request to carry the authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  // 1. Try HttpOnly cookie first (browser clients)
  // 2. Fall back to Authorization header (API clients / Postman)
  const tokenFromCookie = req.cookies?.access_token as string | undefined
  const tokenFromHeader = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : undefined

  const token = tokenFromCookie ?? tokenFromHeader

  if (!token) {
    throw createError(401, 'Authentication required')
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload
    req.user = payload
    next()
  } catch {
    throw createError(401, 'Invalid or expired token')
  }
}
