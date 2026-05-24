import { getSuperAdminPrisma } from '@dpdp/database'
import { AuditAction, Prisma } from '@prisma/super-admin-client'
import { logAuditAction } from '../../utils/audit-logger'

const db = getSuperAdminPrisma()

export const controlFamiliesService = {

  async list() {
    return db.controlFamily.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { controls: true } },
        controls: {
          include: {
            control: {
              select: { id: true, title: true, status: true, applicableTo: true },
            },
          },
          orderBy: { addedAt: 'asc' },
        },
      },
    })
  },

  async getById(id: string) {
    const family = await db.controlFamily.findUnique({
      where: { id },
      include: {
        controls: {
          include: {
            control: {
              select: {
                id: true, title: true, description: true,
                status: true, applicableTo: true,
                predefinedActions: { select: { id: true, title: true } },
              },
            },
          },
          orderBy: { addedAt: 'asc' },
        },
      },
    })
    if (!family) throw new Error('Control family not found')
    return family
  },

  async create(data: {
    name: string; description?: string; icon?: string; color?: string
  }, adminId: string) {
    const existing = await db.controlFamily.findFirst({ where: { name: data.name.trim() } })
    if (existing) throw new Error(`Control family "${data.name}" already exists`)

    const family = await db.controlFamily.create({
      data: {
        name:        data.name.trim(),
        description: data.description?.trim() ?? null,
        icon:        data.icon?.trim() ?? null,
        color:       data.color?.trim() ?? null,
        status:      'ACTIVE',
      },
    })

    await logAuditAction({
      superAdminId: adminId,
      action:     AuditAction.CONTROL_CREATED,
      targetType: 'control_family',
      targetId:   family.id,
      targetName: family.name,
    })

    return family
  },

  async update(id: string, data: {
    name?: string; description?: string; icon?: string; color?: string; status?: string
  }, adminId: string) {
    const existing = await db.controlFamily.findUnique({ where: { id } })
    if (!existing) throw new Error('Control family not found')

    if (data.name && data.name.trim() !== existing.name) {
      const duplicate = await db.controlFamily.findFirst({
        where: { name: data.name.trim(), id: { not: id } },
      })
      if (duplicate) throw new Error(`Control family "${data.name}" already exists`)
    }

    const updated = await db.controlFamily.update({
      where: { id },
      data: {
        name:        data.name?.trim() ?? existing.name,
        description: data.description !== undefined ? (data.description?.trim() || null) : existing.description,
        icon:        data.icon !== undefined ? (data.icon?.trim() || null) : existing.icon,
        color:       data.color !== undefined ? (data.color?.trim() || null) : existing.color,
        status:      data.status ?? existing.status,
      },
    })

    await logAuditAction({
      superAdminId: adminId,
      action:     AuditAction.CONTROL_UPDATED,
      targetType: 'control_family',
      targetId:   id,
      targetName: updated.name,
    })

    return updated
  },

  async delete(id: string, adminId: string) {
    const family = await db.controlFamily.findUnique({
      where: { id },
      include: { _count: { select: { controls: true } } },
    })
    if (!family) throw new Error('Control family not found')

    if (family._count.controls > 0) {
      throw new Error(
        `Cannot delete: family has ${family._count.controls} control(s) assigned. Remove them first.`
      )
    }

    await db.controlFamily.delete({ where: { id } })

    await logAuditAction({
      superAdminId: adminId,
      action:     AuditAction.CONTROL_DEACTIVATED,
      targetType: 'control_family',
      targetId:   id,
      targetName: family.name,
      details:    { deleted: true } as Prisma.InputJsonValue,
    })

    return { success: true }
  },

  // ── Manage controls in a family ────────────────────────────────────────────

  async addControls(familyId: string, controlIds: string[], adminId: string) {
    const family = await db.controlFamily.findUnique({ where: { id: familyId } })
    if (!family) throw new Error('Control family not found')

    // Validate controls exist
    const controls = await db.control.findMany({
      where: { id: { in: controlIds } },
      select: { id: true },
    })
    if (controls.length !== controlIds.length) {
      throw new Error('One or more control IDs are invalid')
    }

    // Skip already-added (upsert-style)
    await db.controlFamilyMember.createMany({
      data: controlIds.map(controlId => ({ controlFamilyId: familyId, controlId })),
      skipDuplicates: true,
    })

    await logAuditAction({
      superAdminId: adminId,
      action:     AuditAction.CONTROL_UPDATED,
      targetType: 'control_family',
      targetId:   familyId,
      targetName: family.name,
      details:    { added: controlIds.length } as Prisma.InputJsonValue,
    })

    return { added: controlIds.length }
  },

  async removeControl(familyId: string, controlId: string, adminId: string) {
    const family = await db.controlFamily.findUnique({ where: { id: familyId } })
    if (!family) throw new Error('Control family not found')

    await db.controlFamilyMember.delete({
      where: { controlFamilyId_controlId: { controlFamilyId: familyId, controlId } },
    })

    await logAuditAction({
      superAdminId: adminId,
      action:     AuditAction.CONTROL_UPDATED,
      targetType: 'control_family',
      targetId:   familyId,
      targetName: family.name,
      details:    { removedControlId: controlId } as Prisma.InputJsonValue,
    })

    return { success: true }
  },
}