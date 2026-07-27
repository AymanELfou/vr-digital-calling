// ─────────────────────────────────────────────────────────────────────────────
// Global error handler middleware.
// Must be the LAST middleware registered in app.ts.
// Catches all errors thrown in route handlers (thanks to express-async-errors).
// ─────────────────────────────────────────────────────────────────────────────

import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'

export interface ApiError extends Error {
  statusCode?: number
}

export function errorMiddleware(
  err: ApiError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Zod validation errors → 400 with detailed field errors
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation failed',
      details: err.flatten().fieldErrors,
    })
    return
  }

  const statusCode = err.statusCode ?? 500
  const message = statusCode === 500 ? 'Internal server error' : err.message

  // Log 500s for server-side debugging
  if (statusCode === 500) {
    console.error('[ERROR]', err)
  }

  res.status(statusCode).json({ error: message })
}


export function createError(statusCode: number, message: string): ApiError {
  const err: ApiError = new Error(message)
  err.statusCode = statusCode
  return err
}
