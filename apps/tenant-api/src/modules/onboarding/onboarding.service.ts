import {
  getTenantPrisma,
  getSuperAdminPrisma,
} from '@dpdp/database'
import {
  AssetType,
  AssetStatus,
  Criticality,
  Sensitivity,
  LegalBasis,
  PrincipalType,
  TenantRole,
  TenantAuditAction,
} from '@prisma/tenant-client'
import { logTenantAction } from '../../utils/audit-logger'
import { sendTeamInviteEmail } from '../../utils/email'

const db = getTenantPrisma()
const superAdminDb = getSuperAdminPrisma()

// ─── Enum mappers (frontend label → Prisma enum) ─────────────────────────────

const ASSET_TYPE_MAP: Record<string, AssetType> = {
  'Database / Data Store':        AssetType.DATABASE_DATA_STORE,
  'System / Application':         AssetType.SYSTEM_APPLICATION,
  'Data Flow':                    AssetType.DATA_FLOW,
  'Third-Party Vendor':           AssetType.THIRD_PARTY_VENDOR,
  'Consent Mechanism':            AssetType.CONSENT_MECHANISM,
  'Physical / Hardware':          AssetType.PHYSICAL_HARDWARE,
  'API / Integration Layer':      AssetType.API_INTEGRATION,
  'Mobile Application':           AssetType.MOBILE_APPLICATION,
  'Legacy System':                AssetType.LEGACY_SYSTEM,
  'SaaS (Third-Party Hosted)':    AssetType.SAAS_THIRD_PARTY,
  'Outsourced / Managed Service': AssetType.OUTSOURCED_MANAGED,
  'In-House (Cloud Hosted)':      AssetType.IN_HOUSE_CLOUD,
  'In-House (On-Premise)':        AssetType.IN_HOUSE_ON_PREMISE,
  'Third-Party (Cloud Hosted)':   AssetType.THIRD_PARTY_CLOUD,
}

const CRITICALITY_MAP: Record<string, Criticality> = {
  Low:      Criticality.LOW,
  Medium:   Criticality.MEDIUM,
  High:     Criticality.HIGH,
  Critical: Criticality.CRITICAL,
}

const SENSITIVITY_MAP: Record<string, Sensitivity> = {
  Low:      Sensitivity.LOW,
  Medium:   Sensitivity.MEDIUM,
  High:     Sensitivity.HIGH,
  Critical: Sensitivity.CRITICAL,
}

const LEGAL_BASIS_MAP: Record<string, LegalBasis> = {
  'Consent':             LegalBasis.CONSENT,
  'Contract':            LegalBasis.CONTRACT,
  'Legal Obligation':    LegalBasis.LEGAL_OBLIGATION,
  'Legitimate Interest': LegalBasis.LEGITIMATE_INTEREST,
  'Vital Interest':      LegalBasis.VITAL_INTEREST,
}

const PRINCIPAL_TYPE_MAP: Record<string, PrincipalType> = {
  Customer: PrincipalType.CUSTOMER,
  Employee: PrincipalType.EMPLOYEE,
  Vendor:   PrincipalType.VENDOR,
  Minor:    PrincipalType.MINOR,
  Other:    PrincipalType.OTHER,
}

const ASSET_STATUS_MAP: Record<string, AssetStatus> = {
  'Active':       AssetStatus.ACTIVE,
  'Inactive':     AssetStatus.INACTIVE,
  'Under Review': AssetStatus.UNDER_REVIEW,
}

const ROLE_MAP: Record<string, TenantRole> = {
  'Compliance Officer': TenantRole.CO,
  'IT Admin':           TenantRole.IT_ADMIN,
  'Internal Auditor':   TenantRole.INTERNAL_AUDITOR,
  'External Auditor':   TenantRole.EXTERNAL_AUDITOR,
}

// ─── Helper utilities ─────────────────────────────────────────────────────────

function mapAssetType(label: string): AssetType {
  const mapped = ASSET_TYPE_MAP[label]
  if (!mapped) throw new Error(`Unknown asset type: "${label}"`)
  return mapped
}

function mapCriticality(label: string): Criticality {
  return CRITICALITY_MAP[label] ?? Criticality.MEDIUM
}

