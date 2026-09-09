import { getSuperAdminPrisma } from '@dpdp/database'

const adminDb = getSuperAdminPrisma()

const CONTROL_INCLUDE = {
  regulationMappings: {
    include: {
      regulation: { select: { id: true, name: true, shortCode: true } },
      chapter:    { select: { id: true, name: true, title: true } },
      section:    { select: { id: true, name: true, title: true } },
    },
  },
  predefinedActions: {
    orderBy: { orderIndex: 'asc' as const },
    select: {
      id: true, title: true, description: true, evidenceTypes: true,
      suggestedDueDays: true, priority: true, orderIndex: true,
    },
  },
}

export const controlsService = {
  // Published platform controls + this tenant's own custom controls
  async listControls(tenantId: string) {
    return adminDb.control.findMany({
      where: {
        OR: [
          { status: 'PUBLISHED', isCustom: false, tenantId: null },
          { isCustom: true, tenantId },
        ],
      },
      include: CONTROL_INCLUDE,
      orderBy: { createdAt: 'asc' },
    })
  },

  async getControl(tenantId: string, id: string) {
    const control = await adminDb.control.findFirst({
      where: {
        id,
        OR: [
          { status: 'PUBLISHED', isCustom: false, tenantId: null },
          { isCustom: true, tenantId },
        ],
      },
      include: CONTROL_INCLUDE,
    })
    if (!control) throw new Error('Control not found')
    return control
  },

  async createCustomControl(tenantId: string, data: {
    title: string; description: string; applicableTo: 'DATA_FIDUCIARY' | 'SIGNIFICANT_DF' | 'BOTH'
    regulationMappings?: { regulationId: string; chapterId?: string; sectionId?: string }[]
    predefinedActions: {
      title: string; description: string; evidenceTypes: string[]
      suggestedDueDays: number; priority: string
    }[]
  }) {
    if (!data.predefinedActions || data.predefinedActions.length === 0) {
      throw new Error('At least one predefined action is required')
    }

    return adminDb.control.create({
      data: {
        title: data.title,
        description: data.description,
        applicableTo: data.applicableTo,
        status: 'PUBLISHED',
        isCustom: true,
        tenantId,
        regulationMappings: data.regulationMappings?.length ? {
          create: data.regulationMappings.map(m => ({
            regulationId: m.regulationId,
            chapterId: m.chapterId || undefined,
            sectionId: m.sectionId || undefined,
          })),
        } : undefined,
        predefinedActions: {
          create: data.predefinedActions.map((a, i) => ({
            title: a.title, description: a.description,
            evidenceTypes: a.evidenceTypes as any, suggestedDueDays: a.suggestedDueDays,
            priority: a.priority as any, orderIndex: i,
          })),
        },
      },
      include: CONTROL_INCLUDE,
    })
  },
}
