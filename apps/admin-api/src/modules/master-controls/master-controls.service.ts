import { getSuperAdminPrisma } from '@dpdp/database'
import { AuditAction, Prisma, EvidenceType, Priority } from '@prisma/super-admin-client'
import { parsePagination, buildMeta } from '../../utils/pagination'
import { logAuditAction } from '../../utils/audit-logger'

const db = getSuperAdminPrisma()

const masterControlDetailInclude = {
  actions: { orderBy: { orderIndex: 'asc' as const } },
  controls: {
    include: {
      regulation: { select: { id: true, shortCode: true, name: true } },
      // Individual action ids + their masterActionId so the UI can show
      // "N inherited from master / M supplementary" instead of a bare
      // total — Prisma's filtered relation-count can't express two
      // different filters on the same relation in one _count.select.
      predefinedActions: { select: { id: true, masterActionId: true } },
    },
  },
}

export const masterControlsService = {
  async list(query: Record<string, unknown>) {
    const { page, limit, skip } = parsePagination(query)

    const where: Prisma.MasterControlWhereInput = {}
    if (query.search) {
      where.OR = [
        { title: { contains: String(query.search), mode: 'insensitive' } },
        { description: { contains: String(query.search), mode: 'insensitive' } },
      ]
    }
    if (query.status) where.status = String(query.status)

    const [items, total] = await Promise.all([
      db.masterControl.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { actions: true, controls: true } },
          controls: { select: { id: true, regulation: { select: { shortCode: true } } } },
        },
      }),
      db.masterControl.count({ where }),
    ])

    return { data: items, meta: buildMeta(total, page, limit) }
  },

  async getById(id: string) {
    const masterControl = await db.masterControl.findUnique({
      where: { id },
      include: masterControlDetailInclude,
    })
    if (!masterControl) throw new Error('Master control not found')
    return masterControl
  },

  async create(params: { title: string; description: string; adminId: string; ipAddress?: string }) {
    // Sequential, human-readable code (MC-001, MC-002, …) generated inside the
    // same transaction as the insert so two concurrent creates can't compute
    // the same "next" number — low-traffic admin action, but cheap to make safe.
    const masterControl = await db.$transaction(async tx => {
      const last = await tx.masterControl.findFirst({ orderBy: { createdAt: 'desc' }, select: { code: true } })
      const lastNum = last?.code ? parseInt(last.code.replace('MC-', ''), 10) || 0 : 0
      const code = `MC-${String(lastNum + 1).padStart(3, '0')}`
      return tx.masterControl.create({
        data: { code, title: params.title, description: params.description },
      })
    })

    await logAuditAction({
      superAdminId: params.adminId,
      action: AuditAction.MASTER_CONTROL_CREATED,
      targetType: 'master_control',
      targetId: masterControl.id,
      targetName: masterControl.title,
      ipAddress: params.ipAddress,
    })

    return masterControl
  },

  async update(params: {
    id: string
    data: Partial<{ title: string; description: string; status: string }>
    adminId: string
  }) {
    const existing = await db.masterControl.findUnique({ where: { id: params.id } })
    if (!existing) throw new Error('Master control not found')

    const updated = await db.masterControl.update({
      where: { id: params.id },
      data: params.data,
    })

    await logAuditAction({
      superAdminId: params.adminId,
      action: AuditAction.MASTER_CONTROL_UPDATED,
      targetType: 'master_control',
      targetId: params.id,
      targetName: updated.title,
      details: { changes: params.data } as Prisma.InputJsonValue,
    })

    return updated
  },

  // Simple delete, not password-gated like Regulation's — the blast radius here
  // is much smaller (cascades only this master control's own action list;
  // linked controls/actions just lose their masterControlId/masterActionId via
  // onDelete: SetNull, nothing regulation-owned is touched).
  async delete(id: string, adminId: string) {
    const existing = await db.masterControl.findUnique({ where: { id } })
    if (!existing) throw new Error('Master control not found')

    await db.masterControl.delete({ where: { id } })

    await logAuditAction({
      superAdminId: adminId,
      action: AuditAction.MASTER_CONTROL_DELETED,
      targetType: 'master_control',
      targetId: id,
      targetName: existing.title,
    })

    return { message: 'Master control deleted' }
  },

  async createAction(params: {
    masterControlId: string
    title: string
    description: string
    evidenceTypes: EvidenceType[]
    suggestedDueDays?: number
    priority?: Priority
    orderIndex?: number
    adminId: string
  }) {
    const masterControl = await db.masterControl.findUnique({ where: { id: params.masterControlId } })
    if (!masterControl) throw new Error('Master control not found')

    const count = await db.masterControlAction.count({ where: { masterControlId: params.masterControlId } })

    const action = await db.masterControlAction.create({
      data: {
        masterControlId: params.masterControlId,
        title: params.title,
        description: params.description,
        evidenceTypes: params.evidenceTypes,
        suggestedDueDays: params.suggestedDueDays ?? 30,
        priority: params.priority ?? Priority.HIGH,
        orderIndex: params.orderIndex ?? count,
      },
    })

    await logAuditAction({
      superAdminId: params.adminId,
      action: AuditAction.MASTER_CONTROL_ACTION_CREATED,
      targetType: 'master_control_action',
      targetId: action.id,
      targetName: action.title,
    })

    return action
  },

  async updateAction(params: {
    actionId: string
    data: Partial<{
      title: string; description: string; evidenceTypes: EvidenceType[]
      suggestedDueDays: number; priority: Priority; orderIndex: number
    }>
    adminId: string
  }) {
    const existing = await db.masterControlAction.findUnique({ where: { id: params.actionId } })
    if (!existing) throw new Error('Master action not found')

    const updated = await db.masterControlAction.update({
      where: { id: params.actionId },
      data: params.data,
    })

    await logAuditAction({
      superAdminId: params.adminId,
      action: AuditAction.MASTER_CONTROL_ACTION_UPDATED,
      targetType: 'master_control_action',
      targetId: params.actionId,
      targetName: updated.title,
      details: { changes: params.data } as Prisma.InputJsonValue,
    })

    return updated
  },

  async deleteAction(actionId: string, adminId: string) {
    const existing = await db.masterControlAction.findUnique({ where: { id: actionId } })
    if (!existing) throw new Error('Master action not found')

    await db.masterControlAction.delete({ where: { id: actionId } })

    await logAuditAction({
      superAdminId: adminId,
      action: AuditAction.MASTER_CONTROL_ACTION_DELETED,
      targetType: 'master_control_action',
      targetId: actionId,
      targetName: existing.title,
    })

    return { message: 'Master action deleted' }
  },
}
