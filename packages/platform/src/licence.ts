import { createPrivateKey, createPublicKey, sign as edSign, verify as edVerify, KeyObject } from 'crypto'

/**
 * The signed licence: the one document that turns an installed instance into a particular customer's working
 * deployment. Issued by the control plane (Super Admin), verified OFFLINE by the instance against trusted public keys,
 * so it works identically in the customer's cloud, on-prem with internet, and air-gapped.
 *
 * Format: a JWS in compact form, EdDSA (Ed25519):   base64url(header) . base64url(payload) . base64url(signature)
 * header  = { alg: 'EdDSA', typ: 'DPDP-LICENCE', kid }
 */

export const LICENCE_FORMAT_VERSION = 1

export interface LicenceOrg {
  /** the organisation id used as `tenantId` on every row of the instance */
  id: string
  code: string
  name: string
  industry: string
  orgSize: string
  address: string
  country: string
  website?: string | null
  contactEmail: string
  dpoName: string
  dpoEmail: string
  dpoPhone?: string | null
  panNumber?: string | null
  gstNumber?: string | null
  classification: string
  classUncertain: boolean
  ceoName: string
  ceoEmail: string
}

export interface LicencePayload {
  v: typeof LICENCE_FORMAT_VERSION
  /** licence id */
  lid: string
  /** issuer label */
  iss: string
  /** issued at, seconds since epoch (a newer licence for the same organisation replaces an older one) */
  iat: number
  org: LicenceOrg
  /** the category the organisation holds under each regulation (Library ids); the instance keeps any it already has */
  classifications?: Array<{ regulationId: string; applicabilityCategoryId: string; isUncertain: boolean }>
  plan: string
  limits: { maxUsers: number; maxAssessments: number; storageGb: number }
  entitlements: {
    /** short codes of licensed regulations, or '*' for all */
    regulations: string[] | '*'
    features: string[]
  }
  /** seconds since epoch */
  validFrom: number
  validUntil: number
  /** security/content updates are delivered until this time (used by the updater) */
  updatesUntil: number
  /** days of full function after validUntil before the portal turns read-only (30 online, 60 air-gapped) */
  graceDays: number
  airGapped: boolean
}

export interface TrustKey { kid: string; publicKey: string }

export class LicenceError extends Error {
  constructor(public readonly code: 'MALFORMED' | 'UNKNOWN_KEY' | 'BAD_SIGNATURE' | 'UNSUPPORTED', message: string) {
    super(message)
    this.name = 'LicenceError'
  }
}

const b64u = (b: Buffer | string) => Buffer.from(b).toString('base64url')
const fromB64u = (s: string) => Buffer.from(s, 'base64url')

export function signLicence(payload: LicencePayload, privateKeyPem: string, kid: string): string {
  const header = b64u(JSON.stringify({ alg: 'EdDSA', typ: 'DPDP-LICENCE', kid }))
  const body = b64u(JSON.stringify(payload))
  const signature = edSign(null, Buffer.from(`${header}.${body}`), createPrivateKey(privateKeyPem))
  return `${header}.${body}.${b64u(signature)}`
}

/**
 * Check the signature against the trusted keys and return the payload. Does NOT judge dates - that is evaluateLicence().
 * A licence signed with a key that is not in the trust list is refused (UNKNOWN_KEY), whatever else it says.
 */
export function verifyLicence(token: string, trustedKeys: TrustKey[]): LicencePayload {
  const parts = token.trim().split('.')
  if (parts.length !== 3 || parts.some(p => p === '')) throw new LicenceError('MALFORMED', 'This is not a licence file.')

  let header: { alg?: string; typ?: string; kid?: string }
  let payload: LicencePayload
  try {
    header = JSON.parse(fromB64u(parts[0]).toString('utf8'))
    payload = JSON.parse(fromB64u(parts[1]).toString('utf8'))
  } catch {
    throw new LicenceError('MALFORMED', 'This is not a licence file.')
  }
  if (header.alg !== 'EdDSA' || header.typ !== 'DPDP-LICENCE' || !header.kid) throw new LicenceError('MALFORMED', 'This is not a licence file.')

  const key = trustedKeys.find(k => k.kid === header.kid)
  if (!key) throw new LicenceError('UNKNOWN_KEY', 'This licence was not issued by a trusted authority (unknown signing key).')

  let ok = false
  try {
    ok = edVerify(null, Buffer.from(`${parts[0]}.${parts[1]}`), createPublicKey(key.publicKey) as KeyObject, fromB64u(parts[2]))
  } catch {
    ok = false
  }
  if (!ok) throw new LicenceError('BAD_SIGNATURE', 'The licence signature is not valid. The file may be damaged or altered.')

  if (payload.v !== LICENCE_FORMAT_VERSION) throw new LicenceError('UNSUPPORTED', 'This licence was made for a newer version of the software.')
  if (!payload.org?.id || !payload.lid || typeof payload.validUntil !== 'number' || typeof payload.validFrom !== 'number') {
    throw new LicenceError('MALFORMED', 'The licence is incomplete.')
  }
  return payload
}

/** The id of the key a licence claims to be signed with (read from its header; not trusted until verifyLicence passes). */
export function peekKeyId(token: string): string | null {
  try {
    return JSON.parse(fromB64u(token.trim().split('.')[0]).toString('utf8')).kid ?? null
  } catch {
    return null
  }
}

export interface GeneratedKeyPair { privateKeyPem: string; publicKeyPem: string }

export function generateSigningKeyPair(): GeneratedKeyPair {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { generateKeyPairSync } = require('crypto') as typeof import('crypto')
  const { privateKey, publicKey } = generateKeyPairSync('ed25519')
  return {
    privateKeyPem: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
    publicKeyPem: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
  }
}