function mapSensitivity(label: string): Sensitivity {
  return SENSITIVITY_MAP[label] ?? Sensitivity.MEDIUM
}

function mapLegalBasis(label: string): LegalBasis {
  return LEGAL_BASIS_MAP[label] ?? LegalBasis.CONSENT
}

function mapPrincipalType(label: string): PrincipalType {
  return PRINCIPAL_TYPE_MAP[label] ?? PrincipalType.OTHER
}

function mapAssetStatus(label: string): AssetStatus {
  return ASSET_STATUS_MAP[label] ?? AssetStatus.ACTIVE
}

function mapRole(label: string): TenantRole {
  const mapped = ROLE_MAP[label]
  if (!mapped) throw new Error(`Unknown role: "${label}"`)
  return mapped
}

/** Parses volume strings like "500,000" or "1000" into an integer */
function parseVolume(raw: string | number | undefined): number {
  if (typeof raw === 'number') return Math.max(0, Math.floor(raw))
  if (!raw) return 0
  const n = parseInt(String(raw).replace(/,/g, '').trim(), 10)
  return isNaN(n) ? 0 : Math.max(0, n)
}

/** Pads an asset counter into AST-NNN format */
function buildAssetCode(n: number): string {
  return `AST-${String(n).padStart(3, '0')}`
}

/**
 * Returns the highest numeric suffix currently used in this tenant's asset
 * codes, so new codes always increment past the last one ever assigned.
 */
async function getMaxAssetCodeNumber(tenantId: string): Promise<number> {
  const codes = await db.asset.findMany({
    where: { tenantId },
    select: { assetCode: true },
  })
  return codes.reduce((max, { assetCode }) => {
    const n = parseInt(assetCode.replace('AST-', ''), 10)
    return isNaN(n) ? max : Math.max(max, n)
  }, 0)
}

// ─── Input types (exported for controller use) ────────────────────────────────

export interface PiiRecordInput {
  categories: string[]
  sensitivity: string
  purpose: string
  legalBasis: string
  retention: string
  deletionMechanism?: string
  volume: string | number
  crossBorderTransfer: boolean
  crossBorderDestination?: string
  principalType: string
  sharedWithThirdParties: boolean
}

export interface AssetInput {
  name: string
  assetType: string
  description?: string
  assetOwner?: string
  hostingLocation: string
  vendorName?: string
  criticality: string
  internetFacing: boolean
  status: string
  piiRecords: PiiRecordInput[]
}

export interface SupplierInput {
  name: string
  supplierType: string
  contactName?: string
  contactEmail: string
  countryOfOperation: string
  dpaSigned: boolean
  criticality: string
  status: string
  assets: AssetInput[]
}

export interface DepartmentInput {
  /** Local frontend-generated ID — echoed back in the response for ID-mapping */
  id: string
  name: string
  description?: string
  owner?: string
  ownerEmail?: string
  assets: AssetInput[]
  suppliers: SupplierInput[]
}

