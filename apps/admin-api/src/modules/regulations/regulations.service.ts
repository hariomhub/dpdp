import { getSuperAdminPrisma } from '@dpdp/database'
import { RegulationStatus, AuditAction, Prisma, NodeApplicabilityStatus } from '@prisma/super-admin-client'
import { parsePagination, buildMeta } from '../../utils/pagination'
import { logAuditAction } from '../../utils/audit-logger'
import bcrypt from 'bcryptjs'

const db = getSuperAdminPrisma()

interface ListRegulationsParams {
  query: Record<string, unknown>
}

interface CreateRegulationParams {
  name: string
  shortCode: string
  issuingAuthority: string
  description: string
  jurisdiction: string
  effectiveDate: Date
  status: RegulationStatus
  adminId: string
  ipAddress?: string
}

interface UpdateRegulationParams {
  id: string
  data: Partial<{
    name: string
    issuingAuthority: string
    description: string
    jurisdiction: string
    effectiveDate: Date
    status: RegulationStatus
  }>
  adminId: string
}

export const regulationsService = {

  async getChapters(regulationId: string) {
    const regulation = await db.regulation.findUnique({
      where: { id: regulationId },
    })
    if (!regulation) throw new Error('Regulation not found')

    return db.regulationChapter.findMany({
      where: { regulationId },
      orderBy: { orderIndex: 'asc' },
      include: {
        _count: { select: { controlMappings: true } },
      },
    })
  },

  async createChapter(params: {
    regulationId: string
    name: string
    title?: string
    orderIndex?: number
    adminId: string
  }) {
    const regulation = await db.regulation.findUnique({
      where: { id: params.regulationId },
    })
    if (!regulation) throw new Error('Regulation not found')

    const existing = await db.regulationChapter.findUnique({
      where: {
        regulationId_name: {
          regulationId: params.regulationId,
          name: params.name,
        },
      },
    })
    if (existing) throw new Error(`Chapter "${params.name}" already exists`)

    const count = await db.regulationChapter.count({
      where: { regulationId: params.regulationId },
    })

    const chapter = await db.regulationChapter.create({
      data: {
        regulationId: params.regulationId,
        name: params.name,
        title: params.title,
        orderIndex: params.orderIndex ?? count,
      },
    })

    await logAuditAction({
      superAdminId: params.adminId,
      action: AuditAction.REGULATION_UPDATED,
      targetType: 'regulation',
      targetId: params.regulationId,
      targetName: regulation.name,
      details: {
        action: 'chapter_created',
        chapterName: params.name,
      } as Prisma.InputJsonValue,
    })

    return chapter
  },

  async updateChapter(params: {
    chapterId: string
    data: Partial<{ name: string; title: string; orderIndex: number; isMandatory: boolean }>
    adminId: string
  }) {
    const chapter = await db.regulationChapter.findUnique({
      where: { id: params.chapterId },
    })
    if (!chapter) throw new Error('Chapter not found')

    return db.regulationChapter.update({
      where: { id: params.chapterId },
      data: params.data,
    })
  },

  async deleteChapter(chapterId: string, adminId: string) {
    const chapter = await db.regulationChapter.findUnique({
      where: { id: chapterId },
      include: { _count: { select: { controlMappings: true } } },
    })
    if (!chapter) throw new Error('Chapter not found')

    if (chapter._count.controlMappings > 0) {
      throw new Error(
        `Cannot delete chapter with ${chapter._count.controlMappings} controls. Move or delete controls first.`
      )
    }

    await db.regulationChapter.delete({ where: { id: chapterId } })
    return { message: 'Chapter deleted' }
  },
  async list({ query }: ListRegulationsParams) {
    const { page, limit, skip } = parsePagination(query)

    const where: Prisma.RegulationWhereInput = {}

    if (query.search) {
      where.OR = [
        { name: { contains: String(query.search), mode: 'insensitive' } },
        { shortCode: { contains: String(query.search), mode: 'insensitive' } },
        { issuingAuthority: { contains: String(query.search), mode: 'insensitive' } },
      ]
    }

    if (query.status) where.status = query.status as RegulationStatus
    if (query.jurisdiction) {
      where.jurisdiction = {
        contains: String(query.jurisdiction),
        mode: 'insensitive',
      }
    }

    const [regulations, total] = await Promise.all([
      db.regulation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { controlMappings: true },
          },
        },
      }),
      db.regulation.count({ where }),
    ])

    return {
      data: regulations,
      meta: buildMeta(total, page, limit),
    }
  },

  async getById(id: string) {
    const regulation = await db.regulation.findUnique({
      where: { id },
      include: {
        controlMappings: {
          include: {
            control: {
              include: {
                predefinedActions: true,
              },
            },
          },
          orderBy: {
            chapterId: 'asc',
          },
        },
        _count: {
          select: { controlMappings: true },
        },
      },
    })

    if (!regulation) throw new Error('Regulation not found')
    return regulation
  },

  async create(params: CreateRegulationParams) {
    const existing = await db.regulation.findUnique({
      where: { shortCode: params.shortCode },
    })
    if (existing) {
      throw new Error(`Short code ${params.shortCode} already exists`)
    }

    const regulation = await db.regulation.create({
      data: {
        name: params.name,
        shortCode: params.shortCode.toUpperCase(),
        issuingAuthority: params.issuingAuthority,
        description: params.description,
        jurisdiction: params.jurisdiction,
        effectiveDate: params.effectiveDate,
        status: params.status,
      },
    })

    await logAuditAction({
      superAdminId: params.adminId,
      action: AuditAction.REGULATION_CREATED,
      targetType: 'regulation',
      targetId: regulation.id,
      targetName: regulation.name,
      details: {
        shortCode: regulation.shortCode,
        status: regulation.status,
      } as Prisma.InputJsonValue,
      ipAddress: params.ipAddress,
    })

    return regulation
  },

  async update(params: UpdateRegulationParams) {
    const existing = await db.regulation.findUnique({
      where: { id: params.id },
    })
    if (!existing) throw new Error('Regulation not found')

    const updated = await db.regulation.update({
      where: { id: params.id },
      data: params.data,
    })

    await logAuditAction({
      superAdminId: params.adminId,
      action: AuditAction.REGULATION_UPDATED,
      targetType: 'regulation',
      targetId: params.id,
      targetName: updated.name,
      details: { changes: params.data } as Prisma.InputJsonValue,
    })

    return updated
  },

  async archive(id: string, adminId: string) {
    const existing = await db.regulation.findUnique({ where: { id } })
    if (!existing) throw new Error('Regulation not found')
    if (existing.status === RegulationStatus.ARCHIVED) {
      throw new Error('Regulation is already archived')
    }

    const updated = await db.regulation.update({
      where: { id },
      data: { status: RegulationStatus.ARCHIVED },
    })

    await logAuditAction({
      superAdminId: adminId,
      action: AuditAction.REGULATION_ARCHIVED,
      targetType: 'regulation',
      targetId: id,
      targetName: existing.name,
    })

    return updated
  },

  // Hard delete — permanently removes the regulation plus everything it
  // owns (structure nodes, applicability categories, custom field defs,
  // tenant classifications under it). Controls that cited this regulation
  // are NOT deleted: Control.regulationId is set null (via FK onDelete:
  // SetNull) and the id is stripped from Control.citedRegulationIds, so
  // authored control content survives, just unmapped from this regulation.
  // Gated behind password re-entry + typing the regulation's shortCode,
  // since this cannot be undone (no soft-delete/recycle bin for this path —
  // use archive() instead for a reversible action).
  async deleteRegulation(params: {
    id: string
    password: string
    confirmShortCode: string
    adminId: string
    ipAddress?: string
  }) {
    const admin = await db.superAdmin.findUnique({ where: { id: params.adminId } })
    if (!admin) throw new Error('Admin not found')
    const validPassword = await bcrypt.compare(params.password, admin.passwordHash)
    if (!validPassword) throw new Error('Incorrect password')

    const regulation = await db.regulation.findUnique({ where: { id: params.id } })
    if (!regulation) throw new Error('Regulation not found')
    if (params.confirmShortCode !== regulation.shortCode) {
      throw new Error('Confirmation text does not match the regulation\'s short code')
    }

    const [nodeCount, categoryCount, controlsUnmapped] = await Promise.all([
      db.regulationNode.count({ where: { regulationId: params.id } }),
      db.regulationApplicabilityCategory.count({ where: { regulationId: params.id } }),
      db.control.count({ where: { citedRegulationIds: { has: params.id } } }),
    ])

    await db.$transaction([
      // Deleted explicitly first: TenantRegulationClassification.applicabilityCategoryId
      // is onDelete: Restrict, which Postgres checks immediately (not deferred to
      // end-of-statement) even though regulationId on the same row is Cascade —
      // so leaving this to the regulation-delete cascade would abort the transaction
      // whenever any tenant has been classified under this regulation.
      db.tenantRegulationClassification.deleteMany({ where: { regulationId: params.id } }),
      // citedRegulationIds is a plain string array, not a real FK, so Postgres
      // cascade can't clean it up — strip the id from every control that cites it.
      db.$executeRaw`UPDATE controls SET "citedRegulationIds" = array_remove("citedRegulationIds", ${params.id}) WHERE ${params.id} = ANY("citedRegulationIds")`,
      db.regulation.delete({ where: { id: params.id } }),
    ])

    await logAuditAction({
      superAdminId: params.adminId,
      action: AuditAction.REGULATION_DELETED,
      targetType: 'regulation',
      targetId: params.id,
      targetName: regulation.name,
      details: { shortCode: regulation.shortCode, nodeCount, categoryCount, controlsUnmapped } as Prisma.InputJsonValue,
      ipAddress: params.ipAddress,
    })

    return { nodeCount, categoryCount, controlsUnmapped }
  },

  async addControl(regulationId: string, controlId: string, adminId: string) {
    const regulation = await db.regulation.findUnique({
      where: { id: regulationId },
    })
    if (!regulation) throw new Error('Regulation not found')

    const control = await db.control.findUnique({
      where: { id: controlId },
    })
    if (!control) throw new Error('Control not found')

    const existing = await db.controlRegulation.findUnique({
      where: {
        controlId_regulationId: {
          controlId,
          regulationId,
        },
      },
    })
    if (existing) throw new Error('Control already linked to this regulation')

    await db.controlRegulation.create({
      data: { controlId, regulationId },
    })

    await logAuditAction({
      superAdminId: adminId,
      action: AuditAction.REGULATION_UPDATED,
      targetType: 'regulation',
      targetId: regulationId,
      targetName: regulation.name,
      details: {
        action: 'control_added',
        controlId,
        controlTitle: control.title,
      } as Prisma.InputJsonValue,
    })

    return { message: 'Control added to regulation' }
  },

  async removeControl(
    regulationId: string,
    controlId: string,
    adminId: string
  ) {
    const regulation = await db.regulation.findUnique({
      where: { id: regulationId },
    })
    if (!regulation) throw new Error('Regulation not found')

    const existing = await db.controlRegulation.findUnique({
      where: {
        controlId_regulationId: {
          controlId,
          regulationId,
        },
      },
    })
    if (!existing) throw new Error('Control is not linked to this regulation')

    await db.controlRegulation.delete({
      where: {
        controlId_regulationId: {
          controlId,
          regulationId,
        },
      },
    })

    await logAuditAction({
      superAdminId: adminId,
      action: AuditAction.REGULATION_UPDATED,
      targetType: 'regulation',
      targetId: regulationId,
      targetName: regulation.name,
      details: {
        action: 'control_removed',
        controlId,
      } as Prisma.InputJsonValue,
    })

    return { message: 'Control removed from regulation' }
  },
}
// ─── Sections (appended) ──────────────────────────────────────────────────────

