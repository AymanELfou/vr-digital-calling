// ─────────────────────────────────────────────────────────────────────────────
// Role-based access control middleware.
// Used AFTER authenticate() to restrict endpoints by role.
//
// Usage:
//   router.get('/companies', authenticate, requireRole('ADMIN'), handler)
//   router.get('/profile', authenticate, requireRole('COMPANY'), handler)
// ─────────────────────────────────────────────────────────────────────────────

import { Request, Response, NextFunction } from 'express'
import { Role } from '@prisma/client'
import { createError } from './error.middleware'

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw createError(401, 'Authentication required')
    }

    if (!roles.includes(req.user.role)) {
      throw createError(403, 'Forbidden: insufficient permissions')
    }

    next()
  }
}

// Convenience shortcuts
export const requireAdmin = requireRole('ADMIN')
export const requireCompany = requireRole('COMPANY')
// Admin can also access company routes if needed
export const requireAny = requireRole('ADMIN', 'COMPANY')
