import { getSuperAdminPrisma } from '@dpdp/database'
import { ControlStatus, ApplicableTo, AuditAction, Prisma, EvidenceType, Priority } from '@prisma/super-admin-client'
import { parsePagination, buildMeta } from '../../utils/pagination'
import { logAuditAction } from '../../utils/audit-logger'

const db = getSuperAdminPrisma()

interface PredefinedActionInput {
  title: string
  description: string
  evidenceTypes: EvidenceType[]
  suggestedDueDays: number
  priority: Priority
  orderIndex?: number
}

interface CreateControlParams {
  title: string
  description: string
  chapterId?: string
  sectionReference?: string
  applicableTo: ApplicableTo
  status: ControlStatus
  regulationIds: string[]
  predefinedActions: PredefinedActionInput[]
  adminId: string
  ipAddress?: string
}

interface UpdateControlParams {
  id: string
  data: Partial<{
    title: string
    description: string
    chapterReference: string
    sectionReference: string
    applicableTo: ApplicableTo
    status: ControlStatus
  }>
  adminId: string
}

export const controlsService = {
  async list(query: Record<string, unknown>) {
    const { page, limit, skip } = parsePagination(query)

    const where: Prisma.ControlWhereInput = {
      isCustom: false,
      tenantId: null,
    }

    if (query.search) {
      where.OR = [
        { title: { contains: String(query.search), mode: 'insensitive' } },
        { description: { contains: String(query.search), mode: 'insensitive' } },
      ]
    }

    if (query.status) where.status = query.status as ControlStatus
    if (query.applicableTo) where.applicableTo = query.applicableTo as ApplicableTo

    if (query.regulationId) {
      where.regulationMappings = {
        some: { regulationId: String(query.regulationId) },
      }
    }

    const [controls, total] = await Promise.all([
      db.control.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { chapterId: 'asc' },
          { createdAt: 'asc' },
        ],
        include: {
          regulationMappings: {
            include: {
              regulation: {
                select: {
                  id: true,
                  name: true,
                  shortCode: true,
                },
              },
            },
          },
          chapter: {             
            select: {
              id: true,
              name: true,
              title: true,
              orderIndex: true,
            },
          },
          predefinedActions: {
            orderBy: { orderIndex: 'asc' },
          },
          _count: {
            select: { predefinedActions: true },
          },
        },
      }),
      db.control.count({ where }),
    ])

    return {
      data: controls,
      meta: buildMeta(total, page, limit),
    }
  },

  async getById(id: string) {
    const control = await db.control.findUnique({
      where: { id },
      include: {
        regulationMappings: {
          include: {
            regulation: true,
          },
        },
        chapter: {
          select: {
            id: true,
            name: true,
            title: true,
            orderIndex: true,
          },
        },
        predefinedActions: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    })

    if (!control) throw new Error('Control not found')
    return control
  },

  async create(params: CreateControlParams) {
    if (params.predefinedActions.length === 0) {
      throw new Error('At least one predefined action is required')
    }

    if (params.regulationIds.length === 0) {
      throw new Error('At least one regulation is required')
    }

    const regulations = await db.regulation.findMany({
      where: { id: { in: params.regulationIds } },
    })

    if (regulations.length !== params.regulationIds.length) {
      throw new Error('One or more regulation IDs are invalid')
    }

    const control = await db.control.create({
      data: {
        title: params.title,
        description: params.description,
        chapterId: params.chapterId,
        sectionReference: params.sectionReference,
        applicableTo: params.applicableTo,
        status: params.status,
        isCustom: false,
        regulationMappings: {
          create: params.regulationIds.map(regulationId => ({
            regulationId,
          })),
        },
        predefinedActions: {
          create: params.predefinedActions.map((action, index) => ({
            title: action.title,
            description: action.description,
            evidenceTypes: action.evidenceTypes,
            suggestedDueDays: action.suggestedDueDays,
            priority: action.priority,
            orderIndex: action.orderIndex ?? index,
          })),
        },
      },
      include: {
        regulationMappings: {
          include: {
            regulation: {
              select: {
                id: true,
                name: true,
                shortCode: true,
              },
            },
          },
        },
        chapter: true,
        predefinedActions: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    })

    await logAuditAction({
      superAdminId: params.adminId,
      action: AuditAction.CONTROL_CREATED,
      targetType: 'control',
      targetId: control.id,
      targetName: control.title,
      details: {
        regulationIds: params.regulationIds,
        actionsCount: params.predefinedActions.length,
        status: params.status,
      } as Prisma.InputJsonValue,
      ipAddress: params.ipAddress,
    })

    return control
  },

  async update(params: UpdateControlParams) {
    const existing = await db.control.findUnique({
      where: { id: params.id },
    })
    if (!existing) throw new Error('Control not found')
    if (existing.isCustom) throw new Error('Cannot update custom controls via this endpoint')

    const updated = await db.control.update({
      where: { id: params.id },
      data: params.data,
      include: {
        regulationMappings: {
          include: {
            regulation: {
              select: {
                id: true,
                name: true,
                shortCode: true,
              },
            },
          },
        },
        predefinedActions: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    })

    await logAuditAction({
      superAdminId: params.adminId,
      action: AuditAction.CONTROL_UPDATED,
      targetType: 'control',
      targetId: params.id,
      targetName: updated.title,
      details: { changes: params.data } as Prisma.InputJsonValue,
    })

    return updated
  },

  async publish(id: string, adminId: string) {
    const existing = await db.control.findUnique({ where: { id } })
    if (!existing) throw new Error('Control not found')
    if (existing.status === ControlStatus.PUBLISHED) {
      throw new Error('Control is already published')
    }

    const updated = await db.control.update({
      where: { id },
      data: { status: ControlStatus.PUBLISHED },
    })

    await logAuditAction({
      superAdminId: adminId,
      action: AuditAction.CONTROL_PUBLISHED,
      targetType: 'control',
      targetId: id,
      targetName: existing.title,
    })

    return updated
  },

  async deactivate(id: string, adminId: string) {
    const existing = await db.control.findUnique({ where: { id } })
    if (!existing) throw new Error('Control not found')

    const updated = await db.control.update({
      where: { id },
      data: { status: ControlStatus.DRAFT },
    })

    await logAuditAction({
      superAdminId: adminId,
      action: AuditAction.CONTROL_DEACTIVATED,
      targetType: 'control',
      targetId: id,
      targetName: existing.title,
    })

    return updated
  },

  async addPredefinedAction(
    controlId: string,
    action: PredefinedActionInput,
    adminId: string
  ) {
    const control = await db.control.findUnique({ where: { id: controlId } })
    if (!control) throw new Error('Control not found')

    const actionsCount = await db.controlPredefinedAction.count({
      where: { controlId },
    })

    const created = await db.controlPredefinedAction.create({
      data: {
        controlId,
        title: action.title,
        description: action.description,
        evidenceTypes: action.evidenceTypes,
        suggestedDueDays: action.suggestedDueDays,
        priority: action.priority,
        orderIndex: action.orderIndex ?? actionsCount,
      },
    })

    await logAuditAction({
      superAdminId: adminId,
      action: AuditAction.CONTROL_UPDATED,
      targetType: 'control',
      targetId: controlId,
      targetName: control.title,
      details: {
        action: 'predefined_action_added',
        actionTitle: action.title,
      } as Prisma.InputJsonValue,
    })

    return created
  },

  async removePredefinedAction(
    controlId: string,
    actionId: string,
    adminId: string
  ) {
    const control = await db.control.findUnique({ where: { id: controlId } })
    if (!control) throw new Error('Control not found')

    const actionsCount = await db.controlPredefinedAction.count({
      where: { controlId },
    })
    if (actionsCount <= 1) {
      throw new Error('Control must have at least one predefined action')
    }

    await db.controlPredefinedAction.delete({
      where: { id: actionId },
    })

    await logAuditAction({
      superAdminId: adminId,
      action: AuditAction.CONTROL_UPDATED,
      targetType: 'control',
      targetId: controlId,
      targetName: control.title,
      details: {
        action: 'predefined_action_removed',
        actionId,
      } as Prisma.InputJsonValue,
    })

    return { message: 'Predefined action removed' }
  },
}