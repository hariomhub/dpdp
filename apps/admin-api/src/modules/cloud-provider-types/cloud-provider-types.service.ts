import { getSuperAdminPrisma } from '@dpdp/database'
import { AuditAction, Prisma } from '@prisma/super-admin-client'
import { logAuditAction } from '../../utils/audit-logger'

const db = getSuperAdminPrisma()

export const cloudProviderTypesService = {

  async listProviders() {
    return db.cloudProviderType.findMany({
      orderBy: [{ category: 'asc' }, { displayName: 'asc' }],
      include: {
        _count: { select: { assetTemplates: true } },
      },
    })
  },

  async createProvider(data: {
    key: string; displayName: string; category: string
    credentialSchema: object; logoUrl?: string; docsUrl?: string
  }, adminId: string) {
    const existing = await db.cloudProviderType.findUnique({ where: { key: data.key.trim() } })
    if (existing) throw new Error(`Provider "${data.key}" already exists`)

    const provider = await db.cloudProviderType.create({
      data: {
        key:              data.key.trim(),
        displayName:      data.displayName.trim(),
        category:         data.category as any,
        isActive:         false, // new providers start inactive — Super Admin activates deliberately
        credentialSchema: data.credentialSchema as Prisma.InputJsonValue,
        logoUrl:          data.logoUrl?.trim() ?? null,
        docsUrl:          data.docsUrl?.trim() ?? null,
      },
    })

    await logAuditAction({
      superAdminId: adminId,
      action:     AuditAction.CLOUD_PROVIDER_CREATED,
      targetType: 'cloud_provider_type',
      targetId:   provider.id,
      targetName: provider.displayName,
    })

    return provider
  },

  async updateProvider(id: string, data: {
    displayName?: string; category?: string
    credentialSchema?: object; logoUrl?: string; docsUrl?: string
  }, adminId: string) {
    const existing = await db.cloudProviderType.findUnique({ where: { id } })
    if (!existing) throw new Error('Provider not found')

    const updated = await db.cloudProviderType.update({
      where: { id },
      data: {
        displayName:      data.displayName?.trim() ?? existing.displayName,
        category:         (data.category as any) ?? existing.category,
        credentialSchema: data.credentialSchema !== undefined ? (data.credentialSchema as Prisma.InputJsonValue) : undefined,
        logoUrl:          data.logoUrl !== undefined ? (data.logoUrl?.trim() || null) : existing.logoUrl,
        docsUrl:          data.docsUrl !== undefined ? (data.docsUrl?.trim() || null) : existing.docsUrl,
      },
    })

    await logAuditAction({
      superAdminId: adminId,
      action:     AuditAction.CLOUD_PROVIDER_UPDATED,
      targetType: 'cloud_provider_type',
      targetId:   id,
      targetName: updated.displayName,
    })

    return updated
  },

  // Providers are never hard-deleted — a provider key may already be
  // referenced by TenantCloudConnection rows in tenant databases, and
  // deleting the catalog entry would orphan that historical reference
  // with no way to know what it meant. Deactivating is the only supported
  // way to remove a provider from tenant-facing selection.
  async toggleActive(id: string, isActive: boolean, adminId: string) {
    const existing = await db.cloudProviderType.findUnique({ where: { id } })
    if (!existing) throw new Error('Provider not found')

    const updated = await db.cloudProviderType.update({
      where: { id },
      data: { isActive },
    })

    await logAuditAction({
      superAdminId: adminId,
      action:     AuditAction.CLOUD_PROVIDER_TOGGLED,
      targetType: 'cloud_provider_type',
      targetId:   id,
      targetName: updated.displayName,
      details:    { isActive } as Prisma.InputJsonValue,
    })

    return updated
  },
}
