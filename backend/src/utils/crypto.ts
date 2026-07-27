// ─────────────────────────────────────────────────────────────────────────────
// crypto.ts — Kept for potential future use (e.g., encrypting other secrets).
//
// NOTE: In the MVP architecture, Twilio credentials are stored only in .env
// and NOT in the database, so this module is currently unused.
// It is preserved here so multi-company encryption can be re-enabled later
// without rewriting the implementation.
// ─────────────────────────────────────────────────────────────────────────────

import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12   // 96 bits — recommended for GCM
const TAG_LENGTH = 16  // 128-bit auth tag

function getKey(keyHex: string): Buffer {
  return Buffer.from(keyHex, 'hex')
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * @param plaintext - The value to encrypt
 * @param keyHex   - 64-character hex key (32 bytes)
 * Returns a colon-separated string: iv:authTag:ciphertext (all hex).
 */
export function encrypt(plaintext: string, keyHex: string): string {
  const key = getKey(keyHex)
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

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
 * @param encryptedValue - The iv:authTag:ciphertext string
 * @param keyHex         - 64-character hex key (32 bytes)
 * Throws if the ciphertext has been tampered with (auth tag mismatch).
 */
export function decrypt(encryptedValue: string, keyHex: string): string {
  const parts = encryptedValue.split(':')
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted value format — expected iv:authTag:ciphertext')
  }

  const [ivHex, authTagHex, encryptedHex] = parts
  const key = getKey(keyHex)
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const encrypted = Buffer.from(encryptedHex, 'hex')

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ])

  return decrypted.toString('utf8')
}
