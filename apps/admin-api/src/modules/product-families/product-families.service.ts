import { getSuperAdminPrisma } from '@dpdp/database'
import { AuditAction, Prisma } from '@prisma/super-admin-client'
import { logAuditAction } from '../../utils/audit-logger'

const db = getSuperAdminPrisma()

export const productFamiliesService = {

  // ── Product Families ────────────────────────────────────────────────────────

  async listFamilies() {
    return db.productFamily.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count:   { select: { products: true } },
        products: {
          orderBy: { name: 'asc' },
          select: {
            id: true, name: true, vendor: true,
            description: true, website: true, logoUrl: true, category: true,
            _count: { select: { actions: true } },
          },
        },
      },
    })
  },

  async createFamily(data: {
    name: string; description?: string; category?: string
  }, adminId: string) {
    const existing = await db.productFamily.findFirst({ where: { name: data.name.trim() } })
    if (existing) throw new Error(`Product family "${data.name}" already exists`)

    const family = await db.productFamily.create({
      data: {
        name:        data.name.trim(),
        description: data.description?.trim() ?? null,
        category:    data.category?.trim() ?? null,
      },
    })

    await logAuditAction({
      superAdminId: adminId,
      action:     AuditAction.CONTROL_CREATED,
      targetType: 'product_family',
      targetId:   family.id,
      targetName: family.name,
    })

    return family
  },

  async updateFamily(id: string, data: {
    name?: string; description?: string; category?: string
  }, adminId: string) {
    const existing = await db.productFamily.findUnique({ where: { id } })
    if (!existing) throw new Error('Product family not found')

    if (data.name && data.name.trim() !== existing.name) {
      const duplicate = await db.productFamily.findFirst({
        where: { name: data.name.trim(), id: { not: id } },
      })
      if (duplicate) throw new Error(`Product family "${data.name}" already exists`)
    }

    const updated = await db.productFamily.update({
      where: { id },
      data: {
        name:        data.name?.trim() ?? existing.name,
        description: data.description !== undefined ? (data.description?.trim() || null) : existing.description,
        category:    data.category !== undefined ? (data.category?.trim() || null) : existing.category,
      },
    })

    await logAuditAction({
      superAdminId: adminId,
      action:     AuditAction.CONTROL_UPDATED,
      targetType: 'product_family',
      targetId:   id,
      targetName: updated.name,
    })

    return updated
  },

  async deleteFamily(id: string, adminId: string) {
    const family = await db.productFamily.findUnique({
      where:   { id },
      include: { _count: { select: { products: true } } },
    })
    if (!family) throw new Error('Product family not found')
    if (family._count.products > 0) {
      throw new Error(
        `Cannot delete: family has ${family._count.products} product(s). Remove or reassign them first.`
      )
    }

    await db.productFamily.delete({ where: { id } })

    await logAuditAction({
      superAdminId: adminId,
      action:     AuditAction.CONTROL_DEACTIVATED,
      targetType: 'product_family',
      targetId:   id,
      targetName: family.name,
      details:    { deleted: true } as Prisma.InputJsonValue,
    })

    return { success: true }
  },

  // ── Products ────────────────────────────────────────────────────────────────

  async listAllProducts() {
    return db.product.findMany({
      orderBy:  { name: 'asc' },
      include: {
        productFamily: { select: { id: true, name: true, category: true } },
        _count:        { select: { actions: true } },
      },
    })
  },

  async createProduct(data: {
    name: string; description?: string; vendor?: string; website?: string
    logoUrl?: string; category?: string; productFamilyId?: string | null
  }, adminId: string) {
    if (data.productFamilyId) {
      const family = await db.productFamily.findUnique({ where: { id: data.productFamilyId } })
      if (!family) throw new Error('Product family not found')
    }

    const product = await db.product.create({
      data: {
        name:            data.name.trim(),
        description:     data.description?.trim() ?? null,
        vendor:          data.vendor?.trim() ?? null,
        website:         data.website?.trim() ?? null,
        logoUrl:         data.logoUrl?.trim() ?? null,
        category:        data.category?.trim() ?? null,
        productFamilyId: data.productFamilyId ?? null,
      },
      include: {
        productFamily: { select: { id: true, name: true } },
      },
    })

    await logAuditAction({
      superAdminId: adminId,
      action:     AuditAction.CONTROL_CREATED,
      targetType: 'product',
      targetId:   product.id,
      targetName: product.name,
      details:    { productFamilyId: data.productFamilyId ?? null } as Prisma.InputJsonValue,
    })

    return product
  },

  async updateProduct(id: string, data: {
    name?: string; description?: string; vendor?: string; website?: string
    logoUrl?: string; category?: string; productFamilyId?: string | null
  }, adminId: string) {
    const existing = await db.product.findUnique({ where: { id } })
    if (!existing) throw new Error('Product not found')

    if (data.productFamilyId) {
      const family = await db.productFamily.findUnique({ where: { id: data.productFamilyId } })
      if (!family) throw new Error('Product family not found')
    }

    const updated = await db.product.update({
      where: { id },
      data: {
        name:            data.name?.trim() ?? existing.name,
        description:     data.description !== undefined ? (data.description?.trim() || null) : existing.description,
        vendor:          data.vendor !== undefined ? (data.vendor?.trim() || null) : existing.vendor,
        website:         data.website !== undefined ? (data.website?.trim() || null) : existing.website,
        logoUrl:         data.logoUrl !== undefined ? (data.logoUrl?.trim() || null) : existing.logoUrl,
        category:        data.category !== undefined ? (data.category?.trim() || null) : existing.category,
        productFamilyId: data.productFamilyId !== undefined ? (data.productFamilyId ?? null) : existing.productFamilyId,
      },
      include: {
        productFamily: { select: { id: true, name: true } },
      },
    })

    await logAuditAction({
      superAdminId: adminId,
      action:     AuditAction.CONTROL_UPDATED,
      targetType: 'product',
      targetId:   id,
      targetName: updated.name,
    })

    return updated
  },

  async deleteProduct(id: string, adminId: string) {
    const product = await db.product.findUnique({
      where:   { id },
      include: { _count: { select: { actions: true } } },
    })
    if (!product) throw new Error('Product not found')

    if (product._count.actions > 0) {
      throw new Error(
        `Cannot delete: product is assigned to ${product._count.actions} control action(s). Remove assignments first.`
      )
    }

    await db.product.delete({ where: { id } })

    await logAuditAction({
      superAdminId: adminId,
      action:     AuditAction.CONTROL_DEACTIVATED,
      targetType: 'product',
      targetId:   id,
      targetName: product.name,
      details:    { deleted: true } as Prisma.InputJsonValue,
    })

    return { success: true }
  },

  // ── Action Product mappings ─────────────────────────────────────────────────

  async setActionProducts(actionId: string, productIds: string[], adminId: string) {
    const action = await db.controlPredefinedAction.findUnique({
      where: { id: actionId },
      include: { control: { select: { id: true, title: true } } },
    })
    if (!action) throw new Error('Predefined action not found')

    // Validate all product IDs
    if (productIds.length > 0) {
      const products = await db.product.findMany({
        where: { id: { in: productIds } }, select: { id: true },
      })
      if (products.length !== productIds.length) {
        throw new Error('One or more product IDs are invalid')
      }
    }

    // Replace strategy: delete all, recreate
    await db.actionProduct.deleteMany({ where: { predefinedActionId: actionId } })

    if (productIds.length > 0) {
      await db.actionProduct.createMany({
        data: productIds.map(productId => ({ predefinedActionId: actionId, productId })),
      })
    }

    await logAuditAction({
      superAdminId: adminId,
      action:     AuditAction.CONTROL_UPDATED,
      targetType: 'control',
      targetId:   action.control.id,
      targetName: action.control.title,
      details:    { actionId, productCount: productIds.length } as Prisma.InputJsonValue,
    })

    return { actionId, productIds }
  },
}