export const regulationSectionsService = {
  async listSections(chapterId: string) {
    return getSuperAdminPrisma().regulationSection.findMany({
      where: { chapterId }, orderBy: { orderIndex: 'asc' },
    })
  },

  async createSection(params: { chapterId: string; name: string; title?: string }) {
    const db = getSuperAdminPrisma()
    const chapter = await db.regulationChapter.findUnique({ where: { id: params.chapterId } })
    if (!chapter) throw new Error('Chapter not found')
    const existing = await db.regulationSection.findFirst({
      where: { chapterId: params.chapterId, name: params.name.trim() },
    })
    if (existing) throw new Error(`Section "${params.name}" already exists in this chapter`)
    return db.regulationSection.create({
      data: { chapterId: params.chapterId, name: params.name.trim(), title: params.title?.trim() ?? null, orderIndex: 0 },
    })
  },

  async updateSection(id: string, data: { name?: string; title?: string }) {
    const db = getSuperAdminPrisma()
    const existing = await db.regulationSection.findUnique({ where: { id } })
    if (!existing) throw new Error('Section not found')
    return db.regulationSection.update({ where: { id }, data })
  },

  async deleteSection(id: string) {
    const db = getSuperAdminPrisma()
    // Check if any controls are mapped to this section
    const mapped = await db.controlRegulation.count({ where: { sectionId: id } })
    if (mapped > 0) throw new Error(`Cannot delete: ${mapped} control(s) mapped to this section`)
    await db.regulationSection.delete({ where: { id } })
    return { success: true }
  },
}

