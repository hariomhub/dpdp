import crypto from 'crypto'
import { config } from '../config'

const ALGORITHM = 'aes-256-gcm'
const IV_BYTES   = 12  // 96-bit nonce — NIST recommendation for GCM
const TAG_BYTES  = 16

/**
 * Derives a 32-byte key from the configured hex string.
 * Throws clearly if the env var is missing or malformed.
 */
function getKey(): Buffer {
  const hex = config.entra.encryptionKey
  if (!hex || hex.length !== 64) {
    throw new Error(
      'ENTRA_ENCRYPTION_KEY must be a 64-character hex string (32 bytes). ' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    )
  }
  return Buffer.from(hex, 'hex')
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
  const key = getKey()
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