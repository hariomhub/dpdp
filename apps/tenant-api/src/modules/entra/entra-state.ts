import { createHash, randomBytes, timingSafeEqual } from 'crypto'
import jwt from 'jsonwebtoken'
import { config } from '../../config'
import { encryptWithKey, decryptWithKey } from '../../utils/crypto'
import { HttpError } from '../../utils/http-error'

/**
 * Protects the Microsoft sign-in redirect.
 *
 * Without it, the `state` value was just the organisation id: anyone could send a victim a link that completed the
 * attacker's own Microsoft sign-in in the victim's browser (login CSRF), and an intercepted authorisation code could be
 * redeemed by a third party. Now:
 *
 *  - `state` is a short-lived signed token created by the server for this sign-in attempt;
 *  - a random `nonce` is handed to the browser (kept in sessionStorage, never in the URL) and only its hash is inside
 *    `state`, so only the browser that STARTED the sign-in can finish it;
 *  - the redirect carries a PKCE challenge, and the matching verifier travels inside `state` encrypted, so a code
 *    that is intercepted cannot be exchanged without it.
 *
 * Everything is derived on the server, so it also works on a plain-http intranet (no WebCrypto needed in the browser).
 */

const STATE_TTL = '10m'

const base64url = (b: Buffer) => b.toString('base64url')
const sha256 = (s: string) => createHash('sha256').update(s).digest()

/** Key for sealing the verifier inside the state token, derived from the signing secret but distinct from it. */
const sealKey = () => createHash('sha256').update(`entra-login-state-v1:${config.jwt.secret}`).digest('hex')

export interface LoginSession {
  state: string
  /** give to the browser; it must send it back when completing the sign-in */
  nonce: string
  codeChallenge: string
}

export function createLoginSession(tenantId: string): LoginSession {
  const codeVerifier = base64url(randomBytes(32))
  const nonce = base64url(randomBytes(24))
  const state = jwt.sign(
    {
      type: 'entra-state',           // never accepted as an access token (see middleware/auth.ts)
      tid: tenantId,
      v: encryptWithKey(codeVerifier, sealKey()),
      nh: base64url(sha256(nonce)),
    },
    config.jwt.secret,
    { expiresIn: STATE_TTL },
  )
  return { state, nonce, codeChallenge: base64url(sha256(codeVerifier)) }
}

export function openLoginSession(state: string, nonce: string): { tenantId: string; codeVerifier: string } {
  const expired = () => HttpError.badRequest('This sign-in attempt has expired or is not valid. Start again from the login page.')
  let payload: { type?: string; tid?: string; v?: string; nh?: string }
  try {
    payload = jwt.verify(state, config.jwt.secret) as typeof payload
  } catch {
    throw expired()
  }
  if (payload.type !== 'entra-state' || !payload.tid || !payload.v || !payload.nh) throw expired()

  const expected = Buffer.from(payload.nh)
  const actual = Buffer.from(base64url(sha256(nonce || '')))
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) throw expired()

  return { tenantId: payload.tid, codeVerifier: decryptWithKey(payload.v, sealKey()) }
}
