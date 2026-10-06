import { randomBytes } from 'crypto'
import { getTenantPrisma } from '@dpdp/database'
import { TenantAuditAction } from '@prisma/tenant-client'
import { LicenceError, LicencePayload, LicenceStatus, evaluateLicence, loadTrustKeys, peekKeyId, verifyLicence } from '@dpdp/platform'
import { HttpError } from '../utils/http-error'
import { logTenantAction } from '../utils/audit-logger'
import { sendTeamInviteEmail } from '../utils/email'
import { config } from '../config'
import { resetLicenceCache } from './licence-store'

/**
 * Installing a licence: first activation of a fresh deployment, and renewal afterwards.
 *
 * The licence (issued and signed by the control plane, verified here offline) carries the organisation's details, so a
 * freshly installed instance can create its own organisation record and invite its first CEO without ever contacting
 * the vendor. It works the same in the customer's cloud, on-prem, and air-gapped.
 */
const INVITE_DAYS = 14

export interface InstallResult {
  organization: { id: string; name: string }
  firstActivation: boolean
  licence: LicenceStatus
  /** present only when this call created a CEO invitation (shown to whoever is installing, and emailed if mail is set up) */
  ceoInvite?: { email: string; url: string; expiresAt: Date }
}

const db = () => getTenantPrisma()

function readLicence(token: string): LicencePayload {
  try {
    return verifyLicence(token, loadTrustKeys(process.env))
  } catch (err) {
    if (err instanceof LicenceError) throw HttpError.badRequest(err.message)
    throw err
  }
}

export async function installLicence(token: string, opts: {
  /** a fresh deployment may be activated without anybody signed in; a renewal requires the caller to belong to this organisation */
  allowFirstActivation: boolean
  /** renewal: the licence must be for this organisation */
  expectTenantId?: string
  actorId?: string
  now?: Date
}): Promise<InstallResult> {
  const now = opts.now ?? new Date()
  const p = readLicence(token)
  const orgId = p.org.id

  if (opts.expectTenantId && orgId !== opts.expectTenantId) throw HttpError.badRequest('This licence was issued for a different organization.')

  const facts = { validFrom: new Date(p.validFrom * 1000), validUntil: new Date(p.validUntil * 1000), graceDays: p.graceDays }
  const status = evaluateLicence(facts, now)
  if (status.state === 'RESTRICTED') throw HttpError.badRequest('This licence has already expired. Ask for a new one.')

  const [profile, current] = await Promise.all([
    db().tenantProfile.findUnique({ where: { id: orgId } }),
    db().platformLicence.findUnique({ where: { tenantId: orgId } }),
  ])
  if (!profile && !opts.allowFirstActivation) throw HttpError.badRequest('This deployment belongs to a different organization.')

  // The same licence again is fine (start-up re-installs the configured one); an OLDER one must not replace a newer one.
  if (current?.licenceId === p.lid) {
    resetLicenceCache(orgId)
    return { organization: { id: orgId, name: profile?.name ?? p.org.name }, firstActivation: false, licence: status }
  }
  if (current && p.iat < Math.floor(current.issuedAt.getTime() / 1000)) {
    throw HttpError.badRequest('A newer licence is already installed. This one is older and was not applied.')
  }

  const kid = peekKeyId(token) ?? ''
  const result = await db().$transaction(async tx => {
    let created = false
    if (!profile) {
      created = true
      await tx.tenantProfile.create({
        data: {
          id: orgId, tenantCode: p.org.code, name: p.org.name, industry: p.org.industry ?? '', orgSize: p.org.orgSize ?? '', address: p.org.address ?? '',
          country: p.org.country || 'India', website: p.org.website ?? null, contactEmail: p.org.contactEmail,
          dpoName: p.org.dpoName ?? '', dpoEmail: p.org.dpoEmail ?? '', dpoPhone: p.org.dpoPhone ?? null,
          panNumber: p.org.panNumber ?? null, gstNumber: p.org.gstNumber ?? null,
          classification: p.org.classification, classUncertain: p.org.classUncertain, ceoName: p.org.ceoName, ceoEmail: p.org.ceoEmail, plan: p.plan,
        },
      })
    } else {
      // Renewal: the licence updates the plan. Details the customer has since edited (address, DPO, ...) are theirs and stay.
      await tx.tenantProfile.update({ where: { id: orgId }, data: { plan: p.plan } })
    }

    // Classifications under each regulation come with the licence; one the organisation already has is left as it is.
    for (const c of p.classifications ?? []) {
      await tx.tenantRegulationClassification.upsert({
        where: { tenantId_regulationId: { tenantId: orgId, regulationId: c.regulationId } },
        create: { tenantId: orgId, regulationId: c.regulationId, applicabilityCategoryId: c.applicabilityCategoryId, isUncertain: c.isUncertain },
        update: {},
      })
    }

    const record = {
      licenceId: p.lid, token: token.trim(), keyId: kid, plan: p.plan,
      issuedAt: new Date(p.iat * 1000), validFrom: facts.validFrom, validUntil: facts.validUntil, updatesUntil: new Date(p.updatesUntil * 1000),
      graceDays: p.graceDays, airGapped: p.airGapped, limits: p.limits as any, entitlements: p.entitlements as any,
      revokedAt: null, lastSeenAt: now,
    }
    await tx.platformLicence.upsert({ where: { tenantId: orgId }, create: { tenantId: orgId, ...record }, update: record })

    // The first CEO is invited by this instance - only if there is no CEO yet and no invitation already waiting.
    let invite: InstallResult['ceoInvite']
    const fresh = await tx.tenantProfile.findUniqueOrThrow({ where: { id: orgId } })
    const ceoExists = (await tx.user.count({ where: { tenantId: orgId, role: 'CEO' } })) > 0
    const waiting = !!fresh.inviteToken && !!fresh.inviteExpiresAt && fresh.inviteExpiresAt > now
    if (!ceoExists && !fresh.inviteAcceptedAt && !waiting) {
      const inviteToken = randomBytes(24).toString('base64url')
      const expiresAt = new Date(now.getTime() + INVITE_DAYS * 24 * 3600 * 1000)
      await tx.tenantProfile.update({ where: { id: orgId }, data: { inviteToken, inviteExpiresAt: expiresAt } })
      invite = { email: fresh.ceoEmail, url: `${config.platform.tenantAppUrl || ''}/invite/${inviteToken}`, expiresAt }
    }
    return { created, invite, name: fresh.name }
  })

  resetLicenceCache(orgId)
  await logTenantAction({
    tenantId: orgId, userId: opts.actorId,
    action: result.created ? TenantAuditAction.INSTANCE_ACTIVATED : TenantAuditAction.LICENCE_INSTALLED,
    targetType: 'licence', targetId: p.lid, targetName: result.name,
    details: { plan: p.plan, validUntil: facts.validUntil.toISOString(), keyId: kid, ceoInvited: !!result.invite },
  })

  if (result.invite) {
    // Best effort: where mail is not set up (or fails) the person installing still sees the link on screen.
    sendTeamInviteEmail({
      toEmail: result.invite.email, toName: p.org.ceoName, orgName: result.name, inviterName: 'NiyamSaathi',
      role: 'Organization CEO', inviteToken: result.invite.url.split('/invite/')[1],
    }).catch(err => console.error('[activation] could not email the CEO invitation:', err?.message ?? err))
  }

  return { organization: { id: orgId, name: result.name }, firstActivation: result.created, licence: status, ...(result.invite ? { ceoInvite: result.invite } : {}) }
}
