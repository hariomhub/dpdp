/**
 * Phase 2 of the regulation-hierarchy migration (see AI conversation /
 * architecture discussion this belongs to). Populates the new generic
 * catalog tables — RegulationNode, RegulationApplicabilityCategory,
 * ControlNode, ControlApplicability, TenantRegulationClassification —
 * from the existing RegulationChapter / RegulationSection /
 * ControlRegulation / Control.applicableTo / Tenant.classification data.
 *
 * Does NOT touch, modify, or remove any of the old tables/columns —
 * those stay fully live and functional until a later, separate cleanup
 * migration, once this backfill has been verified against the app.
 *
 * Idempotent — every write is either an `update` (naturally idempotent)
 * or an `upsert`/find-before-create keyed on a natural identifier, so
 * re-running this script produces the same end state, not duplicates.
 */

import { getSuperAdminPrisma } from '../index'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const db = getSuperAdminPrisma()

// Mirrors today's ApplicableTo enum labels verbatim, for every
// regulation. This is NOT a claim that these are e.g. SEBI/RBI's real
// applicability categories — they aren't; SEBI/RBI controls today
// borrow DPDP's own vocabulary, a pre-existing data-quality issue this
// script deliberately preserves rather than silently "fixes" or
// reinterprets. Defining SEBI/RBI's real categories (MII, Qualified RE,
// etc.) is a separate, later content task via the new category UI.
const BASE_CATEGORIES = [
  { code: 'DATA_FIDUCIARY', label: 'Data Fiduciary' },
  { code: 'SIGNIFICANT_DF', label: 'Significant Data Fiduciary' },
] as const

async function backfillApplicabilityCategories() {
  console.log('\n[1/5] Regulation applicability categories...')
  const regulations = await db.regulation.findMany()
  const categoryId = new Map<string, string>() // key: `${regulationId}:${code}`

  for (const reg of regulations) {
    for (const cat of BASE_CATEGORIES) {
      const row = await db.regulationApplicabilityCategory.upsert({
        where: { regulationId_code: { regulationId: reg.id, code: cat.code } },
        create: { regulationId: reg.id, code: cat.code, label: cat.label },
        update: { label: cat.label },
      })
      categoryId.set(`${reg.id}:${cat.code}`, row.id)
    }
  }
  console.log(`  ${regulations.length} regulations x ${BASE_CATEGORIES.length} categories upserted.`)
  return categoryId
}

async function backfillNodes() {
  console.log('\n[2/5] Regulation node tree (chapters + sections)...')

  const [chapters, sections, existingNodes] = await Promise.all([
    db.regulationChapter.findMany({ orderBy: { orderIndex: 'asc' } }),
    db.regulationSection.findMany({ orderBy: { orderIndex: 'asc' } }),
    db.regulationNode.findMany(),
  ])

  const existingKey = (regulationId: string, parentId: string | null, nodeType: string, code: string) =>
    `${regulationId}:${parentId ?? 'root'}:${nodeType}:${code}`
  const existingByKey = new Map(existingNodes.map(n => [existingKey(n.regulationId, n.parentId, n.nodeType, n.code), n]))

  const chapterNodeId = new Map<string, string>() // old chapterId -> new nodeId
  const nodeMeta = new Map<string, { regulationId: string; path: string }>() // new nodeId -> {regulationId, path}
  let chapterCreated = 0

  for (const ch of chapters) {
    const key = existingKey(ch.regulationId, null, 'Chapter', ch.name)
    let node = existingByKey.get(key)
    if (!node) {
      const created = await db.regulationNode.create({
        data: {
          regulationId: ch.regulationId,
          parentId: null,
          nodeType: 'Chapter',
          code: ch.name,
          title: ch.title,
          orderIndex: ch.orderIndex,
          depth: 0,
          path: '',
        },
      })
      node = await db.regulationNode.update({ where: { id: created.id }, data: { path: created.id } })
      existingByKey.set(key, node)
      chapterCreated++
    }
    chapterNodeId.set(ch.id, node.id)
    nodeMeta.set(node.id, { regulationId: node.regulationId, path: node.path })
  }
  console.log(`  Chapters: ${chapters.length} source rows -> ${chapterCreated} new nodes (${chapters.length - chapterCreated} already existed).`)

  const sectionNodeId = new Map<string, string>() // old sectionId -> new nodeId
  let sectionCreated = 0

  for (const sec of sections) {
    const parentNodeId = chapterNodeId.get(sec.chapterId)
    if (!parentNodeId) {
      console.warn(`  Skipping section ${sec.id} ("${sec.name}") — parent chapter ${sec.chapterId} not found.`)
      continue
    }
    const parent = nodeMeta.get(parentNodeId)!
    const key = existingKey(parent.regulationId, parentNodeId, 'Section', sec.name)
    let node = existingByKey.get(key)
    if (!node) {
      const created = await db.regulationNode.create({
        data: {
          regulationId: parent.regulationId,
          parentId: parentNodeId,
          nodeType: 'Section',
          code: sec.name,
          title: sec.title,
          orderIndex: sec.orderIndex,
          depth: 1,
          path: '',
        },
      })
      node = await db.regulationNode.update({ where: { id: created.id }, data: { path: `${parent.path}.${created.id}` } })
      existingByKey.set(key, node)
      sectionCreated++
    }
    sectionNodeId.set(sec.id, node.id)
  }
  console.log(`  Sections: ${sections.length} source rows -> ${sectionCreated} new nodes (${sections.length - sectionCreated} already existed).`)

  return { chapterNodeId, sectionNodeId }
}

