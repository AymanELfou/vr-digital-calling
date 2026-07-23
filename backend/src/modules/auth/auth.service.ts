// ─────────────────────────────────────────────────────────────────────────────
// Auth Service — Business Logic
// Handles user registration, login, and password management.
// All tokens are issued as HttpOnly cookies for security.
// ─────────────────────────────────────────────────────────────────────────────

import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { Response } from 'express'
import { prisma } from '../../services/prisma.service'
import { env } from '../../config/env'
import { createError } from '../../middleware/error.middleware'
import type { RegisterInput, LoginInput } from './auth.schema'

const BCRYPT_ROUNDS = 12
const JWT_EXPIRES_IN = '7d'
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000 // 7 days in ms

// ─── Token Helpers ────────────────────────────────────────────────────────────

function generateToken(userId: string, email: string, role: string): string {
  return jwt.sign({ sub: userId, email, role }, env.JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  })
}

/**
 * Sets the JWT as an HttpOnly cookie.
 * This prevents JavaScript from reading the token (XSS protection).
 */
function setAuthCookie(res: Response, token: string): void {
  res.cookie('access_token', token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'strict',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  })
}

// ─── Service Methods ─────────────────────────────────────────────────────────

export const authService = {
  /**
   * Registers a new company user.
   * Creates the User + Company records in a single transaction.
   */
  async register(input: RegisterInput, res: Response) {
    // Check if email already exists
    const existing = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    })
    if (existing) {
      throw createError(409, 'An account with this email already exists')
    }

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS)

    // Create User + Company atomically — if one fails, both are rolled back
    const { user, company } = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: input.email.toLowerCase(),
          passwordHash,
          role: 'COMPANY',
        },
      })

      const company = await tx.company.create({
        data: {
          userId: user.id,
          name: input.companyName,
          // Create default AiConfig for the company
          aiConfig: {
            create: {
              systemPrompt: `You are a professional AI assistant for ${input.companyName}. Answer callers' questions politely and accurately based on the information provided about our company.`,
              voice: 'alloy',
              engine: 'realtime',
            },
          },
        },
        include: { aiConfig: true },
      })

      return { user, company }
    })

    const token = generateToken(user.id, user.email, user.role)
    setAuthCookie(res, token)

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      company: {
        id: company.id,
        name: company.name,
      },
    }
  },

  /**
   * Authenticates an existing user.
   */
  async login(input: LoginInput, res: Response) {
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
      include: { company: true },
    })

    // Use constant-time comparison to prevent timing attacks
    // (bcrypt.compare is safe even if user is null — we compare against a dummy hash)
    const dummyHash = '$2a$12$dummy.hash.to.prevent.timing.attacks.xxxxxxxxxxx'
    const passwordMatch = await bcrypt.compare(
      input.password,
      user?.passwordHash ?? dummyHash,
    )

    if (!user || !passwordMatch) {
      throw createError(401, 'Invalid email or password')
    }

    if (!user.isActive) {
      throw createError(403, 'Your account has been suspended. Please contact support.')
    }

    const token = generateToken(user.id, user.email, user.role)
    setAuthCookie(res, token)

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      company: user.company
        ? { id: user.company.id, name: user.company.name }
        : null,
    }
  },

  /**
   * Returns the current user's profile from the DB.
   * Used to refresh user data on app load.
   */
  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { company: true },
    })

    if (!user) throw createError(404, 'User not found')

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      company: user.company
        ? { id: user.company.id, name: user.company.name, isActive: user.company.isActive }
        : null,
    }
  },

  /**
   * Changes the current user's password.
   * Requires the current password to prevent unauthorized changes.
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw createError(404, 'User not found')

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!isMatch) throw createError(401, 'Current password is incorrect')

    const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS)
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    })
  },

  /**
   * Clears the auth cookie (logout).
   */
  logout(res: Response): void {
    res.clearCookie('access_token', { path: '/' })
  },
}