// ─── Regulation Nodes (generic tree — appended) ───────────────────────────
// New, additive capability. Deliberately does NOT touch RegulationChapter/
// RegulationSection/regulationsService/regulationSectionsService above —
// those keep working exactly as before for the currently-shipped UI while
// this is built out. The control-creation flow (chapterId/sectionId ->
// ControlNode) is intentionally NOT switched over in this pass either —
// doing so before the UI that drives it is updated would risk controls or
// nodes created via the still-old screens silently not showing up in the
// new tree. That switch happens together with the UI in the next slice.

export const regulationNodesService = {
  async getNodes(regulationId: string) {
    const db = getSuperAdminPrisma()
    const regulation = await db.regulation.findUnique({ where: { id: regulationId } })
    if (!regulation) throw new Error('Regulation not found')

    return db.regulationNode.findMany({
      where: { regulationId },
      orderBy: [{ depth: 'asc' }, { orderIndex: 'asc' }],
      include: {
        _count: { select: { children: true, controlLinks: true } },
      },
    })
  },

  async createNode(params: {
    regulationId: string
    parentId?: string | null
    nodeType: string
    code: string
    title?: string
    content?: string
    orderIndex?: number
    adminId: string
  }) {
    const db = getSuperAdminPrisma()
    const regulation = await db.regulation.findUnique({ where: { id: params.regulationId } })
    if (!regulation) throw new Error('Regulation not found')

    let parent: { id: string; depth: number; path: string; regulationId: string } | null = null
    if (params.parentId) {
      parent = await db.regulationNode.findUnique({ where: { id: params.parentId } })
      if (!parent) throw new Error('Parent node not found')
      if (parent.regulationId !== params.regulationId) throw new Error('Parent node belongs to a different regulation')
    }

    // Sibling-uniqueness on code isn't DB-enforced (a plain @@unique can't
    // treat NULL parentId as a comparable group in Postgres), so it's
    // checked here instead.
    const existing = await db.regulationNode.findFirst({
      where: { regulationId: params.regulationId, parentId: params.parentId ?? null, code: params.code },
    })
    if (existing) throw new Error(`A node with code "${params.code}" already exists at this level`)

    const siblingCount = await db.regulationNode.count({
      where: { regulationId: params.regulationId, parentId: params.parentId ?? null },
    })

    const created = await db.regulationNode.create({
      data: {
        regulationId: params.regulationId,
        parentId: params.parentId ?? null,
        nodeType: params.nodeType,
        code: params.code,
        title: params.title,
        content: params.content,
        orderIndex: params.orderIndex ?? siblingCount,
        depth: parent ? parent.depth + 1 : 0,
        path: '',
      },
    })

    const finalPath = parent ? `${parent.path}.${created.id}` : created.id
    const node = await db.regulationNode.update({ where: { id: created.id }, data: { path: finalPath } })

    await logAuditAction({
      superAdminId: params.adminId,
      action: AuditAction.REGULATION_UPDATED,
      targetType: 'regulation',
      targetId: params.regulationId,
      targetName: regulation.name,
      details: { action: 'node_created', nodeType: params.nodeType, code: params.code } as Prisma.InputJsonValue,
    })

    return node
  },

  async updateNode(params: {
    nodeId: string
    data: Partial<{ nodeType: string; code: string; title: string; content: string; orderIndex: number }>
    adminId: string
  }) {
    const db = getSuperAdminPrisma()
    const node = await db.regulationNode.findUnique({ where: { id: params.nodeId } })
    if (!node) throw new Error('Node not found')

    if (params.data.code && params.data.code !== node.code) {
      const dup = await db.regulationNode.findFirst({
        where: { regulationId: node.regulationId, parentId: node.parentId, code: params.data.code, id: { not: node.id } },
      })
      if (dup) throw new Error(`A node with code "${params.data.code}" already exists at this level`)
    }

    return db.regulationNode.update({ where: { id: params.nodeId }, data: params.data })
  },

  async deleteNode(nodeId: string, adminId: string) {
    const db = getSuperAdminPrisma()
    const node = await db.regulationNode.findUnique({
      where: { id: nodeId },
      include: { _count: { select: { children: true, controlLinks: true } } },
    })
    if (!node) throw new Error('Node not found')

    if (node._count.children > 0) {
      throw new Error(`Cannot delete: ${node._count.children} child node(s) exist under this node. Delete or move them first.`)
    }
    if (node._count.controlLinks > 0) {
      throw new Error(`Cannot delete: ${node._count.controlLinks} control(s) mapped to this node. Remap them first.`)
    }

    await db.regulationNode.delete({ where: { id: nodeId } })
    return { success: true }
  },

  async moveNode(params: { nodeId: string; newParentId: string | null; adminId: string }) {
    const db = getSuperAdminPrisma()
    const node = await db.regulationNode.findUnique({ where: { id: params.nodeId } })
    if (!node) throw new Error('Node not found')

    let newParent: { id: string; depth: number; path: string; regulationId: string } | null = null
    if (params.newParentId) {
      newParent = await db.regulationNode.findUnique({ where: { id: params.newParentId } })
      if (!newParent) throw new Error('New parent node not found')
      if (newParent.regulationId !== node.regulationId) throw new Error('Cannot move a node into a different regulation')
      if (newParent.path === node.path || newParent.path.startsWith(`${node.path}.`)) {
        throw new Error('Cannot move a node into its own descendant')
      }
    }

    const dup = await db.regulationNode.findFirst({
      where: { regulationId: node.regulationId, parentId: params.newParentId ?? null, code: node.code, id: { not: node.id } },
    })
    if (dup) throw new Error(`A node with code "${node.code}" already exists at the destination level`)

    const newDepth = newParent ? newParent.depth + 1 : 0
    const depthDelta = newDepth - node.depth
    const oldPathPrefix = node.path
    const newPathPrefix = newParent ? `${newParent.path}.${node.id}` : node.id

    const descendants = await db.regulationNode.findMany({
      where: { regulationId: node.regulationId, path: { startsWith: `${oldPathPrefix}.` } },
    })

    await db.$transaction([
      db.regulationNode.update({
        where: { id: node.id },
        data: { parentId: params.newParentId ?? null, depth: newDepth, path: newPathPrefix },
      }),
      ...descendants.map(d =>
        db.regulationNode.update({
          where: { id: d.id },
          data: {
            depth: d.depth + depthDelta,
            path: newPathPrefix + d.path.slice(oldPathPrefix.length),
          },
        })
      ),
    ])

    await logAuditAction({
      superAdminId: params.adminId,
      action: AuditAction.REGULATION_UPDATED,
      targetType: 'regulation',
      targetId: node.regulationId,
      targetName: '',
      details: { action: 'node_moved', nodeId: node.id, newParentId: params.newParentId } as Prisma.InputJsonValue,
    })

    return { success: true }
  },
}

