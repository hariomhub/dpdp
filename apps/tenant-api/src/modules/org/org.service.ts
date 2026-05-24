import { getTenantPrisma, getSuperAdminPrisma } from '@dpdp/database'
import {
  AssetType, AssetStatus, Criticality, Sensitivity,
  LegalBasis, PrincipalType, TenantAuditAction,
} from '@prisma/tenant-client'
import { logTenantAction } from '../../utils/audit-logger'

const db = getTenantPrisma()

// ─── Enum maps (same as onboarding.service) ───────────────────────────────────

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

const mapAssetType = (label: string): AssetType => {
  const v = ASSET_TYPE_MAP[label]
  if (!v) throw new Error(`Unknown asset type: "${label}"`)
  return v
}
const mapCrit   = (v: string) => ({ Low: Criticality.LOW, Medium: Criticality.MEDIUM, High: Criticality.HIGH, Critical: Criticality.CRITICAL } as Record<string, Criticality>)[v] ?? Criticality.MEDIUM
const mapSens   = (v: string) => ({ Low: Sensitivity.LOW, Medium: Sensitivity.MEDIUM, High: Sensitivity.HIGH, Critical: Sensitivity.CRITICAL } as Record<string, Sensitivity>)[v] ?? Sensitivity.MEDIUM
const mapLegal  = (v: string) => ({ Consent: LegalBasis.CONSENT, Contract: LegalBasis.CONTRACT, 'Legal Obligation': LegalBasis.LEGAL_OBLIGATION, 'Legitimate Interest': LegalBasis.LEGITIMATE_INTEREST, 'Vital Interest': LegalBasis.VITAL_INTEREST } as Record<string, LegalBasis>)[v] ?? LegalBasis.CONSENT
const mapPrinc  = (v: string) => ({ Customer: PrincipalType.CUSTOMER, Employee: PrincipalType.EMPLOYEE, Vendor: PrincipalType.VENDOR, Minor: PrincipalType.MINOR, Other: PrincipalType.OTHER } as Record<string, PrincipalType>)[v] ?? PrincipalType.OTHER
const mapStatus = (v: string) => ({ Active: AssetStatus.ACTIVE, Inactive: AssetStatus.INACTIVE, 'Under Review': AssetStatus.UNDER_REVIEW } as Record<string, AssetStatus>)[v] ?? AssetStatus.ACTIVE

async function nextAssetCode(tenantId: string): Promise<string> {
  const codes = await db.asset.findMany({ where: { tenantId }, select: { assetCode: true } })
  const max = codes.reduce((m, { assetCode }) => {
    const n = parseInt(assetCode.replace('AST-', ''), 10)
    return isNaN(n) ? m : Math.max(m, n)
  }, 0)
  return `AST-${String(max + 1).padStart(3, '0')}`
}

