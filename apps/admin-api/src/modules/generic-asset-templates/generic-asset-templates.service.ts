import { getSuperAdminPrisma } from '@dpdp/database'
import { AuditAction, Prisma } from '@prisma/super-admin-client'
import { logAuditAction } from '../../utils/audit-logger'

const db = getSuperAdminPrisma()

// Must mirror the AssetType enum in packages/database/prisma/tenant/schema.prisma
// exactly. Kept as a plain list here (not a shared package) rather than a real
// cross-database reference, since GenericAssetTemplate lives in the super-admin
// database and AssetType is defined in the separate tenant database.
export const VALID_ASSET_TYPES = [
  'DATABASE_DATA_STORE', 'SYSTEM_APPLICATION', 'DATA_FLOW', 'THIRD_PARTY_VENDOR',
  'CONSENT_MECHANISM', 'PHYSICAL_HARDWARE', 'API_INTEGRATION', 'MOBILE_APPLICATION',
  'LEGACY_SYSTEM', 'SAAS_THIRD_PARTY', 'OUTSOURCED_MANAGED', 'IN_HOUSE_CLOUD',
  'IN_HOUSE_ON_PREMISE', 'THIRD_PARTY_CLOUD',
] as const

export const genericAssetTemplatesService = {

  async listTemplates(providerId?: string) {
    return db.genericAssetTemplate.findMany({
      where: providerId ? { providerId } : undefined,
      orderBy: [{ provider: { displayName: 'asc' } }, { cloudResourceType: 'asc' }],
      include: {
        provider: { select: { id: true, key: true, displayName: true, category: true } },
      },
    })
  },

  async createTemplate(data: {
    providerId: string; cloudResourceType: string; displayName: string
    assetType: string; defaultCriticality?: string; suggestedDataCategories?: string[]
    status?: 'DRAFT' | 'PUBLISHED'
  }, adminId: string) {
    const provider = await db.cloudProviderType.findUnique({ where: { id: data.providerId } })
    if (!provider) throw new Error('Provider not found')

    if (!VALID_ASSET_TYPES.includes(data.assetType as any)) {
      throw new Error(`"${data.assetType}" is not a recognised asset type`)
    }

    const existing = await db.genericAssetTemplate.findUnique({
      where: { providerId_cloudResourceType: { providerId: data.providerId, cloudResourceType: data.cloudResourceType.trim() } },
    })
    if (existing) throw new Error(`A template for "${data.cloudResourceType}" already exists under ${provider.displayName}`)

    const template = await db.genericAssetTemplate.create({
      data: {
        providerId:              data.providerId,
        cloudResourceType:       data.cloudResourceType.trim(),
        displayName:             data.displayName.trim(),
        assetType:               data.assetType,
        defaultCriticality:      data.defaultCriticality ?? 'MEDIUM',
        suggestedDataCategories: data.suggestedDataCategories ?? [],
        status:                  data.status ?? 'DRAFT',
      },
      include: { provider: { select: { key: true, displayName: true } } },
    })

    await logAuditAction({
      superAdminId: adminId,
      action:     AuditAction.ASSET_TEMPLATE_CREATED,
      targetType: 'generic_asset_template',
      targetId:   template.id,
      targetName: template.displayName,
      details:    { provider: provider.key, cloudResourceType: template.cloudResourceType } as Prisma.InputJsonValue,
    })

    return template
  },

  async updateTemplate(id: string, data: {
    displayName?: string; assetType?: string; defaultCriticality?: string
    suggestedDataCategories?: string[]; status?: 'DRAFT' | 'PUBLISHED'; isActive?: boolean
  }, adminId: string) {
    const existing = await db.genericAssetTemplate.findUnique({ where: { id } })
    if (!existing) throw new Error('Asset template not found')

    if (data.assetType && !VALID_ASSET_TYPES.includes(data.assetType as any)) {
      throw new Error(`"${data.assetType}" is not a recognised asset type`)
    }

    const updated = await db.genericAssetTemplate.update({
      where: { id },
      data: {
        displayName:             data.displayName?.trim() ?? existing.displayName,
        assetType:               data.assetType ?? existing.assetType,
        defaultCriticality:      data.defaultCriticality ?? existing.defaultCriticality,
        suggestedDataCategories: data.suggestedDataCategories ?? undefined,
        status:                  data.status ?? existing.status,
        isActive:                data.isActive ?? existing.isActive,
      },
      include: { provider: { select: { key: true, displayName: true } } },
    })

    await logAuditAction({
      superAdminId: adminId,
      action:     AuditAction.ASSET_TEMPLATE_UPDATED,
      targetType: 'generic_asset_template',
      targetId:   id,
      targetName: updated.displayName,
    })

    return updated
  },

  async deleteTemplate(id: string, adminId: string) {
    const template = await db.genericAssetTemplate.findUnique({
      where: { id },
      include: { provider: { select: { key: true, displayName: true } } },
    })
    if (!template) throw new Error('Asset template not found')

    await db.genericAssetTemplate.delete({ where: { id } })

    await logAuditAction({
      superAdminId: adminId,
      action:     AuditAction.ASSET_TEMPLATE_DELETED,
      targetType: 'generic_asset_template',
      targetId:   id,
      targetName: template.displayName,
      details:    { provider: template.provider.key } as Prisma.InputJsonValue,
    })

    return { success: true }
  },
}
