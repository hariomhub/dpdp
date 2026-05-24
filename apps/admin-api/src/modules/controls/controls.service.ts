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
  productIds?: string[]   // product IDs to link to this action
}

interface CreateControlParams {
  title: string
  description: string
  applicableTo: ApplicableTo
  status: ControlStatus
  regulationMappings: {
    regulationId: string
    chapterId?: string
    sectionId?: string
  }[]
  predefinedActions: PredefinedActionInput[]
  adminId: string
  ipAddress?: string
}

interface UpdateControlParams {
  id: string
  data: Partial<{
    title: string
    description: string
    applicableTo: ApplicableTo
    status: ControlStatus
    regulationMappings: {
      regulationId: string
      chapterId?: string
      sectionId?: string
    }[]
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
          { createdAt: 'asc' },
        ],
        include: {
          predefinedActions: {
            orderBy: { orderIndex: 'asc' },
            include: {
              products: {
                include: { product: { select: { id: true, name: true, vendor: true, logoUrl: true } } },
              },
            },
          },
          regulationMappings: {
            include: {
              regulation: { select: { id: true, name: true, shortCode: true } },
              chapter:    { select: { id: true, name: true, title: true } },
              section:    { select: { id: true, name: true, title: true } },
            },
          },
          families: {
            include: {
              controlFamily: { select: { id: true, name: true, color: true, icon: true } },
            },
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
            chapter: {
              select: {
                id: true,
                name: true,
                title: true,
                orderIndex: true,
              },
            },
          },
        },
        predefinedActions: {
          orderBy: { orderIndex: 'asc' },
          include: {
            products: {
              include: { product: { select: { id: true, name: true, vendor: true, logoUrl: true } } },
            },
          },
        },
        families: {
          include: { controlFamily: { select: { id: true, name: true, color: true, icon: true } } },
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

    if (params.regulationMappings.length === 0) {
      throw new Error('At least one regulation mapping is required')
    }

    const regIds = params.regulationMappings.map(r => r.regulationId)
    const regulations = await db.regulation.findMany({
      where: { id: { in: regIds } },
    })

    if (regulations.length !== regIds.length) {
      throw new Error('One or more regulation IDs are invalid')
    }

    const control = await db.control.create({
      data: {
        title: params.title,
        description: params.description,
        applicableTo: params.applicableTo,
        status: params.status,
        isCustom: false,
        regulationMappings: {
          create: params.regulationMappings.map(mapping => ({
            regulationId: mapping.regulationId,
            chapterId: mapping.chapterId || undefined,
            sectionId: mapping.sectionId || undefined,
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
            ...(action.productIds && action.productIds.length > 0
              ? { products: { create: action.productIds.map(productId => ({ productId })) } }
              : {}),
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
            chapter: true,
          },
        },
        predefinedActions: {
          orderBy: { orderIndex: 'asc' },
          include: {
            products: {
              include: { product: { select: { id: true, name: true, vendor: true, logoUrl: true } } },
            },
          },
        },
        families: {
          include: { controlFamily: { select: { id: true, name: true, color: true, icon: true } } },
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
        regulationIds: params.regulationMappings.map(m => m.regulationId),
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

    const { regulationMappings, ...restData } = params.data

    const updated = await db.control.update({
      where: { id: params.id },
      data: {
        ...restData,
        ...(regulationMappings ? {
          regulationMappings: {
            deleteMany: {},
            create: regulationMappings.map(mapping => ({
              regulationId: mapping.regulationId,
              chapterId: mapping.chapterId || undefined,
              sectionId: mapping.sectionId || undefined,
            })),
          }
        } : {}),
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
            chapter: {
              select: {
                id: true,
                name: true,
                title: true,
                orderIndex: true,
              },
            },
          },
        },
        predefinedActions: {
          orderBy: { orderIndex: 'asc' },
          include: {
            products: {
              include: { product: { select: { id: true, name: true, vendor: true, logoUrl: true } } },
            },
          },
        },
        families: {
          include: { controlFamily: { select: { id: true, name: true, color: true, icon: true } } },
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
// ─── Appended: delete, updateAction, masterEvidence ──────────────────────────
// These are added to the controlsService object via Object.assign below

const controlsServiceExtension = {

  async deleteControl(id: string, adminId: string) {
    const ctrl = await db.control.findUnique({ where: { id } })
    if (!ctrl) throw new Error('Control not found')
    if (ctrl.isCustom) throw new Error('Cannot delete custom controls via this endpoint')

    await db.control.delete({ where: { id } })

    await logAuditAction({
      superAdminId: adminId,
      action: AuditAction.CONTROL_DEACTIVATED,
      targetType: 'control',
      targetId: id,
      targetName: ctrl.title,
      details: { deleted: true } as Prisma.InputJsonValue,
    })

    return { success: true }
  },

  async updateAction(params: {
    controlId: string; actionId: string; adminId: string
    data: {
      title?: string; description?: string; evidenceTypes?: EvidenceType[]
      suggestedDueDays?: number; priority?: Priority; orderIndex?: number
    }
  }) {
    const action = await db.controlPredefinedAction.findFirst({
      where: { id: params.actionId, controlId: params.controlId },
    })
    if (!action) throw new Error('Action not found')

    return db.controlPredefinedAction.update({
      where: { id: params.actionId },
      data: params.data,
    })
  },

  async setActionProducts(params: {
    controlId: string; actionId: string; productIds: string[]; adminId: string
  }) {
    const action = await db.controlPredefinedAction.findFirst({
      where: { id: params.actionId, controlId: params.controlId },
    })
    if (!action) throw new Error('Action not found')

    // Validate product IDs
    if (params.productIds.length > 0) {
      const found = await db.product.count({ where: { id: { in: params.productIds } } })
      if (found !== params.productIds.length) throw new Error('One or more product IDs invalid')
    }

    await db.actionProduct.deleteMany({ where: { predefinedActionId: params.actionId } })
    if (params.productIds.length > 0) {
      await db.actionProduct.createMany({
        data: params.productIds.map(productId => ({ predefinedActionId: params.actionId, productId })),
      })
    }
    return { actionId: params.actionId, productIds: params.productIds }
  },

  async createMasterEvidence(params: {
    controlId: string; actionId: string; productId: string
    adminId: string
    data: { title: string; description?: string; file?: { fileName: string; fileSize: number; mimeType: string; fileUrl: string; storageProvider: string } }
  }) {
    const action = await db.controlPredefinedAction.findFirst({
      where: { id: params.actionId, controlId: params.controlId },
    })
    if (!action) throw new Error('Action not found')

    return db.masterEvidence.create({
      data: {
        predefinedActionId: params.actionId,
        productId: params.productId,
        title: params.data.title,
        description: params.data.description ?? null,
        fileName: params.data.file?.fileName ?? null,
        fileSize: params.data.file?.fileSize ?? null,
        mimeType: params.data.file?.mimeType ?? null,
        fileUrl: params.data.file?.fileUrl ?? null,
        storageProvider: params.data.file?.storageProvider ?? 'local',
        uploadedById: params.adminId,
      },
    })
  },

  async deleteMasterEvidence(params: {
    controlId: string; actionId: string; evidenceId: string; adminId: string
  }) {
    const evidence = await db.masterEvidence.findFirst({
      where: { id: params.evidenceId, predefinedActionId: params.actionId },
    })
    if (!evidence) throw new Error('Master evidence not found')

    // Delete file from storage
    if (evidence.fileUrl) {
      const { deleteFile } = await import('../../utils/storage')
      await deleteFile(evidence.fileUrl, evidence.storageProvider).catch(() => { })
    }

    await db.masterEvidence.delete({ where: { id: params.evidenceId } })
    return { success: true }
  },
}

Object.assign(controlsService, controlsServiceExtension)