import { getTenantPrisma } from '@dpdp/database'
import {
  getPlatformControl, getPlatformControlForTask, getPlatformControlHeads, citationsFor, listPlatformControls,
} from '../../library/controls'
import { LibraryControl, loadRegulationTree, RegulationGroup, RegulationTree, RegulationWithStatus } from '../../library/regulations'
import { customControls } from './custom-controls'

/**
 * One view over every control an organisation can use: the vendor's published platform controls (from the Library) and
 * the organisation's own custom controls (from its database). Callers never need to know which is which.
 */
const db = getTenantPrisma()

export async function listControlsForTenant(tenantId: string) {
  const [platform, custom] = await Promise.all([listPlatformControls(), customControls.list(tenantId)])
  return [...platform, ...custom]
}

export async function getControlForTenant(tenantId: string, id: string) {
  return (await customControls.get(tenantId, id)) ?? (await getPlatformControl(id))
}

/** Everything the task screen shows about a control (custom controls have no suggested products or sample evidence). */
export async function getControlForTask(tenantId: string, id: string) {
  const custom = await customControls.get(tenantId, id)
  return custom ?? (await getPlatformControlForTask(id))
}

/** id -> { title, description, chapter } for platform and custom controls. `preferRegulationId` picks the citation to label. */
export async function getControlHeads(tenantId: string, ids: string[], preferRegulationId?: string) {
  const heads = new Map<string, { id: string; title: string; description: string; chapter: string | null }>()
  if (ids.length === 0) return heads

  const custom = await customControls.heads(tenantId, ids)
  for (const c of custom) heads.set(c.id, { ...c, chapter: 'Custom Control' })

  const platformIds = ids.filter(id => !heads.has(id))
  if (platformIds.length > 0) {
    const platform = await getPlatformControlHeads(platformIds)
    if (preferRegulationId) {
      const cites = await citationsFor(platformIds)
      for (const [id, head] of platform) {
        const forReg = cites.get(id)?.find(c => c.regulationId === preferRegulationId)
        if (forReg?.chapter) head.chapter = forReg.chapter.name
      }
    }
    for (const [id, head] of platform) heads.set(id, head)
  }
  return heads
}

export interface AssessmentScope {
  regulation: RegulationWithStatus
  groups: RegulationGroup[]
  /** every control the assessment would cover: platform controls of the regulation + all of this organisation's custom controls */
  controls: LibraryControl[]
  placement: RegulationTree['placement']
}

/** What an assessment of this regulation covers for this organisation, and which of it is mandatory. */
export async function loadAssessmentScope(tenantId: string, regulationId: string): Promise<AssessmentScope | null> {
  const tree = await loadRegulationTree(tenantId, regulationId)
  if (!tree) return null
  const custom = await db.customControl.findMany({ where: { tenantId }, select: { id: true, title: true, description: true, applicableTo: true } })

  const platform = tree.groups.flatMap(g => g.controls)
  const controls: LibraryControl[] = [
    ...platform,
    // An organisation's own controls apply to every assessment it runs; they are never mandatory.
    ...custom.map(c => ({ ...c, status: 'PUBLISHED', isCustom: true })),
  ]
  return { regulation: tree.regulation, groups: tree.groups, controls, placement: tree.placement }
}