async function backfillControls(
  chapterNodeId: Map<string, string>,
  sectionNodeId: Map<string, string>,
  categoryId: Map<string, string>
) {
  console.log('\n[3/5] Control.regulationId, citedRegulationIds, ControlNode, ControlApplicability...')

  const controls = await db.control.findMany({
    include: {
      regulationMappings: { include: { regulation: true } },
      predefinedActions: { select: { id: true } },
    },
  })

  let homeSet = 0
  let multiRegControls = 0
  let controlNodeRows = 0
  let controlNodeSkippedNoNode = 0
  let applicabilityRows = 0
  let actionsStamped = 0

  for (const ctrl of controls) {
    if (ctrl.regulationMappings.length === 0) continue // custom control with no regulation link — nothing to backfill

    // Home = earliest-created regulation among this control's mappings —
    // deterministic and reproducible on re-run.
    const sorted = [...ctrl.regulationMappings].sort(
      (a, b) => a.regulation.createdAt.getTime() - b.regulation.createdAt.getTime()
    )
    const home = sorted[0]
    if (sorted.length > 1) multiRegControls++

    const citedRegulationIds = Array.from(new Set(ctrl.regulationMappings.map(m => m.regulationId)))

    await db.control.update({
      where: { id: ctrl.id },
      data: { regulationId: home.regulationId, citedRegulationIds },
    })
    homeSet++

    if (ctrl.predefinedActions.length > 0) {
      await db.controlPredefinedAction.updateMany({
        where: { controlId: ctrl.id },
        data: { regulationId: home.regulationId },
      })
      actionsStamped += ctrl.predefinedActions.length
    }

    for (const mapping of ctrl.regulationMappings) {
      const nodeId = (mapping.sectionId && sectionNodeId.get(mapping.sectionId)) || (mapping.chapterId && chapterNodeId.get(mapping.chapterId))
      if (!nodeId) {
        controlNodeSkippedNoNode++
        continue // "belongs to this regulation, no specific citation" — already captured via regulationId/citedRegulationIds
      }
      await db.controlNode.upsert({
        where: { controlId_nodeId: { controlId: ctrl.id, nodeId } },
        create: { controlId: ctrl.id, nodeId, isPrimary: mapping.regulationId === home.regulationId },
        update: { isPrimary: mapping.regulationId === home.regulationId },
      })
      controlNodeRows++
    }

    if (ctrl.applicableTo === 'SIGNIFICANT_DF') {
      const catId = categoryId.get(`${home.regulationId}:SIGNIFICANT_DF`)
      if (catId) {
        await db.controlApplicability.upsert({
          where: { controlId_applicabilityCategoryId: { controlId: ctrl.id, applicabilityCategoryId: catId } },
          create: { controlId: ctrl.id, applicabilityCategoryId: catId },
          update: {},
        })
        applicabilityRows++
      }
    }
    // 'BOTH' -> no ControlApplicability row (absence = applies broadly, matches today's semantics)
  }

  console.log(`  Controls processed: ${controls.length}. Home regulationId set on ${homeSet}.`)
  console.log(`  Controls spanning >1 regulation: ${multiRegControls} (kept as non-primary ControlNode links).`)
  console.log(`  ControlNode rows upserted: ${controlNodeRows} (${controlNodeSkippedNoNode} mappings had no chapter/section to attach to).`)
  console.log(`  ControlApplicability rows upserted (SIGNIFICANT_DF only): ${applicabilityRows}.`)
  console.log(`  ControlPredefinedAction.regulationId stamped on ${actionsStamped} actions.`)
}

