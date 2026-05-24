import { getSuperAdminPrisma } from '@dpdp/database'
import { RegulationStatus, AuditAction, Prisma } from '@prisma/super-admin-client'
import { parsePagination, buildMeta } from '../../utils/pagination'
import { logAuditAction } from '../../utils/audit-logger'

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
    data: Partial<{ name: string; title: string; orderIndex: number }>
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