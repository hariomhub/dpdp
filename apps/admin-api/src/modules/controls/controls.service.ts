import { getSuperAdminPrisma } from '@dpdp/database'
import { ControlStatus, ApplicableTo, AuditAction, Prisma, EvidenceType, Priority } from '@prisma/super-admin-client'
import { parsePagination, buildMeta } from '../../utils/pagination'
import { logAuditAction } from '../../utils/audit-logger'
import { storeMasterEvidenceFile, deleteMasterEvidenceFile } from '../../storage/master-evidence'

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
  status: ControlStatus
  regulationId?: string        // home regulation — required in practice for super-admin catalog controls
  nodeIds: string[]             // every node this control is cited against, any regulation
  applicabilityCategoryIds: string[]  // every applicability category this control is scoped to, any regulation
  predefinedActions: PredefinedActionInput[]
  adminId: string
  ipAddress?: string
}

interface UpdateControlParams {
  id: string
  data: Partial<{
    title: string
    description: string
    status: ControlStatus
    regulationId: string
    nodeIds: string[]
    applicabilityCategoryIds: string[]
    masterControlId: string | null
  }>
  adminId: string
}

// Best-effort mirror onto the deprecated Control.applicableTo column, kept
// only so screens that haven't been migrated to read ControlApplicability
// yet (e.g. the Control Families badge) still show something sensible.
// Not the source of truth going forward — ControlApplicability is.
function deriveLegacyApplicableTo(categoryCodes: string[]): ApplicableTo {
  if (categoryCodes.length === 1 && categoryCodes[0] === 'SIGNIFICANT_DF') return 'SIGNIFICANT_DF' as ApplicableTo
  if (categoryCodes.length === 1 && categoryCodes[0] === 'DATA_FIDUCIARY') return 'DATA_FIDUCIARY' as ApplicableTo
  return 'BOTH' as ApplicableTo
}

const controlCatalogInclude = {
  predefinedActions: {
    orderBy: { orderIndex: 'asc' as const },
    include: {
      products: {
        include: { product: { select: { id: true, name: true, vendor: true, logoUrl: true } } },
      },
    },
  },
  nodes: {
    include: {
      node: { select: { id: true, regulationId: true, parentId: true, nodeType: true, code: true, title: true, depth: true, path: true } },
    },
  },
  applicabilities: {
    include: { applicabilityCategory: { select: { id: true, regulationId: true, code: true, label: true } } },
  },
  families: {
    include: { controlFamily: { select: { id: true, name: true, color: true, icon: true } } },
  },
  masterControl: { select: { id: true, code: true, title: true } },
}

