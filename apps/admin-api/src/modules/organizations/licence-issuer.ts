import * as fs from 'fs'
import { getSuperAdminPrisma } from '@dpdp/database'
import { AuditAction, OrgStatus } from '@prisma/super-admin-client'
import { LICENCE_FORMAT_VERSION, LicencePayload, signLicence } from '@dpdp/platform'
import { randomUUID } from 'crypto'
import { config } from '../../config'
import { logAuditAction } from '../../utils/audit-logger'
import { HttpError } from '../../utils/http-error'

/**
 * Issuing a customer's signed licence. The licence is what turns an installed instance into that customer's working
 * deployment (docs/architecture/01-architecture.md, section 8): it names the organisation, the plan and limits, the
 * licensed term, and carries the CEO's details so the instance can invite its first CEO by itself. It is verified offline
 * by the instance, so it works the same in the customer's cloud, on-prem and air-gapped.
 */
const db = getSuperAdminPrisma()
const DAY = 24 * 3600 * 1000

function signingKey(): string {
  const inline = config.licence.signingKey.replace(/\\n/g, '\n').trim()
  if (inline) return inline
  if (config.licence.signingKeyFile) {
    try { return fs.readFileSync(config.licence.signingKeyFile, 'utf8') } catch { /* reported below */ }
  }
  throw HttpError.unavailable('Licence signing is not configured on this server (LICENCE_SIGNING_KEY / LICENCE_SIGNING_KEY_FILE and LICENCE_KEY_ID).')
}

export async function issueLicence(params: {
  tenantId: string
  adminId?: string
  /** issue for a site that never connects to the internet: longer grace period */
  airGapped?: boolean
  /** renewal: move the end of the term forward by this many months (from the later of today and the current end) */
  extendMonths?: number
  ipAddress?: string
}) {
  if (!config.licence.keyId) throw HttpError.unavailable('LICENCE_KEY_ID is not set, so licences cannot be signed.')
  const key = signingKey()

  const org = await db.tenant.findUnique({ where: { id: params.tenantId }, include: { licenseKey: true } })
  if (!org) throw HttpError.notFound('Organization not found')
  if (!org.licenseKey) throw HttpError.badRequest('This organization has no licence record to issue from.')
  if (org.status === OrgStatus.SUSPENDED || org.status === OrgStatus.INACTIVE) {
    throw HttpError.badRequest('This organization is suspended or inactive. Activate it before issuing a licence.')
  }

  let expiresAt = org.licenseKey.expiresAt
  if (params.extendMonths) {
    const from = new Date(Math.max(Date.now(), expiresAt.getTime()))
    const next = new Date(from)
    next.setMonth(next.getMonth() + params.extendMonths)
    expiresAt = next
    await db.licenseKey.update({ where: { id: org.licenseKey.id }, data: { expiresAt } })
  }

  const classifications = await db.tenantRegulationClassification.findMany({
    where: { tenantId: org.id }, select: { regulationId: true, applicabilityCategoryId: true, isUncertain: true },
  })

  const now = Date.now()
  const payload: LicencePayload = {
    v: LICENCE_FORMAT_VERSION, lid: randomUUID(), iss: config.licence.issuer, iat: Math.floor(now / 1000),
    org: {
      id: org.id, code: org.tenantCode, name: org.name, industry: org.industry, orgSize: org.orgSize, address: org.address, country: org.country,
      website: org.website, contactEmail: org.contactEmail, dpoName: org.dpoName, dpoEmail: org.dpoEmail, dpoPhone: org.dpoPhone,
      panNumber: org.panNumber, gstNumber: org.gstNumber, classification: org.classification, classUncertain: org.classUncertain,
      ceoName: org.ceoName, ceoEmail: org.ceoEmail,
    },
    classifications,
    plan: org.plan,
    limits: { maxUsers: org.licenseKey.maxUsers, maxAssessments: org.licenseKey.maxAssessments, storageGb: org.licenseKey.storageGb },
    entitlements: { regulations: '*', features: [] },
    validFrom: Math.floor((now - DAY) / 1000),
    validUntil: Math.floor(expiresAt.getTime() / 1000),
    updatesUntil: Math.floor(expiresAt.getTime() / 1000),
    graceDays: params.airGapped ? 60 : 30,
    airGapped: !!params.airGapped,
  }
  const licence = signLicence(payload, key, config.licence.keyId)

  await logAuditAction({
    superAdminId: params.adminId, tenantId: org.id, action: AuditAction.LICENCE_ISSUED, targetType: 'tenant', targetId: org.id, targetName: org.name,
    details: { licenceId: payload.lid, validUntil: expiresAt.toISOString(), airGapped: !!params.airGapped, extendedMonths: params.extendMonths ?? 0, keyId: config.licence.keyId } as any,
    ipAddress: params.ipAddress,
  })

  return { licence, licenceId: payload.lid, validUntil: expiresAt, keyId: config.licence.keyId, organization: { id: org.id, name: org.name } }
}