export interface InviteInput {
  email: string
  role: string
  /** DB department UUIDs obtained from the saveStructure response */
  departmentIds?: string[]
  note?: string
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const onboardingService = {

  // ── GET /onboarding/status ──────────────────────────────────────────────────
  async getStatus(tenantId: string) {
    const tenant = await superAdminDb.tenant.findUnique({
      where: { id: tenantId },
      select: {
        name:           true,
        industry:       true,
        orgSize:        true,
        address:        true,
        contactEmail:   true,
        dpoName:        true,
        dpoEmail:       true,
        classification: true,
        onboardedAt:    true,
        status:         true,
      },
    })
    if (!tenant) throw new Error('Organization not found')

    const [deptCount, assetCount, supplierCount, userCount, pendingInviteCount, departments] =
      await Promise.all([
        db.department.count({ where: { tenantId } }),
        db.asset.count({ where: { tenantId } }),
        db.supplier.count({ where: { tenantId } }),
        db.user.count({ where: { tenantId } }),
        db.userInvitation.count({
          where: { tenantId, acceptedAt: null, expiresAt: { gt: new Date() } },
        }),
        // Returned so frontend can use DB IDs in invite payloads
        db.department.findMany({
          where: { tenantId },
          select: { id: true, name: true },
          orderBy: { createdAt: 'asc' },
        }),
      ])

    return {
      steps: {
        orgDetails:    !!(tenant.industry && tenant.orgSize && tenant.address
                          && tenant.dpoName && tenant.dpoEmail),
        classification: !!tenant.classification,
        orgStructure:  deptCount > 0,
      },
      isComplete: !!tenant.onboardedAt,
      tenant,
      counts: {
        departments:    deptCount,
        assets:         assetCount,
        suppliers:      supplierCount,
        users:          userCount,
        pendingInvites: pendingInviteCount,
      },
      /** Departments with DB IDs so the frontend can map them for invite payloads */
      departments,
    }
  },

  // ── PATCH /onboarding/org-details ──────────────────────────────────────────
  async saveOrgDetails(params: {
    tenantId: string
    userId: string
    data: {
      name: string
      industry: string
      orgSize: string
      address: string
      country: string
      website?: string
      contactEmail: string
      panNumber?: string
      gstNumber?: string
      dpoName: string
      dpoEmail: string
      dpoPhone?: string
      ceoName: string
    }
  }) {
    const updated = await superAdminDb.tenant.update({
      where: { id: params.tenantId },
      data: params.data,
    })

    await logTenantAction({
      tenantId:   params.tenantId,
      userId:     params.userId,
      action:     TenantAuditAction.SETTINGS_UPDATED,
      targetType: 'tenant',
      targetId:   params.tenantId,
      targetName: updated.name,
      details:    { step: 'org_details' },
    })

    return updated
  },

  // ── PATCH /onboarding/classification ───────────────────────────────────────
  async saveClassification(params: {
    tenantId: string
    userId: string
    classification: string
    classUncertain: boolean
  }) {
    const updated = await superAdminDb.tenant.update({
      where: { id: params.tenantId },
      data: {
        classification: params.classification,
        classUncertain: params.classUncertain,
      },
    })

    await logTenantAction({
      tenantId:   params.tenantId,
      userId:     params.userId,
      action:     TenantAuditAction.CLASSIFICATION_CHANGED,
      targetType: 'tenant',
      targetId:   params.tenantId,
      targetName: updated.name,
      details:    { classification: params.classification },
    })

    return updated
  },

  // ── POST /onboarding/structure ─────────────────────────────────────────────
  /**
   * Idempotent — safe to call on every "Continue" press in Step 3.
   *
   * Per call:
   *   Departments  → upsert by (tenantId, name)
   *   Assets & PII → delete existing for that dept, then recreate from payload
   *   Suppliers & their assets/PII → same replace strategy
   *
   * Returns a frontendId → dbId mapping so subsequent invite payloads can
   * use real DB UUIDs for department assignment.
   */
  async saveStructure(params: {
    tenantId:     string
    userId:       string
    departments:  DepartmentInput[]
    ipAddress?:   string
  }) {
    const { tenantId, userId, departments } = params

    if (departments.length === 0) {
      throw new Error('At least one department is required')
    }

    // Validate unique department names in payload
    const deptNames = departments.map(d => d.name.trim()).filter(Boolean)
    if (new Set(deptNames).size !== deptNames.length) {
      throw new Error('Department names must be unique within the payload')
    }

    // Get current max asset code to avoid duplicate codes across repeated saves
    let assetCounter = await getMaxAssetCodeNumber(tenantId)

    const savedDepartments: Array<{ frontendId: string; dbId: string; name: string }> = []

    await db.$transaction(
      async (tx) => {
        for (const deptInput of departments) {
          const deptName = deptInput.name.trim()
          if (!deptName) continue

          // ── 1. Upsert department ──────────────────────────────────────────
          const dept = await tx.department.upsert({
            where:  { tenantId_name: { tenantId, name: deptName } },
            create: { tenantId, name: deptName, description: deptInput.description ?? null },
            update: { description: deptInput.description ?? undefined },
          })

          // ── 2. Replace own assets ─────────────────────────────────────────
          // Safe during onboarding: no assessments or tasks reference these yet.
          const existingAssets = await tx.asset.findMany({
            where:  { tenantId, departmentId: dept.id },
            select: { id: true },
          })
          if (existingAssets.length > 0) {
            await tx.piiRecord.deleteMany({
              where: { assetId: { in: existingAssets.map(a => a.id) } },
            })
            await tx.asset.deleteMany({ where: { tenantId, departmentId: dept.id } })
          }

          for (const assetInput of deptInput.assets) {
            const assetName = assetInput.name.trim()
            if (!assetName) continue

            let mappedType: AssetType
            try {
              mappedType = mapAssetType(assetInput.assetType)
            } catch {
              throw new Error(
                `Department "${deptName}", asset "${assetName}": ` +
                `"${assetInput.assetType}" is not a recognised asset type`
              )
            }

            assetCounter++
            const assetCode = buildAssetCode(assetCounter)

            const allPiiCategories = [
              ...new Set(assetInput.piiRecords.flatMap(p => p.categories)),
            ]

            const asset = await tx.asset.create({
              data: {
                tenantId,
                assetCode,
                name:            assetName,
                assetType:       mappedType,
                description:     assetInput.description?.trim() ?? null,
                departmentId:    dept.id,
                status:          mapAssetStatus(assetInput.status),
                criticality:     mapCriticality(assetInput.criticality),
                hostingLocation: assetInput.hostingLocation?.trim() || 'India',
                internetFacing:  assetInput.internetFacing ?? false,
                vendorName:      assetInput.vendorName?.trim() || null,
                dataCategories:  allPiiCategories,
              },
            })

            if (assetInput.piiRecords.length > 0) {
              await tx.piiRecord.createMany({
                data: assetInput.piiRecords.map(pii => ({
                  tenantId,
                  assetId:               asset.id,
                  categories:            pii.categories,
                  sensitivity:           mapSensitivity(pii.sensitivity),
                  purpose:               pii.purpose,
                  legalBasis:            mapLegalBasis(pii.legalBasis),
                  retention:             pii.retention,
                  deletionMechanism:     pii.deletionMechanism?.trim() ?? null,
                  volume:                parseVolume(pii.volume),
                  crossBorderTransfer:   pii.crossBorderTransfer ?? false,
                  crossBorderDest:       pii.crossBorderDestination?.trim() ?? null,
                  principalType:         mapPrincipalType(pii.principalType),
                  sharedWithThirdParties: pii.sharedWithThirdParties ?? false,
                })),
              })
            }
          }

          // ── 3. Replace suppliers ──────────────────────────────────────────
          const existingSuppliers = await tx.supplier.findMany({
            where:  { tenantId, departmentId: dept.id },
            select: { id: true },
          })
          if (existingSuppliers.length > 0) {
            const supplierIds = existingSuppliers.map(s => s.id)
            const supplierAssets = await tx.supplierAsset.findMany({
              where:  { supplierId: { in: supplierIds } },
              select: { id: true },
            })
            if (supplierAssets.length > 0) {
              await tx.supplierPiiRecord.deleteMany({
                where: { supplierAssetId: { in: supplierAssets.map(sa => sa.id) } },
              })
              await tx.supplierAsset.deleteMany({
                where: { supplierId: { in: supplierIds } },
              })
            }
            await tx.supplier.deleteMany({ where: { tenantId, departmentId: dept.id } })
          }

          for (const supInput of deptInput.suppliers) {
            const supName  = supInput.name.trim()
            const supEmail = supInput.contactEmail?.trim()
            // Both required by DB schema
            if (!supName || !supEmail) continue

            const supplier = await tx.supplier.create({
              data: {
                tenantId,
                name:               supName,
                supplierType:       supInput.supplierType || 'Other',
                contactName:        supInput.contactName?.trim() ?? null,
                contactEmail:       supEmail,
                countryOfOperation: supInput.countryOfOperation?.trim() || 'India',
                dpaSigned:          supInput.dpaSigned ?? false,
                criticality:        mapCriticality(supInput.criticality),
                status:             mapAssetStatus(supInput.status),
                departmentId:       dept.id,
              },
            })

            for (const saInput of supInput.assets) {
              const saName = saInput.name.trim()
              if (!saName) continue

              let saMappedType: AssetType
              try {
                saMappedType = mapAssetType(saInput.assetType)
              } catch {
                throw new Error(
                  `Supplier "${supName}", asset "${saName}": ` +
                  `"${saInput.assetType}" is not a recognised asset type`
                )
              }

              assetCounter++ // Keeps global uniqueness for future code expansion

              const supplierAsset = await tx.supplierAsset.create({
                data: {
                  tenantId,
                  supplierId:      supplier.id,
                  name:            saName,
                  assetType:       saMappedType,
                  description:     saInput.description?.trim() ?? null,
                  criticality:     mapCriticality(saInput.criticality),
                  hostingLocation: saInput.hostingLocation?.trim() || 'India',
                  internetFacing:  saInput.internetFacing ?? false,
                },
              })

              if (saInput.piiRecords.length > 0) {
                await tx.supplierPiiRecord.createMany({
                  data: saInput.piiRecords.map(pii => ({
                    tenantId,
                    supplierAssetId:       supplierAsset.id,
                    categories:            pii.categories,
                    sensitivity:           mapSensitivity(pii.sensitivity),
                    purpose:               pii.purpose,
                    legalBasis:            mapLegalBasis(pii.legalBasis),
                    retention:             pii.retention,
                    deletionMechanism:     pii.deletionMechanism?.trim() ?? null,
                    volume:                parseVolume(pii.volume),
                    crossBorderTransfer:   pii.crossBorderTransfer ?? false,
                    crossBorderDest:       pii.crossBorderDestination?.trim() ?? null,
                    principalType:         mapPrincipalType(pii.principalType),
                    sharedWithThirdParties: pii.sharedWithThirdParties ?? false,
                  })),
                })
              }
            }
          }

          savedDepartments.push({
            frontendId: deptInput.id,
            dbId:       dept.id,
            name:       dept.name,
          })
        }
      },
      { timeout: 30_000 }
    )

    // Audit (outside transaction — failure must not roll back the DB writes)
    const totalAssets    = departments.reduce((s, d) => s + d.assets.length, 0)
    const totalSuppliers = departments.reduce((s, d) => s + d.suppliers.length, 0)

    await logTenantAction({
      tenantId,
      userId,
      action:     TenantAuditAction.DEPARTMENT_CREATED,
      targetType: 'onboarding_structure',
      details: {
        step:        'org_structure',
        departments: savedDepartments.length,
        assets:      totalAssets,
        suppliers:   totalSuppliers,
      },
      ipAddress: params.ipAddress,
    })

    return {
      departments: savedDepartments,
      summary: {
        departments: savedDepartments.length,
        assets:      totalAssets,
        suppliers:   totalSuppliers,
      },
    }
  },

  // ── POST /onboarding/invite ─────────────────────────────────────────────────
  /**
   * Creates UserInvitation records and sends invite emails.
   *
   * Idempotent:
   *   • Skips if the user already has an ACTIVE account.
   *   • Skips if a non-expired, unaccepted invitation already exists.
   *
   * Email failures are logged but do NOT abort the request — the invitation
   * record is still created and can be resent from the Users page.
   */
  async inviteTeamMembers(params: {
    tenantId:   string
    userId:     string
    invites:    InviteInput[]
    ipAddress?: string
  }) {
    const { tenantId, userId, invites } = params

    if (invites.length === 0) {
      return { invited: [], skipped: [], total: 0 }
    }

    // Fetch inviter name and org name for the email body
    const [inviter, tenant] = await Promise.all([
      db.user.findUnique({
        where:  { id: userId },
        select: { name: true },
      }),
      superAdminDb.tenant.findUnique({
        where:  { id: tenantId },
        select: { name: true },
      }),
    ])
    if (!tenant) throw new Error('Organization not found')

    const inviterName = inviter?.name ?? 'Your Compliance Officer'
    const orgName     = tenant.name

    // Validate provided department IDs once — silently drop any that don't exist
    const allDeptIds = [...new Set(invites.flatMap(i => i.departmentIds ?? []))]
    const validDepts = allDeptIds.length > 0
      ? await db.department.findMany({
          where:  { tenantId, id: { in: allDeptIds } },
          select: { id: true },
        })
      : []
    const validDeptIdSet = new Set(validDepts.map(d => d.id))

    const INVITE_EXPIRY_HOURS = 48
    const invited: Array<{ email: string; role: string }> = []
    const skipped: Array<{ email: string; reason: string }> = []

    for (const invite of invites) {
      const email = invite.email.trim().toLowerCase()

      // Guard 1 — user already active
      const existingUser = await db.user.findFirst({
        where:  { tenantId, email, status: 'ACTIVE' },
        select: { id: true },
      })
      if (existingUser) {
        skipped.push({ email, reason: 'User already has an active account' })
        continue
      }

      // Guard 2 — active invitation already exists
      const existingInvite = await db.userInvitation.findFirst({
        where: {
          tenantId,
          email,
          acceptedAt: null,
          expiresAt:  { gt: new Date() },
        },
        select: { id: true },
      })
      if (existingInvite) {
        skipped.push({ email, reason: 'Active invitation already exists' })
        continue
      }

      // Map role
      let role: TenantRole
      try {
        role = mapRole(invite.role)
      } catch {
        skipped.push({ email, reason: `Unknown role "${invite.role}"` })
        continue
      }

      // Filter to only valid dept IDs (unknown IDs are silently dropped)
      const deptIds = (invite.departmentIds ?? []).filter(id => validDeptIdSet.has(id))

      const expiresAt = new Date(Date.now() + INVITE_EXPIRY_HOURS * 60 * 60 * 1000)

      const invitation = await db.userInvitation.create({
        data: {
          tenantId,
          email,
          role,
          note:          invite.note?.trim() ?? null,
          expiresAt,
          invitedById:   userId,
          departmentIds: deptIds,
        },
      })

      // Send email — non-blocking
      try {
        await sendTeamInviteEmail({
          toEmail:     email,
          toName:      email.split('@')[0],
          orgName,
          inviterName,
          role:        invite.role,
          inviteToken: invitation.token,
        })
      } catch (emailErr) {
        // Email failure is not critical — user can be re-invited from the Users page
        console.error(`[onboarding/invite] Email failed for ${email}:`, emailErr)
      }

      await logTenantAction({
        tenantId,
        userId,
        action:     TenantAuditAction.USER_INVITED,
        targetType: 'user_invitation',
        targetId:   invitation.id,
        targetName: email,
        details:    { role, departmentIds: deptIds, note: invite.note ?? null },
        ipAddress:  params.ipAddress,
      })

      invited.push({ email, role: invite.role })
    }

    return {
      invited,
      skipped,
      total: invited.length,
    }
  },

  // ── POST /onboarding/complete ───────────────────────────────────────────────
  async complete(params: {
    tenantId:   string
    userId:     string
    ipAddress?: string
  }) {
    const tenant = await superAdminDb.tenant.findUnique({
      where: { id: params.tenantId },
      select: {
        name:           true,
        industry:       true,
        orgSize:        true,
        address:        true,
        dpoName:        true,
        dpoEmail:       true,
        classification: true,
        onboardedAt:    true,
      },
    })
    if (!tenant) throw new Error('Organization not found')

    // Idempotency — already complete is fine
    if (tenant.onboardedAt) {
      return { message: 'Onboarding already completed', alreadyComplete: true }
    }

    // Validate minimum required fields before marking complete
    const missing: string[] = []
    if (!tenant.industry || !tenant.orgSize || !tenant.address) missing.push('organization details')
    if (!tenant.dpoName || !tenant.dpoEmail)                     missing.push('DPO information')
    if (!tenant.classification)                                   missing.push('regulatory classification')

    const deptCount = await db.department.count({ where: { tenantId: params.tenantId } })
    if (deptCount === 0) missing.push('at least one department in organization structure')

    if (missing.length > 0) {
      throw new Error(
        `Cannot complete onboarding. The following are required: ${missing.join(', ')}.`
      )
    }

    await superAdminDb.tenant.update({
      where: { id: params.tenantId },
      data:  { status: 'ACTIVE', onboardedAt: new Date() },
    })

    await logTenantAction({
      tenantId:   params.tenantId,
      userId:     params.userId,
      action:     TenantAuditAction.ONBOARDING_COMPLETED,
      targetType: 'tenant',
      targetId:   params.tenantId,
      targetName: tenant.name,
      ipAddress:  params.ipAddress,
    })

    return { message: 'Onboarding completed successfully', alreadyComplete: false }
  },
}