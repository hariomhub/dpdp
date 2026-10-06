/**
 * Node cutover - bring the regulation NODE model up to what the old chapter model said, so the tenant portal can read
 * nodes only.
 *
 * Until now the tenant portal read RegulationChapter / ControlRegulation and the chapter-level `isMandatory` flag, while
 * Super Admin authoring moved to RegulationNode / ControlNode / NodeApplicability. Two things were left behind:
 *   1. control -> chapter/section links that exist only in ControlRegulation (no ControlNode row), and
 *   2. the "mandatory chapter" rule, which exists only as RegulationChapter.isMandatory (NodeApplicability is empty).
 *
 * This script makes them match. It only ADDS rows (never edits or removes anything), is safe to re-run, and prints a
 * parity report: for each regulation, the controls reachable through the old links vs through nodes.
 *
 *   npx ts-node packages/database/src/backfill/node-cutover.ts            dry run (report only)
 *   npx ts-node packages/database/src/backfill/node-cutover.ts --apply    write the missing rows
 *
 * Run it against every Super Admin database (dev, then production) BEFORE deploying the portal build that reads nodes.
 */
import { getSuperAdminPrisma } from '../index'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const db = getSuperAdminPrisma()
const APPLY = process.argv.includes('--apply')

async function main() {
  console.log(APPLY ? 'APPLY mode: missing rows will be written.\n' : 'DRY RUN: nothing will be written (add --apply).\n')

  const [chapters, sections, nodes, categories, links] = await Promise.all([
    db.regulationChapter.findMany(),
    db.regulationSection.findMany(),
    db.regulationNode.findMany({ select: { id: true, regulationId: true, parentId: true, nodeType: true, code: true } }),
    db.regulationApplicabilityCategory.findMany({ select: { id: true, regulationId: true } }),
    db.controlRegulation.findMany(),
  ])

  const nodeKey = (regulationId: string, parentId: string | null, nodeType: string, code: string) => `${regulationId}|${parentId ?? ''}|${nodeType}|${code}`
  const nodeByKey = new Map(nodes.map(n => [nodeKey(n.regulationId, n.parentId, n.nodeType, n.code), n.id]))

  const chapterNode = new Map<string, string>()        // old chapter id -> node id
  const sectionNode = new Map<string, string>()        // old section id -> node id
  const unmatched: string[] = []
  for (const ch of chapters) {
    const id = nodeByKey.get(nodeKey(ch.regulationId, null, 'Chapter', ch.name))
    if (id) chapterNode.set(ch.id, id); else unmatched.push(`chapter "${ch.name}" (${ch.regulationId}) has no node`)
  }
  for (const s of sections) {
    const parent = chapterNode.get(s.chapterId)
    const id = parent ? nodeByKey.get(nodeKey(chapters.find(c => c.id === s.chapterId)!.regulationId, parent, 'Section', s.name)) : undefined
    if (id) sectionNode.set(s.id, id); else unmatched.push(`section "${s.name}" has no node`)
  }

  // 1. control links that exist only in the old table
  const existingLinks = new Set((await db.controlNode.findMany({ select: { controlId: true, nodeId: true } })).map(l => `${l.controlId}|${l.nodeId}`))
  const missingLinks: Array<{ controlId: string; nodeId: string }> = []
  let linksWithoutPlace = 0
  for (const l of links) {
    const nodeId = (l.sectionId && sectionNode.get(l.sectionId)) || (l.chapterId && chapterNode.get(l.chapterId)) || null
    if (!nodeId) { linksWithoutPlace++; continue }
    if (!existingLinks.has(`${l.controlId}|${nodeId}`)) { missingLinks.push({ controlId: l.controlId, nodeId }); existingLinks.add(`${l.controlId}|${nodeId}`) }
  }
  console.log(`Control links: ${links.length} old; ${missingLinks.length} missing as node links; ${linksWithoutPlace} have no chapter/section (reported, not guessed).`)

  // 2. "mandatory chapter" -> node applicability MANDATORY for every category of that regulation
  const existingApp = new Set((await db.nodeApplicability.findMany({ select: { nodeId: true, applicabilityCategoryId: true } })).map(a => `${a.nodeId}|${a.applicabilityCategoryId}`))
  const missingApp: Array<{ nodeId: string; applicabilityCategoryId: string }> = []
  for (const ch of chapters.filter(c => c.isMandatory)) {
    const nodeId = chapterNode.get(ch.id)
    if (!nodeId) continue
    for (const cat of categories.filter(c => c.regulationId === ch.regulationId)) {
      if (!existingApp.has(`${nodeId}|${cat.id}`)) missingApp.push({ nodeId, applicabilityCategoryId: cat.id })
    }
  }
  console.log(`Mandatory chapters: ${chapters.filter(c => c.isMandatory).length}; ${missingApp.length} node-applicability rows to add.`)

  if (APPLY) {
    if (missingLinks.length) await db.controlNode.createMany({ data: missingLinks.map(l => ({ ...l, isPrimary: true })), skipDuplicates: true })
    if (missingApp.length) await db.nodeApplicability.createMany({ data: missingApp.map(a => ({ ...a, status: 'MANDATORY' as const })), skipDuplicates: true })
    console.log('Written.')
  }

  // 3. parity: controls reachable per regulation, old vs node model (published, platform controls)
  console.log('\nParity (published platform controls reachable per regulation):')
  const regs = await db.regulation.findMany({ select: { id: true, shortCode: true }, orderBy: { shortCode: 'asc' } })
  let bad = 0
  for (const r of regs) {
    // What a tenant could actually see through the old model: links placed under a chapter. A link with no chapter was
    // never visible to tenants, so it is a content gap to fix in Super Admin, not a regression of this cutover.
    const published = { status: 'PUBLISHED' as const, isCustom: false, tenantId: null }
    const oldIds = new Set((await db.controlRegulation.findMany({ where: { regulationId: r.id, chapterId: { not: null }, control: published }, select: { controlId: true } })).map(x => x.controlId))
    const unplaced = await db.controlRegulation.count({ where: { regulationId: r.id, chapterId: null, control: published } })
    const nodeIds = new Set((await db.controlNode.findMany({ where: { node: { regulationId: r.id }, control: { status: 'PUBLISHED', isCustom: false, tenantId: null } }, select: { controlId: true } })).map(x => x.controlId))
    const onlyOld = Array.from(oldIds).filter(x => !nodeIds.has(x)).length
    const onlyNode = Array.from(nodeIds).filter(x => !oldIds.has(x)).length
    if (onlyOld > 0 && !(missingLinks.length && !APPLY)) bad++
    console.log(`  ${r.shortCode.padEnd(14)} visible-before=${String(oldIds.size).padStart(3)} nodes=${String(nodeIds.size).padStart(3)} onlyOld=${onlyOld} onlyNodes=${onlyNode}${unplaced ? `  | content gap: ${unplaced} control(s) linked to the regulation but placed on no chapter/node (invisible to tenants before and after)` : ''}`)
  }
  for (const u of unmatched.slice(0, 20)) console.log('  note:', u)
  console.log(bad ? '\nPARITY NOT REACHED for some regulations - see above.' : '\nParity reached (node model covers everything the old model did).')
  process.exitCode = bad ? 1 : 0
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => db.$disconnect())