function parseVolume(raw: string | number | undefined): number {
  if (typeof raw === 'number') return Math.max(0, Math.floor(raw))
  if (!raw) return 0
  const n = parseInt(String(raw).replace(/,/g, '').trim(), 10)
  return isNaN(n) ? 0 : Math.max(0, n)
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const orgService = {

  // ════════════ DEPARTMENTS ════════════════════════════════════════════════════

  async listDepartments(tenantId: string) {
    const depts = await db.department.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'asc' },
      include: {
        assets: {
          include: { piiRecords: true },
        },
        suppliers: {
          include: {
            supplierAssets: {
              include: { piiRecords: true },
            },
          },
        },
      },
    })
    return depts
  },

  async createDepartment(tenantId: string, userId: string, data: {
    name: string; description?: string
  }) {
    const existing = await db.department.findFirst({
      where: { tenantId, name: data.name.trim() },
    })
    if (existing) throw new Error(`Department "${data.name}" already exists`)

    const dept = await db.department.create({
      data: { tenantId, name: data.name.trim(), description: data.description?.trim() ?? null },
    })

    await logTenantAction({
      tenantId, userId,
      action:     TenantAuditAction.DEPARTMENT_CREATED,
      targetType: 'department',
      targetId:   dept.id,
      targetName: dept.name,
    })

    return dept
  },

  async updateDepartment(tenantId: string, userId: string, deptId: string, data: {
    name?: string; description?: string
  }) {
    const dept = await db.department.findFirst({ where: { tenantId, id: deptId } })
    if (!dept) throw new Error('Department not found')

    if (data.name && data.name.trim() !== dept.name) {
      const existing = await db.department.findFirst({
        where: { tenantId, name: data.name.trim(), id: { not: deptId } },
      })
      if (existing) throw new Error(`Department "${data.name}" already exists`)
    }

    const updated = await db.department.update({
      where: { id: deptId },
      data: {
        name:        data.name?.trim() ?? dept.name,
        description: data.description !== undefined ? (data.description?.trim() || null) : dept.description,
      },
    })

    await logTenantAction({
      tenantId, userId,
      action: TenantAuditAction.DEPARTMENT_UPDATED,
      targetType: 'department', targetId: deptId, targetName: updated.name,
    })

    return updated
  },

  async deleteDepartment(tenantId: string, userId: string, deptId: string) {
    const dept = await db.department.findFirst({
      where: { tenantId, id: deptId },
      include: { assets: { select: { id: true } }, suppliers: { select: { id: true } } },
    })
    if (!dept) throw new Error('Department not found')

    if (dept.assets.length > 0)
      throw new Error(`Cannot delete: department has ${dept.assets.length} asset(s). Remove them first.`)
    if (dept.suppliers.length > 0)
      throw new Error(`Cannot delete: department has ${dept.suppliers.length} supplier(s). Remove them first.`)

    await db.department.delete({ where: { id: deptId } })

    await logTenantAction({
      tenantId, userId,
      action: TenantAuditAction.DEPARTMENT_DELETED,
      targetType: 'department', targetId: deptId, targetName: dept.name,
    })

    return { success: true }
  },

  // ════════════ OWN ASSETS ═════════════════════════════════════════════════════

  async createAsset(tenantId: string, userId: string, deptId: string, data: {
    name: string; assetType: string; description?: string; hostingLocation: string
    vendorName?: string; criticality: string; internetFacing: boolean; status: string
  }) {
    const dept = await db.department.findFirst({ where: { tenantId, id: deptId } })
    if (!dept) throw new Error('Department not found')

    const assetCode = await nextAssetCode(tenantId)

    const asset = await db.asset.create({
      data: {
        tenantId,
        assetCode,
        name:            data.name.trim(),
        assetType:       mapAssetType(data.assetType),
        description:     data.description?.trim() ?? null,
        departmentId:    deptId,
        status:          mapStatus(data.status),
        criticality:     mapCrit(data.criticality),
        hostingLocation: data.hostingLocation?.trim() || 'India',
        internetFacing:  data.internetFacing ?? false,
        vendorName:      data.vendorName?.trim() || null,
        dataCategories:  [],
      },
    })

    await logTenantAction({
      tenantId, userId,
      action: TenantAuditAction.ASSET_CREATED,
      targetType: 'asset', targetId: asset.id, targetName: asset.name,
      details: { assetCode, deptId },
    })

    return asset
  },

  async updateAsset(tenantId: string, userId: string, assetId: string, data: {
    name?: string; description?: string; hostingLocation?: string; ownerId?: string | null
    vendorName?: string; criticality?: string; internetFacing?: boolean; status?: string
  }) {
    const asset = await db.asset.findFirst({ where: { tenantId, id: assetId } })
    if (!asset) throw new Error('Asset not found')

    const updated = await db.asset.update({
      where: { id: assetId },
      data: {
        name:            data.name?.trim() ?? asset.name,
        description:     data.description !== undefined ? (data.description?.trim() || null) : asset.description,
        hostingLocation: data.hostingLocation?.trim() ?? asset.hostingLocation,
        ownerId:         data.ownerId !== undefined ? (data.ownerId ?? null) : asset.ownerId,
        vendorName:      data.vendorName !== undefined ? (data.vendorName?.trim() || null) : asset.vendorName,
        criticality:     data.criticality ? mapCrit(data.criticality) : asset.criticality,
        internetFacing:  data.internetFacing !== undefined ? data.internetFacing : asset.internetFacing,
        status:          data.status ? mapStatus(data.status) : asset.status,
      },
    })

    await logTenantAction({
      tenantId, userId,
      action: TenantAuditAction.ASSET_UPDATED,
      targetType: 'asset', targetId: assetId, targetName: updated.name,
    })

    return updated
  },

  async deleteAsset(tenantId: string, userId: string, assetId: string) {
    const asset = await db.asset.findFirst({
      where: { tenantId, id: assetId },
      include: {
        assessmentAssets: { select: { assessmentId: true } },
        complianceTasks:  { select: { id: true } },
      },
    })
    if (!asset) throw new Error('Asset not found')

    if (asset.assessmentAssets.length > 0)
      throw new Error('Cannot delete: asset is referenced by one or more assessments.')
    if (asset.complianceTasks.length > 0)
      throw new Error('Cannot delete: asset has associated compliance tasks.')

    // Cascade PII records first (Restrict constraint doesn't exist on piiRecords)
    await db.piiRecord.deleteMany({ where: { assetId } })
    await db.asset.delete({ where: { id: assetId } })

    await logTenantAction({
      tenantId, userId,
      action: TenantAuditAction.ASSET_DEACTIVATED,
      targetType: 'asset', targetId: assetId, targetName: asset.name,
      details: { deleted: true },
    })

    return { success: true }
  },

  // ════════════ PII RECORDS ════════════════════════════════════════════════════

  async listPiiRecords(tenantId: string, assetId: string) {
    const asset = await db.asset.findFirst({ where: { tenantId, id: assetId } })
    if (!asset) throw new Error('Asset not found')
    return db.piiRecord.findMany({ where: { assetId }, orderBy: { createdAt: 'asc' } })
  },

  async createPiiRecord(tenantId: string, userId: string, assetId: string, data: {
    categories: string[]; sensitivity: string; purpose: string; legalBasis: string
    retention: string; deletionMechanism?: string; volume: string | number
    crossBorderTransfer: boolean; crossBorderDestination?: string
    principalType: string; sharedWithThirdParties: boolean
  }) {
    const asset = await db.asset.findFirst({ where: { tenantId, id: assetId } })
    if (!asset) throw new Error('Asset not found')

    const record = await db.piiRecord.create({
      data: {
        tenantId,
        assetId,
        categories:            data.categories,
        sensitivity:           mapSens(data.sensitivity),
        purpose:               data.purpose,
        legalBasis:            mapLegal(data.legalBasis),
        retention:             data.retention,
        deletionMechanism:     data.deletionMechanism?.trim() ?? null,
        volume:                parseVolume(data.volume),
        crossBorderTransfer:   data.crossBorderTransfer ?? false,
        crossBorderDest:       data.crossBorderDestination?.trim() ?? null,
        principalType:         mapPrinc(data.principalType),
        sharedWithThirdParties: data.sharedWithThirdParties ?? false,
      },
    })

    // Update asset's dataCategories
    const allCategories = [...new Set([...asset.dataCategories, ...data.categories])]
    await db.asset.update({ where: { id: assetId }, data: { dataCategories: allCategories } })

    await logTenantAction({
      tenantId, userId,
      action: TenantAuditAction.PII_RECORD_CREATED,
      targetType: 'pii_record', targetId: record.id, targetName: asset.name,
    })

    return record
  },

  async updatePiiRecord(tenantId: string, userId: string, recordId: string, data: Partial<{
    categories: string[]; sensitivity: string; purpose: string; legalBasis: string
    retention: string; deletionMechanism?: string; volume: string | number
    crossBorderTransfer: boolean; crossBorderDestination?: string
    principalType: string; sharedWithThirdParties: boolean
  }>) {
    const record = await db.piiRecord.findFirst({
      where: { id: recordId, tenantId },
    })
    if (!record) throw new Error('PII record not found')

    const updated = await db.piiRecord.update({
      where: { id: recordId },
      data: {
        categories:            data.categories ?? record.categories,
        sensitivity:           data.sensitivity ? mapSens(data.sensitivity) : record.sensitivity,
        purpose:               data.purpose ?? record.purpose,
        legalBasis:            data.legalBasis ? mapLegal(data.legalBasis) : record.legalBasis,
        retention:             data.retention ?? record.retention,
        deletionMechanism:     data.deletionMechanism !== undefined ? (data.deletionMechanism?.trim() || null) : record.deletionMechanism,
        volume:                data.volume !== undefined ? parseVolume(data.volume) : record.volume,
        crossBorderTransfer:   data.crossBorderTransfer ?? record.crossBorderTransfer,
        crossBorderDest:       data.crossBorderDestination !== undefined ? (data.crossBorderDestination?.trim() || null) : record.crossBorderDest,
        principalType:         data.principalType ? mapPrinc(data.principalType) : record.principalType,
        sharedWithThirdParties: data.sharedWithThirdParties ?? record.sharedWithThirdParties,
      },
    })

    await logTenantAction({
      tenantId, userId,
      action: TenantAuditAction.PII_RECORD_UPDATED,
      targetType: 'pii_record', targetId: recordId,
    })

    return updated
  },

  async deletePiiRecord(tenantId: string, userId: string, recordId: string) {
    const record = await db.piiRecord.findFirst({ where: { id: recordId, tenantId } })
    if (!record) throw new Error('PII record not found')

    await db.piiRecord.delete({ where: { id: recordId } })

    await logTenantAction({
      tenantId, userId,
      action: TenantAuditAction.PII_RECORD_DELETED,
      targetType: 'pii_record', targetId: recordId,
    })

    return { success: true }
  },

  // ════════════ SUPPLIERS ══════════════════════════════════════════════════════

  async createSupplier(tenantId: string, userId: string, deptId: string, data: {
    name: string; supplierType: string; contactName?: string; contactEmail: string
    countryOfOperation: string; dpaSigned: boolean; criticality: string; status: string
  }) {
    const dept = await db.department.findFirst({ where: { tenantId, id: deptId } })
    if (!dept) throw new Error('Department not found')

    const supplier = await db.supplier.create({
      data: {
        tenantId,
        name:               data.name.trim(),
        supplierType:       data.supplierType || 'Other',
        contactName:        data.contactName?.trim() ?? null,
        contactEmail:       data.contactEmail.trim(),
        countryOfOperation: data.countryOfOperation?.trim() || 'India',
        dpaSigned:          data.dpaSigned ?? false,
        criticality:        mapCrit(data.criticality),
        status:             mapStatus(data.status),
        departmentId:       deptId,
      },
    })

    await logTenantAction({
      tenantId, userId,
      action: TenantAuditAction.SUPPLIER_CREATED,
      targetType: 'supplier', targetId: supplier.id, targetName: supplier.name,
    })

    return supplier
  },

  async updateSupplier(tenantId: string, userId: string, supplierId: string, data: Partial<{
    name: string; supplierType: string; contactName?: string; contactEmail: string
    countryOfOperation: string; dpaSigned: boolean; criticality: string; status: string
  }>) {
    const supplier = await db.supplier.findFirst({ where: { tenantId, id: supplierId } })
    if (!supplier) throw new Error('Supplier not found')

    const updated = await db.supplier.update({
      where: { id: supplierId },
      data: {
        name:               data.name?.trim() ?? supplier.name,
        supplierType:       data.supplierType ?? supplier.supplierType,
        contactName:        data.contactName !== undefined ? (data.contactName?.trim() || null) : supplier.contactName,
        contactEmail:       data.contactEmail?.trim() ?? supplier.contactEmail,
        countryOfOperation: data.countryOfOperation?.trim() ?? supplier.countryOfOperation,
        dpaSigned:          data.dpaSigned !== undefined ? data.dpaSigned : supplier.dpaSigned,
        criticality:        data.criticality ? mapCrit(data.criticality) : supplier.criticality,
        status:             data.status ? mapStatus(data.status) : supplier.status,
      },
    })

    await logTenantAction({
      tenantId, userId,
      action: TenantAuditAction.SUPPLIER_UPDATED,
      targetType: 'supplier', targetId: supplierId, targetName: updated.name,
    })

    return updated
  },

  async deleteSupplier(tenantId: string, userId: string, supplierId: string) {
    const supplier = await db.supplier.findFirst({
      where: { tenantId, id: supplierId },
      include: { supplierAssets: { include: { piiRecords: { select: { id: true } } } } },
    })
    if (!supplier) throw new Error('Supplier not found')

    // Cascade: delete supplier PII → supplier assets → supplier
    for (const sa of supplier.supplierAssets) {
      await db.supplierPiiRecord.deleteMany({ where: { supplierAssetId: sa.id } })
    }
    await db.supplierAsset.deleteMany({ where: { supplierId } })
    await db.supplier.delete({ where: { id: supplierId } })

    await logTenantAction({
      tenantId, userId,
      action: TenantAuditAction.SUPPLIER_DELETED,
      targetType: 'supplier', targetId: supplierId, targetName: supplier.name,
    })

    return { success: true }
  },

  // ════════════ SUPPLIER ASSETS ════════════════════════════════════════════════

  async createSupplierAsset(tenantId: string, userId: string, supplierId: string, data: {
    name: string; assetType: string; description?: string
    hostingLocation?: string; criticality: string; internetFacing: boolean
  }) {
    const supplier = await db.supplier.findFirst({ where: { tenantId, id: supplierId } })
    if (!supplier) throw new Error('Supplier not found')

    const sa = await db.supplierAsset.create({
      data: {
        tenantId,
        supplierId,
        name:            data.name.trim(),
        assetType:       mapAssetType(data.assetType),
        description:     data.description?.trim() ?? null,
        criticality:     mapCrit(data.criticality),
        hostingLocation: data.hostingLocation?.trim() || 'India',
        internetFacing:  data.internetFacing ?? false,
      },
    })

    return sa
  },

  async deleteSupplierAsset(tenantId: string, userId: string, saId: string) {
    const sa = await db.supplierAsset.findFirst({ where: { tenantId, id: saId } })
    if (!sa) throw new Error('Supplier asset not found')

    await db.supplierPiiRecord.deleteMany({ where: { supplierAssetId: saId } })
    await db.supplierAsset.delete({ where: { id: saId } })

    return { success: true }
  },
}
