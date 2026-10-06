import { LicenceState, isFullyFunctional } from '@dpdp/platform'
import { config } from '../config'
import { getLicenceView } from './licence-store'

/**
 * Two different situations when the licence is not active:
 *
 *  - A licence WAS installed but has lapsed (expired beyond grace, withdrawn, clock set back, cannot be verified):
 *    RESTRICTED. The portal is READ-ONLY - everybody can still sign in, look at everything and export, nobody can create
 *    or change anything, and renewal works. The customer's data is never locked away.
 *  - NO licence has ever been installed: UNLICENSED. Nothing works except installing one (and signing in/out). Such an
 *    organisation has nothing at stake, so this is a hard gate - including export.
 */

/** Requests that are not changes, even though they use POST - they must keep working when read-only. */
const ALWAYS_ALLOWED: Array<{ method: string; path: RegExp }> = [
  { method: 'POST', path: /^\/api\/v1\/auth\/(logout|refresh)$/ },                // staying signed in / signing out
  { method: 'POST', path: /^\/api\/v1\/platform\/licence$/ },                    // renewal
  { method: 'POST', path: /^\/api\/v1\/files\/(evidence|gap-files|master-evidence)\/[^/]+\/link$/ }, // opening a file = reading
]

const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

/** The only requests that work when no licence has ever been installed: know who you are, sign out, see/install the licence. */
const ALLOWED_WITHOUT_LICENCE: Array<{ method: string; path: RegExp }> = [
  { method: 'GET', path: /^\/api\/v1\/auth\/me$/ },
  { method: 'POST', path: /^\/api\/v1\/auth\/(logout|refresh)$/ },
  { method: 'GET', path: /^\/api\/v1\/platform\/licence$/ },
  { method: 'POST', path: /^\/api\/v1\/platform\/licence$/ },
]

export interface GateDecision { allowed: boolean; state: LicenceState; code?: 'LICENCE_RESTRICTED' | 'NO_LICENCE'; message?: string }

/** Pure decision for a state and a request - unit-tested without a database. */
export function decide(state: LicenceState, method: string, path: string, reason?: string): GateDecision {
  const m = method.toUpperCase()
  if (isFullyFunctional(state)) return { allowed: true, state }

  if (state === 'UNLICENSED') {
    if (ALLOWED_WITHOUT_LICENCE.some(a => a.method === m && a.path.test(path))) return { allowed: true, state }
    return {
      allowed: false, state, code: 'NO_LICENCE',
      message: 'This organization has no licence installed, so the portal cannot be used yet. The CEO or a Compliance Officer can install the licence from the vendor.',
    }
  }

  // RESTRICTED: reading and exporting keep working
  if (READ_METHODS.has(m)) return { allowed: true, state }
  if (ALWAYS_ALLOWED.some(a => a.method === m && a.path.test(path))) return { allowed: true, state }
  const why = reason === 'revoked' ? 'The licence has been withdrawn'
    : reason === 'clock' ? 'The server clock appears to have been set back'
    : reason === 'invalid' ? 'The licence on this server cannot be verified'
    : 'The licence has expired'
  return {
    allowed: false, state, code: 'LICENCE_RESTRICTED',
    message: `${why}, so the portal is read-only: you can look at everything and export, but not make changes. A Compliance Officer or the CEO can renew it in Settings → Licence.`,
  }
}

export async function gateRequest(tenantId: string, method: string, originalUrl: string): Promise<GateDecision> {
  if (config.licence.mode === 'off') return { allowed: true, state: 'ACTIVE' }   // development only (config validation forbids it in production)
  const view = await getLicenceView(tenantId)
  const path = originalUrl.split('?')[0].replace(/\/+$/, '')
  return decide(view.state, method, path, view.reason)
}
