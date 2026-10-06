import { getTenantPrisma } from '@dpdp/database'
import { HttpError } from '../../utils/http-error'
import { CitationView, toCitation } from '../../library/controls'
import { getNodesOfRegulations, getRegulationSummaries } from '../../library/regulations'

/**
 * Controls an organisation writes for itself. They are tenant data and live in the tenant database
 * (custom_controls, ...), never in the vendor's Library. Citations point at Library regulation nodes.
 *
 * The view returned here has the same shape as a platform control, so the portal treats both alike.
 */
const db = getTenantPrisma()

const INCLUDE = { citations: true, actions: { orderBy: { orderIndex: 'asc' as const } } }

type Row = Awaited<ReturnType<typeof loadRows>>[number]

function loadRows(where: object) {
  return db.customControl.findMany({ where, include: INCLUDE, orderBy: { createdAt: 'asc' } })
}

async function toViews(rows: Row[]) {
  const regulationIds = [...new Set(rows.flatMap(r => r.citations.map(c => c.regulationId)))]
  const [nodes, regs] = await Promise.all([getNodesOfRegulations(regulationIds), getRegulationSummaries(regulationIds)])
  const regById = new Map(regs.map(r => [r.id, r]))

  return rows.map(r => {
    const regulationMappings: CitationView[] = r.citations.flatMap(c => {
      if (c.nodeId) {
        const v = toCitation(c.nodeId, nodes, regById)
        return v ? [v] : []
      }
      const regulation = regById.get(c.regulationId)   // cited against the regulation as a whole
      return regulation ? [{ regulationId: c.regulationId, nodeId: '', chapterId: null, sectionId: null, regulation, chapter: null, section: null }] : []
    })
    return {
      id: r.id, title: r.title, description: r.description, applicableTo: r.applicableTo,
      status: 'PUBLISHED', isCustom: true, tenantId: r.tenantId,
      createdAt: r.createdAt, updatedAt: r.updatedAt,
      regulationMappings,
      predefinedActions: r.actions.map(a => ({
        id: a.id, title: a.title, description: a.description, evidenceTypes: a.evidenceTypes,
        suggestedDueDays: a.suggestedDueDays, priority: a.priority, orderIndex: a.orderIndex,
        products: [] as unknown[],
      })),
    }
  })
}

export const customControls = {
  async list(tenantId: string) {
    return toViews(await loadRows({ tenantId }))
  },

  async get(tenantId: string, id: string) {
    const [row] = await loadRows({ tenantId, id })
    return row ? (await toViews([row]))[0] : null
  },

  /** Titles only, for resolving ids in task lists. */
  async heads(tenantId: string, ids: string[]) {
    if (ids.length === 0) return []
    return db.customControl.findMany({ where: { tenantId, id: { in: ids } }, select: { id: true, title: true, description: true } })
  },

  async create(tenantId: string, userId: string | undefined, data: {
    title: string; description: string; applicableTo: string
    citations: Array<{ regulationId: string; nodeId?: string }>
    actions: Array<{ title: string; description: string; evidenceTypes: string[]; suggestedDueDays: number; priority: string }>
  }) {
    // Every citation must point at a real regulation, and a node must belong to that regulation.
    const regulationIds = [...new Set(data.citations.map(c => c.regulationId))]
    const regs = await getRegulationSummaries(regulationIds)
    if (regs.length !== regulationIds.length) throw HttpError.badRequest('One or more regulations were not found.')
    const nodes = await getNodesOfRegulations(regulationIds)
    for (const c of data.citations) {
      if (c.nodeId && nodes.get(c.nodeId)?.regulationId !== c.regulationId) throw HttpError.badRequest('A chosen chapter or section does not belong to the chosen regulation.')
    }

    const created = await db.customControl.create({
      data: {
        tenantId, title: data.title, description: data.description, applicableTo: data.applicableTo, createdById: userId ?? null,
        citations: { create: data.citations.map(c => ({ regulationId: c.regulationId, nodeId: c.nodeId ?? null })) },
        actions: {
          create: data.actions.map((a, i) => ({
            title: a.title, description: a.description, evidenceTypes: a.evidenceTypes as any,
            suggestedDueDays: a.suggestedDueDays, priority: a.priority as any, orderIndex: i,
          })),
        },
      },
      include: INCLUDE,
    })
    return (await toViews([created]))[0]
  },
}
