import { lib } from './client'
import { getOrgSummary, getRegulationClassification } from '../platform/tenant-profile'

/**
 * Regulations and their structure, read from the regulation NODE tree (a regulation's own hierarchy: chapters,
 * sections, clauses, standards - any depth). The old chapter/section tables are no longer read.
 *
 * The portal's screens still speak of "chapters", so the top-level nodes are presented as chapters (compatibility
 * shape); the node ids are what identify them.
 */

export interface RegulationSummary { id: string; name: string; shortCode: string }
export type RegulationWithStatus = RegulationSummary & { status: string }

export interface NodeRef {
  id: string
  regulationId: string
  parentId: string | null
  nodeType: string
  code: string
  title: string | null
  depth: number
  orderIndex: number
}

export interface LibraryControl {
  id: string
  title: string
  description: string
  applicableTo: string
  status: string
  isCustom: boolean
}

export interface RegulationGroup {
  /** id of the top-level node */
  id: string
  /** the node's own citation, e.g. "Chapter 2" */
  name: string
  title: string | null
  /** true when the whole group is mandatory for this organisation */
  isMandatory: boolean
  orderIndex: number
  controls: Array<LibraryControl & { isMandatory: boolean }>
}

export interface RegulationTree {
  regulation: RegulationWithStatus
  groups: RegulationGroup[]
  /** control id -> where it sits and whether it is mandatory (for server-side exclusion checks) */
  placement: Map<string, { groupId: string; groupName: string; groupTitle: string | null; isMandatory: boolean }>
}

export const PLATFORM_CONTROL = { status: 'PUBLISHED', isCustom: false, tenantId: null } as const

export async function getRegulationSummaries(ids: string[]): Promise<RegulationSummary[]> {
  if (ids.length === 0) return []
  return lib().regulation.findMany({ where: { id: { in: ids } }, select: { id: true, shortCode: true, name: true } })
}

export async function listActiveRegulations(): Promise<RegulationSummary[]> {
  return lib().regulation.findMany({ where: { status: 'ACTIVE' }, orderBy: { name: 'asc' } })
}

/**
 * Which applicability category (e.g. "Significant Data Fiduciary") this organisation falls in for one regulation.
 * An explicit per-regulation classification wins; otherwise the organisation's general classification is matched by
 * label or code. null = unknown (callers then take the stricter reading, see isMandatoryFor).
 */
export async function resolveCategoryId(tenantId: string, regulationId: string, categories: Array<{ id: string; code: string; label: string }>): Promise<string | null> {
  const explicit = await getRegulationClassification(tenantId, regulationId)
  if (explicit) return explicit

  const label = (await getOrgSummary(tenantId))?.classification?.trim().toLowerCase()
  if (!label) return null
  return categories.find(c => c.label.toLowerCase() === label || c.code.toLowerCase() === label)?.id ?? null
}

/**
 * The regulation's tree with its published platform controls, grouped under the top-level nodes.
 *
 *  - A control is listed once, under the top-level node of its primary citation in this regulation.
 *  - A node is MANDATORY for this organisation when node applicability says so for its category (or, when the
 *    organisation's category is unknown, for ANY category - the stricter reading, so nothing mandatory can be dropped).
 *    Mandatory is inherited: everything below a mandatory node is mandatory.
 */
export async function loadRegulationTree(tenantId: string, regulationId: string): Promise<RegulationTree | null> {
  const regulation = await lib().regulation.findUnique({ where: { id: regulationId }, select: { id: true, shortCode: true, name: true, status: true } })
  if (!regulation) return null

  const [nodes, categories, mandatoryRows, links] = await Promise.all([
    lib().regulationNode.findMany({
      where: { regulationId },
      select: { id: true, regulationId: true, parentId: true, nodeType: true, code: true, title: true, depth: true, orderIndex: true },
      orderBy: [{ depth: 'asc' }, { orderIndex: 'asc' }],
    }),
    lib().regulationApplicabilityCategory.findMany({ where: { regulationId }, select: { id: true, code: true, label: true } }),
    lib().nodeApplicability.findMany({ where: { node: { regulationId }, status: 'MANDATORY' }, select: { nodeId: true, applicabilityCategoryId: true } }),
    lib().controlNode.findMany({
      where: { node: { regulationId }, control: PLATFORM_CONTROL },
      include: { control: true },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    }),
  ])

  const categoryId = await resolveCategoryId(tenantId, regulationId, categories)
  const mandatoryNodeIds = new Set(
    mandatoryRows.filter(r => categoryId === null || r.applicabilityCategoryId === categoryId).map(r => r.nodeId),
  )

  const byId = new Map(nodes.map(n => [n.id, n]))
  const rootOf = (id: string): NodeRef | undefined => {
    let cur = byId.get(id)
    for (let guard = 0; cur && cur.parentId && guard < 100; guard++) cur = byId.get(cur.parentId)
    return cur
  }
  const effectivelyMandatory = (id: string): boolean => {
    let cur = byId.get(id)
    for (let guard = 0; cur && guard < 100; guard++) {
      if (mandatoryNodeIds.has(cur.id)) return true
      cur = cur.parentId ? byId.get(cur.parentId) : undefined
    }
    return false
  }

  const groups = new Map<string, RegulationGroup>()
  for (const root of nodes.filter(n => !n.parentId)) {
    groups.set(root.id, { id: root.id, name: root.code, title: root.title, isMandatory: effectivelyMandatory(root.id), orderIndex: root.orderIndex, controls: [] })
  }

  const placement: RegulationTree['placement'] = new Map()
  const mandatoryControls = new Set(links.filter(l => effectivelyMandatory(l.nodeId)).map(l => l.controlId))
  for (const link of links) {
    if (placement.has(link.controlId)) continue            // first (primary) citation wins
    const root = rootOf(link.nodeId)
    const group = root && groups.get(root.id)
    if (!group) continue
    const isMandatory = mandatoryControls.has(link.controlId)
    group.controls.push({ ...(link.control as LibraryControl), isMandatory })
    placement.set(link.controlId, { groupId: group.id, groupName: group.name, groupTitle: group.title, isMandatory })
  }

  return { regulation, groups: [...groups.values()].sort((a, b) => a.orderIndex - b.orderIndex), placement }
}

/** Node references by id (for showing where a control is cited). */
export async function getNodeRefs(ids: string[]): Promise<Map<string, NodeRef>> {
  if (ids.length === 0) return new Map()
  const rows = await lib().regulationNode.findMany({
    where: { id: { in: ids } },
    select: { id: true, regulationId: true, parentId: true, nodeType: true, code: true, title: true, depth: true, orderIndex: true },
  })
  return new Map(rows.map(r => [r.id, r]))
}

/** All nodes of the given regulations, for resolving a node's top-level ancestor. */
export async function getNodesOfRegulations(regulationIds: string[]): Promise<Map<string, NodeRef>> {
  if (regulationIds.length === 0) return new Map()
  const rows = await lib().regulationNode.findMany({
    where: { regulationId: { in: regulationIds } },
    select: { id: true, regulationId: true, parentId: true, nodeType: true, code: true, title: true, depth: true, orderIndex: true },
  })
  return new Map(rows.map(r => [r.id, r]))
}

/** Top-level ancestor of a node (the node itself when it is top-level). */
export function topLevelOf(nodes: Map<string, NodeRef>, id: string): NodeRef | undefined {
  let cur = nodes.get(id)
  for (let guard = 0; cur && cur.parentId && guard < 100; guard++) cur = nodes.get(cur.parentId)
  return cur
}
