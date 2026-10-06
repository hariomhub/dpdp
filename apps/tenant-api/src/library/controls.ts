import { lib } from './client'
import { NodeRef, PLATFORM_CONTROL, RegulationSummary, getNodesOfRegulations, getRegulationSummaries, topLevelOf } from './regulations'

/**
 * Platform controls (the vendor's published Library controls), with the places they are cited in regulations.
 *
 * Citations are presented in the shape the portal's screens already use ("chapter" = the top-level node a citation sits
 * under, "section" = the cited node when it is deeper). The node id is carried too (`nodeId`).
 */

export interface CitationView {
  regulationId: string
  nodeId: string
  chapterId: string | null
  sectionId: string | null
  regulation: RegulationSummary
  chapter: { id: string; name: string; title: string | null } | null
  section: { id: string; name: string; title: string | null } | null
}

/** One citation, from a node id. Pure given the lookup tables, so platform and custom controls share it. */
export function toCitation(
  nodeId: string,
  nodes: Map<string, NodeRef>,
  regulations: Map<string, RegulationSummary>,
): CitationView | null {
  const node = nodes.get(nodeId)
  const regulation = node && regulations.get(node.regulationId)
  if (!node || !regulation) return null
  const top = topLevelOf(nodes, node.id)
  const isDeeper = !!top && top.id !== node.id
  return {
    regulationId: node.regulationId,
    nodeId: node.id,
    chapterId: top?.id ?? null,
    sectionId: isDeeper ? node.id : null,
    regulation,
    chapter: top ? { id: top.id, name: top.code, title: top.title } : null,
    section: isDeeper ? { id: node.id, name: node.code, title: node.title } : null,
  }
}

/** Where each platform control is cited, primary citation first. */
export async function citationsFor(controlIds: string[]): Promise<Map<string, CitationView[]>> {
  const out = new Map<string, CitationView[]>()
  if (controlIds.length === 0) return out

  const links = await lib().controlNode.findMany({
    where: { controlId: { in: controlIds } },
    select: { controlId: true, nodeId: true, node: { select: { regulationId: true } } },
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
  })
  const regulationIds = [...new Set(links.map(l => l.node.regulationId))]
  const [nodes, regs] = await Promise.all([getNodesOfRegulations(regulationIds), getRegulationSummaries(regulationIds)])
  const regById = new Map(regs.map(r => [r.id, r]))

  for (const l of links) {
    const c = toCitation(l.nodeId, nodes, regById)
    if (!c) continue
    const list = out.get(l.controlId) ?? []
    list.push(c)
    out.set(l.controlId, list)
  }
  return out
}

const LIST_ACTIONS = {
  orderBy: { orderIndex: 'asc' as const },
  select: { id: true, title: true, description: true, evidenceTypes: true, suggestedDueDays: true, priority: true, orderIndex: true },
}

/** Published platform controls with their actions and citations. */
export async function listPlatformControls() {
  const controls = await lib().control.findMany({
    where: PLATFORM_CONTROL, include: { predefinedActions: LIST_ACTIONS }, orderBy: { createdAt: 'asc' },
  })
  const cites = await citationsFor(controls.map(c => c.id))
  return controls.map(c => ({ ...c, regulationMappings: cites.get(c.id) ?? [] }))
}

export async function getPlatformControl(id: string) {
  const c = await lib().control.findFirst({ where: { id, ...PLATFORM_CONTROL }, include: { predefinedActions: LIST_ACTIONS } })
  if (!c) return null
  return { ...c, regulationMappings: (await citationsFor([id])).get(id) ?? [] }
}

/** A control with everything the task screen needs: citations and actions with suggested products and sample evidence. */
export async function getPlatformControlForTask(id: string) {
  const c = await lib().control.findFirst({
    where: { id, isCustom: false },
    include: {
      predefinedActions: {
        orderBy: { orderIndex: 'asc' },
        include: { products: { include: { product: true, masterEvidences: true } } },
      },
    },
  })
  if (!c) return null
  return { ...c, regulationMappings: (await citationsFor([id])).get(id) ?? [] }
}

/** Title / description / chapter label for a set of platform controls (task lists, assessment detail). */
export async function getPlatformControlHeads(ids: string[]) {
  if (ids.length === 0) return new Map<string, { id: string; title: string; description: string; chapter: string | null }>()
  const controls = await lib().control.findMany({ where: { id: { in: ids }, isCustom: false }, select: { id: true, title: true, description: true } })
  const cites = await citationsFor(controls.map(c => c.id))
  return new Map(controls.map(c => [c.id, { ...c, chapter: cites.get(c.id)?.[0]?.chapter?.name ?? null }]))
}

export async function getProductNames(ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map()
  const rows = await lib().product.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })
  return new Map(rows.map(p => [p.id, p.name]))
}

export async function getMasterEvidence(id: string) {
  return lib().masterEvidence.findUnique({ where: { id } })
}