// ─── Regulation Applicability Categories + Node Applicability (appended) ──
// New, additive capability alongside the node tree above. DPDP's own
// DATA_FIDUCIARY / SIGNIFICANT_DF categories already exist as data (from
// the Phase 2 backfill) — this is the CRUD to manage those and define a
// new regulation's own categories (e.g. SEBI's MII / Qualified RE / ...).

export const regulationApplicabilityService = {
  async listCategories(regulationId: string) {
    const db = getSuperAdminPrisma()
    return db.regulationApplicabilityCategory.findMany({
      where: { regulationId },
      orderBy: { orderIndex: 'asc' },
    })
  },

  async createCategory(params: {
    regulationId: string
    code: string
    label: string
    criteriaSummary?: string
    orderIndex?: number
    adminId: string
  }) {
    const db = getSuperAdminPrisma()
    const regulation = await db.regulation.findUnique({ where: { id: params.regulationId } })
    if (!regulation) throw new Error('Regulation not found')

    const existing = await db.regulationApplicabilityCategory.findUnique({
      where: { regulationId_code: { regulationId: params.regulationId, code: params.code } },
    })
    if (existing) throw new Error(`Category "${params.code}" already exists for this regulation`)

    const count = await db.regulationApplicabilityCategory.count({ where: { regulationId: params.regulationId } })

    return db.regulationApplicabilityCategory.create({
      data: {
        regulationId: params.regulationId,
        code: params.code,
        label: params.label,
        criteriaSummary: params.criteriaSummary,
        orderIndex: params.orderIndex ?? count,
      },
    })
  },

  async updateCategory(params: {
    categoryId: string
    data: Partial<{ code: string; label: string; criteriaSummary: string; orderIndex: number }>
    adminId: string
  }) {
    const db = getSuperAdminPrisma()
    const category = await db.regulationApplicabilityCategory.findUnique({ where: { id: params.categoryId } })
    if (!category) throw new Error('Category not found')

    if (params.data.code && params.data.code !== category.code) {
      const dup = await db.regulationApplicabilityCategory.findUnique({
        where: { regulationId_code: { regulationId: category.regulationId, code: params.data.code } },
      })
      if (dup) throw new Error(`Category "${params.data.code}" already exists for this regulation`)
    }

    return db.regulationApplicabilityCategory.update({ where: { id: params.categoryId }, data: params.data })
  },

  async deleteCategory(categoryId: string) {
    const db = getSuperAdminPrisma()
    const category = await db.regulationApplicabilityCategory.findUnique({
      where: { id: categoryId },
      include: { _count: { select: { nodeApplicabilities: true, controlApplicabilities: true, tenantClassifications: true } } },
    })
    if (!category) throw new Error('Category not found')

    const inUse = category._count.nodeApplicabilities + category._count.controlApplicabilities + category._count.tenantClassifications
    if (inUse > 0) {
      throw new Error(`Cannot delete: category is referenced by ${inUse} record(s) (node applicability, control applicability, or tenant classifications).`)
    }

    await db.regulationApplicabilityCategory.delete({ where: { id: categoryId } })
    return { success: true }
  },

  async setNodeApplicability(params: {
    nodeId: string
    applicabilityCategoryId: string
    status: NodeApplicabilityStatus
    note?: string
    adminId: string
  }) {
    const db = getSuperAdminPrisma()
    const node = await db.regulationNode.findUnique({ where: { id: params.nodeId } })
    if (!node) throw new Error('Node not found')
    const category = await db.regulationApplicabilityCategory.findUnique({ where: { id: params.applicabilityCategoryId } })
    if (!category) throw new Error('Applicability category not found')
    if (category.regulationId !== node.regulationId) throw new Error('Category belongs to a different regulation than the node')

    return db.nodeApplicability.upsert({
      where: { nodeId_applicabilityCategoryId: { nodeId: params.nodeId, applicabilityCategoryId: params.applicabilityCategoryId } },
      create: { nodeId: params.nodeId, applicabilityCategoryId: params.applicabilityCategoryId, status: params.status, note: params.note },
      update: { status: params.status, note: params.note },
    })
  },

  async listNodeApplicabilities(nodeId: string) {
    const db = getSuperAdminPrisma()
    return db.nodeApplicability.findMany({
      where: { nodeId },
      include: { applicabilityCategory: true },
      orderBy: { applicabilityCategory: { orderIndex: 'asc' } },
    })
  },
}