async function backfillTenantClassifications(categoryId: Map<string, string>) {
  console.log('\n[4/5] Tenant per-regulation classification (DPDP only — the only regulation tenants are classified against today)...')

  const dpdp = await db.regulation.findFirst({ where: { shortCode: 'DPDP-2023' } })
  if (!dpdp) {
    console.warn('  DPDP-2023 regulation not found — skipping tenant classification backfill.')
    return
  }

  const tenants = await db.tenant.findMany()
  let created = 0
  let skipped = 0

  for (const t of tenants) {
    const code = t.classification === 'Significant Data Fiduciary' ? 'SIGNIFICANT_DF'
      : t.classification === 'Data Fiduciary' ? 'DATA_FIDUCIARY'
      : null
    if (!code) {
      console.warn(`  Tenant "${t.name}" (${t.id}) has unrecognized classification "${t.classification}" — skipped, not guessed.`)
      skipped++
      continue
    }
    const catId = categoryId.get(`${dpdp.id}:${code}`)
    if (!catId) {
      console.warn(`  Category ${code} not found for DPDP-2023 — skipped tenant "${t.name}".`)
      skipped++
      continue
    }
    await db.tenantRegulationClassification.upsert({
      where: { tenantId_regulationId: { tenantId: t.id, regulationId: dpdp.id } },
      create: {
        tenantId: t.id,
        regulationId: dpdp.id,
        applicabilityCategoryId: catId,
        isUncertain: t.classUncertain,
        classifiedAt: t.createdAt,
      },
      update: { applicabilityCategoryId: catId, isUncertain: t.classUncertain },
    })
    created++
  }
  console.log(`  Tenants processed: ${tenants.length}. Classifications upserted: ${created}. Skipped: ${skipped}.`)
}

async function verify() {
  console.log('\n[5/5] Verification...')

  const [nodeCount, chapterCount, sectionCount, controlNodeCount, controlsWithReg, controlsTotal, applicabilityCount, tenantClassCount, tenantCount] =
    await Promise.all([
      db.regulationNode.count(),
      db.regulationChapter.count(),
      db.regulationSection.count(),
      db.controlNode.count(),
      db.control.count({ where: { regulationId: { not: null } } }),
      db.control.count(),
      db.controlApplicability.count(),
      db.tenantRegulationClassification.count(),
      db.tenant.count(),
    ])

  console.log(`  regulation_nodes: ${nodeCount} (expected ${chapterCount + sectionCount} = ${chapterCount} chapters + ${sectionCount} sections)`)
  console.log(`  control_nodes: ${controlNodeCount}`)
  console.log(`  controls with regulationId set: ${controlsWithReg} / ${controlsTotal} total`)
  console.log(`  control_applicabilities: ${applicabilityCount}`)
  console.log(`  tenant_regulation_classifications: ${tenantClassCount} / ${tenantCount} tenants`)

  const mismatch = nodeCount !== chapterCount + sectionCount
  if (mismatch) {
    console.warn('  ⚠ Node count does not match chapters+sections — inspect the warnings above.')
  } else {
    console.log('  ✓ Node count matches source chapters+sections exactly.')
  }
}

async function main() {
  console.log('=== Regulation node hierarchy backfill (Phase 2) ===')
  console.log('Reading from: RegulationChapter, RegulationSection, ControlRegulation, Control.applicableTo, Tenant.classification')
  console.log('Writing to:   RegulationNode, RegulationApplicabilityCategory, ControlNode, ControlApplicability, TenantRegulationClassification')
  console.log('Old tables/columns are NOT modified or removed by this script.\n')

  const categoryId = await backfillApplicabilityCategories()
  const { chapterNodeId, sectionNodeId } = await backfillNodes()
  await backfillControls(chapterNodeId, sectionNodeId, categoryId)
  await backfillTenantClassifications(categoryId)
  await verify()

  console.log('\n=== Backfill complete ===')
  process.exit(0)
}

main().catch(err => {
  console.error('Backfill failed:', err)
  process.exit(1)
})
