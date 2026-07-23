// ─────────────────────────────────────────────────────────────────────────────
// AES-256-GCM encryption utility for sensitive fields (Twilio credentials).
//
// Why AES-256-GCM?
// - Authenticated encryption: prevents tampering (unlike AES-CBC)
// - Each encryption uses a unique random IV (initialization vector)
// - The auth tag verifies integrity on decryption
//
// Encrypted format stored in DB:
//   iv:authTag:encryptedData  (all hex-encoded, colon-separated)
// ─────────────────────────────────────────────────────────────────────────────

import crypto from 'crypto'
import { env } from '../config/env'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12   // 96 bits — recommended for GCM
const TAG_LENGTH = 16  // 128-bit auth tag

function getKey(): Buffer {
  return Buffer.from(env.ENCRYPTION_KEY, 'hex')
}

/**
 * Encrypts a plaintext string.
 * Returns a colon-separated string: iv:authTag:ciphertext (all hex).
 */
export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv)

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])
  const authTag = cipher.getAuthTag()

  return [
    iv.toString('hex'),
    authTag.toString('hex'),
    encrypted.toString('hex'),
  ].join(':')
}

/**
 * Decrypts a value previously encrypted with `encrypt()`.
 * Throws if the ciphertext has been tampered with (auth tag mismatch).
 */
export function decrypt(encryptedValue: string): string {
  const parts = encryptedValue.split(':')
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted value format')
  }

  const [ivHex, authTagHex, encryptedHex] = parts
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const encrypted = Buffer.from(encryptedHex, 'hex')

  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv)
  decipher.setAuthTag(authTag)

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ])

  return decrypted.toString('utf8')
}
