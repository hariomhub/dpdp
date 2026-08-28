import crypto from 'crypto'
import { config } from '../config'

const ALGORITHM = 'aes-256-gcm'
const IV_BYTES   = 12  // 96-bit nonce — NIST recommendation for GCM
const TAG_BYTES  = 16

/**
 * Derives a 32-byte key from a hex string. Throws clearly if it's missing
 * or malformed, naming which env var it came from so the error is
 * actionable regardless of which key was passed in.
 */
function getKeyFromHex(hex: string, envVarName = 'ENCRYPTION_KEY'): Buffer {
  if (!hex || hex.length !== 64) {
    throw new Error(
      `${envVarName} must be a 64-character hex string (32 bytes). ` +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    )
  }
  return Buffer.from(hex, 'hex')
}

function getKey(): Buffer {
  return getKeyFromHex(config.entra.encryptionKey, 'ENTRA_ENCRYPTION_KEY')
}

/**
 * AES-256-GCM encrypt.
 * Output format: `<ivHex>:<tagHex>:<ciphertextHex>`
 */
export function encrypt(plaintext: string): string {
  const key = getKey()
  const iv  = crypto.randomBytes(IV_BYTES)

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()

  return [
    iv.toString('hex'),
    tag.toString('hex'),
    encrypted.toString('hex'),
  ].join(':')
}

/**
 * AES-256-GCM decrypt.
 * Expects the format produced by `encrypt()`.
 */
export function decrypt(ciphertext: string): string {
  return decryptWithKey(ciphertext, config.entra.encryptionKey)
}

/**
 * Same AES-256-GCM scheme as encrypt(), but with an explicit key instead of
 * always using Entra's. Used for credential stores that must stay on a
 * separate key from Entra login credentials (e.g. TenantCloudConnection —
 * deliberately not sharing a key or a table with Entra, see that model's
 * comment for why).
 */
export function encryptWithKey(plaintext: string, keyHex: string): string {
  const key = getKeyFromHex(keyHex)
  const iv  = crypto.randomBytes(IV_BYTES)

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()

  return [
    iv.toString('hex'),
    tag.toString('hex'),
    encrypted.toString('hex'),
  ].join(':')
}

export function decryptWithKey(ciphertext: string, keyHex: string): string {
  const key = getKeyFromHex(keyHex)
  const parts = ciphertext.split(':')
  if (parts.length !== 3) throw new Error('Invalid ciphertext format')

  const [ivHex, tagHex, dataHex] = parts
  const iv   = Buffer.from(ivHex,  'hex')
  const tag  = Buffer.from(tagHex, 'hex')
  const data = Buffer.from(dataHex, 'hex')

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)

  return decipher.update(data).toString('utf8') + decipher.final('utf8')
}