export const controlsService = {
  async list(query: Record<string, unknown>) {
    const { page, limit, skip } = parsePagination(query)

    const where: Prisma.ControlWhereInput = {
      isCustom: false,
      tenantId: { equals: null },
    }

    if (query.search) {
      where.OR = [
        { title: { contains: String(query.search), mode: 'insensitive' } },
        { description: { contains: String(query.search), mode: 'insensitive' } },
      ]
    }

    if (query.status) where.status = query.status as ControlStatus

    if (query.regulationId) {
      // citedRegulationIds covers both "home" and "also mapped elsewhere"
      where.citedRegulationIds = { has: String(query.regulationId) }
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
          ...controlCatalogInclude,
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
      include: controlCatalogInclude,
    })

    if (!control) throw new Error('Control not found')
    return control
  },

  async create(params: CreateControlParams) {
    if (params.predefinedActions.length === 0) {
      throw new Error('At least one predefined action is required')
    }
    if (!params.regulationId) {
      throw new Error('A home regulation is required')
    }

    const homeRegulation = await db.regulation.findUnique({ where: { id: params.regulationId } })
    if (!homeRegulation) throw new Error('Regulation not found')

    const nodes = params.nodeIds.length > 0
      ? await db.regulationNode.findMany({ where: { id: { in: params.nodeIds } } })
      : []
    if (nodes.length !== params.nodeIds.length) throw new Error('One or more node IDs are invalid')

    const categories = params.applicabilityCategoryIds.length > 0
      ? await db.regulationApplicabilityCategory.findMany({ where: { id: { in: params.applicabilityCategoryIds } } })
      : []
    if (categories.length !== params.applicabilityCategoryIds.length) throw new Error('One or more applicability category IDs are invalid')

    const citedRegulationIds = Array.from(new Set([
      params.regulationId,
      ...nodes.map(n => n.regulationId),
      ...categories.map(c => c.regulationId),
    ]))

    const control = await db.control.create({
      data: {
        title: params.title,
        description: params.description,
        applicableTo: deriveLegacyApplicableTo(categories.filter(c => c.regulationId === params.regulationId).map(c => c.code)),
        status: params.status,
        isCustom: false,
        regulationId: params.regulationId,
        citedRegulationIds,
        nodes: {
          create: nodes.map(n => ({ nodeId: n.id, isPrimary: n.regulationId === params.regulationId })),
        },
        applicabilities: {
          create: categories.map(c => ({ applicabilityCategoryId: c.id })),
        },
        predefinedActions: {
          create: params.predefinedActions.map((action, index) => ({
            title: action.title,
            description: action.description,
            evidenceTypes: action.evidenceTypes,
            suggestedDueDays: action.suggestedDueDays,
            priority: action.priority,
            orderIndex: action.orderIndex ?? index,
            regulationId: params.regulationId,
            ...(action.productIds && action.productIds.length > 0
              ? { products: { create: action.productIds.map(productId => ({ productId })) } }
              : {}),
          })),
        },
      },
      include: controlCatalogInclude,
    })

    await logAuditAction({
      superAdminId: params.adminId,
      action: AuditAction.CONTROL_CREATED,
      targetType: 'control',
      targetId: control.id,
      targetName: control.title,
      details: {
        regulationIds: citedRegulationIds,
        actionsCount: params.predefinedActions.length,
        status: params.status,
      } as Prisma.InputJsonValue,
      ipAddress: params.ipAddress,
    })

    return control
  },

  async update(params: UpdateControlParams) {
    const existing = await db.control.findUnique({ where: { id: params.id } })
    if (!existing) throw new Error('Control not found')
    if (existing.isCustom) throw new Error('Cannot update custom controls via this endpoint')

    const { nodeIds, applicabilityCategoryIds, regulationId, ...restData } = params.data
    const homeRegulationId = regulationId ?? existing.regulationId ?? undefined

    let citedRegulationIds: string[] | undefined
    if (nodeIds || applicabilityCategoryIds || regulationId) {
      const nodes = nodeIds
        ? await db.regulationNode.findMany({ where: { id: { in: nodeIds } } })
        : await db.regulationNode.findMany({ where: { controlLinks: { some: { controlId: params.id } } } })
      if (nodeIds && nodes.length !== nodeIds.length) throw new Error('One or more node IDs are invalid')

      const categories = applicabilityCategoryIds
        ? await db.regulationApplicabilityCategory.findMany({ where: { id: { in: applicabilityCategoryIds } } })
        : await db.regulationApplicabilityCategory.findMany({ where: { controlApplicabilities: { some: { controlId: params.id } } } })
      if (applicabilityCategoryIds && categories.length !== applicabilityCategoryIds.length) throw new Error('One or more applicability category IDs are invalid')

      citedRegulationIds = Array.from(new Set([
        ...(homeRegulationId ? [homeRegulationId] : []),
        ...nodes.map(n => n.regulationId),
        ...categories.map(c => c.regulationId),
      ]))

      if (nodeIds) {
        await db.controlNode.deleteMany({ where: { controlId: params.id } })
        await db.controlNode.createMany({
          data: nodes.map(n => ({ controlId: params.id, nodeId: n.id, isPrimary: n.regulationId === homeRegulationId })),
        })
      }
      if (applicabilityCategoryIds) {
        await db.controlApplicability.deleteMany({ where: { controlId: params.id } })
        await db.controlApplicability.createMany({
          data: categories.map(c => ({ controlId: params.id, applicabilityCategoryId: c.id })),
        })
      }
    }

    const updated = await db.control.update({
      where: { id: params.id },
      data: {
        ...restData,
        ...(regulationId ? { regulationId } : {}),
        ...(citedRegulationIds ? { citedRegulationIds } : {}),
      },
      include: controlCatalogInclude,
    })

    if (homeRegulationId) {
      await db.controlPredefinedAction.updateMany({
        where: { controlId: params.id },
        data: { regulationId: homeRegulationId },
      })
    }

    await logAuditAction({
      superAdminId: params.adminId,
      action: AuditAction.CONTROL_UPDATED,
      targetType: 'control',
      targetId: params.id,
      targetName: updated.title,
      details: { changes: { ...restData, regulationId, nodeIds, applicabilityCategoryIds } } as Prisma.InputJsonValue,
    })

    if ('masterControlId' in params.data) {
      await logAuditAction({
        superAdminId: params.adminId,
        action: params.data.masterControlId ? AuditAction.CONTROL_LINKED_TO_MASTER : AuditAction.CONTROL_UNLINKED_FROM_MASTER,
        targetType: 'control',
        targetId: params.id,
        targetName: updated.title,
        details: { masterControlId: params.data.masterControlId } as Prisma.InputJsonValue,
      })
    }

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
      masterActionId?: string | null
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
    data: { title: string; description?: string; upload?: { path: string; originalname: string; size: number } }
  }) {
    const action = await db.controlPredefinedAction.findFirst({
      where: { id: params.actionId, controlId: params.controlId },
    })
    if (!action) throw new Error('Action not found')

    // Only now that the action is known to exist is the file accepted (type-checked) into private storage.
    const file = params.data.upload
      ? await storeMasterEvidenceFile(params.data.upload, params.actionId)
      : undefined

    try {
      return await db.masterEvidence.create({
        data: {
          predefinedActionId: params.actionId,
          productId: params.productId,
          title: params.data.title,
          description: params.data.description ?? null,
          fileName: file?.fileName ?? null,
          fileSize: file?.fileSize ?? null,
          mimeType: file?.mimeType ?? null,
          fileUrl: file?.fileUrl ?? null,
          storageProvider: file?.storageProvider ?? 'local',
          uploadedById: params.adminId,
        },
      })
    } catch (err) {
      // the database write failed after the file was stored: don't leave an orphan behind
      if (file) await deleteMasterEvidenceFile({ fileUrl: file.fileUrl, storageProvider: file.storageProvider }).catch(() => undefined)
      throw err
    }
  },

  async deleteMasterEvidence(params: {
    controlId: string; actionId: string; evidenceId: string; adminId: string
  }) {
    const evidence = await db.masterEvidence.findFirst({
      where: { id: params.evidenceId, predefinedActionId: params.actionId },
    })
    if (!evidence) throw new Error('Master evidence not found')

    // Delete file from storage
    await deleteMasterEvidenceFile({ fileUrl: evidence.fileUrl, storageProvider: evidence.storageProvider }).catch(() => { })

    await db.masterEvidence.delete({ where: { id: params.evidenceId } })
    return { success: true }
  },
}

Object.assign(controlsService, controlsServiceExtension)