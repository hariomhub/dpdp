import { getTenantPrisma } from '@dpdp/database'
import { LicenceFacts, LicenceStatus, evaluateLicence, loadTrustKeys, verifyLicence } from '@dpdp/platform'
import { TtlCache } from '../utils/ttl-cache'
import { config } from '../config'

/**
 * Reading the installed licence.
 *
 * The facts that decide access (validity dates, grace period) are taken from the SIGNED TOKEN, re-verified here - not
 * from the plain columns beside it - so editing the database cannot extend a licence. Only `revokedAt` and `lastSeenAt`
 * (which the instance itself maintains) come from columns.
 */
const STATUS_TTL_MS = 30_000
/** The "latest time seen" is only written this often - it exists to notice a clock wound back, not to track every request. */
const LAST_SEEN_WRITE_EVERY_MS = 60 * 60 * 1000

export interface InstalledLicence {
  facts: LicenceFacts
  plan: string
  limits: { maxUsers: number; maxAssessments: number; storageGb: number }
  airGapped: boolean
  updatesUntil: Date
  licenceId: string
  /** true when the stored token no longer verifies (its signing key is not trusted any more, or it was altered) */
  invalid: boolean
}

export async function readInstalledLicence(tenantId: string): Promise<InstalledLicence | null> {
  const row = await getTenantPrisma().platformLicence.findUnique({ where: { tenantId } })
  if (!row) return null
  try {
    const p = verifyLicence(row.token, loadTrustKeys(process.env))
    return {
      facts: {
        validFrom: new Date(p.validFrom * 1000), validUntil: new Date(p.validUntil * 1000), graceDays: p.graceDays,
        revokedAt: row.revokedAt, lastSeenAt: row.lastSeenAt,
      },
      plan: p.plan, limits: p.limits, airGapped: p.airGapped, updatesUntil: new Date(p.updatesUntil * 1000), licenceId: p.lid, invalid: false,
    }
  } catch {
    // The signature no longer verifies (key removed from the trust list, or the token was altered). A licence WAS installed,
    // so this is not "never licensed": the customer keeps read-only access to their data (see load()).
    return {
      facts: { validFrom: row.validFrom, validUntil: row.validUntil, graceDays: row.graceDays, revokedAt: row.revokedAt, lastSeenAt: row.lastSeenAt },
      plan: row.plan, limits: row.limits as any, airGapped: row.airGapped, updatesUntil: row.updatesUntil, licenceId: row.licenceId, invalid: true,
    }
  }
}

export interface LicenceView extends LicenceStatus {
  /** 'enforce' normally; 'off' only in development, where licences are not checked */
  mode: 'enforce' | 'off'
  plan?: string
  limits?: InstalledLicence['limits']
  updatesUntil?: Date
}

async function load(tenantId: string): Promise<LicenceView> {
  const mode = config.licence.mode
  const installed = await readInstalledLicence(tenantId)
  const status: LicenceStatus = installed?.invalid
    ? { state: 'RESTRICTED', reason: 'invalid' }
    : evaluateLicence(installed?.facts, new Date())

  // Remember the latest time this instance has seen (monotonic), so winding the clock back cannot revive an expired licence.
  if (installed && !installed.invalid && status.state !== 'UNLICENSED') {
    const lastSeen = installed.facts.lastSeenAt?.getTime() ?? 0
    const now = Date.now()
    if (now - lastSeen > LAST_SEEN_WRITE_EVERY_MS) {
      await getTenantPrisma().platformLicence.updateMany({ where: { tenantId }, data: { lastSeenAt: new Date(now) } }).catch(() => undefined)
    }
  }
  return { ...status, mode, plan: installed?.plan, limits: installed?.limits, updatesUntil: installed?.updatesUntil }
}

const cache = new TtlCache<LicenceView>(load, STATUS_TTL_MS)

/** The licence state for one organisation (cached for a short time). */
export function getLicenceView(tenantId: string): Promise<LicenceView> {
  return cache.get(tenantId)
}

/** Forget the cached state (right after installing a licence, and in tests). */
export function resetLicenceCache(tenantId?: string): void {
  cache.invalidate(tenantId)
}
