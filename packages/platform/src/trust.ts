import * as fs from 'fs'
import { TrustKey } from './licence'
import { BUILT_IN_TRUST_KEYS } from './built-in-keys'

/**
 * Which public keys an instance trusts to sign licences.
 *
 * The vendor's PRODUCTION public key is compiled into every released image (built-in-keys.ts; a public key is not a
 * secret) - an operator cannot swap it by changing a setting. Extra keys (development, a second key
 * during rotation) can be supplied through PLATFORM_TRUST_KEYS / PLATFORM_TRUST_KEYS_FILE, but only outside production
 * unless ALLOW_CUSTOM_TRUST_KEYS=true is set explicitly.
 *
 * Format of both: JSON array of { "kid": "...", "publicKey": "-----BEGIN PUBLIC KEY-----..." }.
 */
export function builtInTrustKeys(): TrustKey[] {
  return BUILT_IN_TRUST_KEYS.filter(isKey)
}

const isKey = (k: any): k is TrustKey => !!k && typeof k.kid === 'string' && typeof k.publicKey === 'string' && k.kid !== ''

export function loadTrustKeys(env: NodeJS.ProcessEnv = process.env): TrustKey[] {
  const keys = builtInTrustKeys()
  const customAllowed = env.NODE_ENV !== 'production' || env.ALLOW_CUSTOM_TRUST_KEYS === 'true'
  if (!customAllowed) return keys

  const raw = env.PLATFORM_TRUST_KEYS || (env.PLATFORM_TRUST_KEYS_FILE ? safeRead(env.PLATFORM_TRUST_KEYS_FILE) : '')
  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      for (const k of Array.isArray(parsed) ? parsed : []) if (isKey(k) && !keys.some(x => x.kid === k.kid)) keys.push(k)
    } catch {
      // A malformed list must not silently trust nothing-or-everything: config validation reports it at start-up.
    }
  }
  return keys
}

function safeRead(file: string): string {
  try { return fs.readFileSync(file, 'utf8') } catch { return '' }
}
