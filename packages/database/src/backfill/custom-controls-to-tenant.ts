/**
 * One-time move of tenant-authored ("custom") controls from the Super Admin database into the tenant database.
 *
 * Custom controls used to be stored in the vendor's control table with isCustom=true and a tenantId - customer data in
 * the control plane. They now live in the tenant database (custom_controls, custom_control_citations,
 * custom_control_actions). The copy KEEPS THE IDS of the control and of every action, so tasks, assessments and
 * evidence that already point at them keep working.
 *
 * Citations: old chapter/section links become node ids (chapter "Chapter 2" of regulation R -> the top-level node of R
 * with code "Chapter 2"; see node-cutover.ts). A link that cannot be matched to a node is kept as a citation of the
 * regulation as a whole and reported.
 *
 * Nothing is deleted from the Super Admin database. Safe to re-run (a control already copied is skipped).
 *
 *   npx ts-node packages/database/src/backfill/custom-controls-to-tenant.ts            dry run
 *   npx ts-node packages/database/src/backfill/custom-controls-to-tenant.ts --apply
 *
 * Run once per deployment, after node-cutover.ts and before the portal build that reads custom controls from the
 * tenant database is deployed.
 */
import { getSuperAdminPrisma, getTenantPrisma } from '../index'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const sa = getSuperAdminPrisma()
const tdb = getTenantPrisma()
const APPLY = process.argv.includes('--apply')

async function main() {
  console.log(APPLY ? 'APPLY mode.\n' : 'DRY RUN (add --apply to write).\n')

  const [controls, chapters, sections, nodes] = await Promise.all([
    sa.control.findMany({
      where: { isCustom: true, tenantId: { not: null } },
      include: { regulationMappings: true, predefinedActions: { orderBy: { orderIndex: 'asc' } } },
    }),
    sa.regulationChapter.findMany({ select: { id: true, regulationId: true, name: true } }),
    sa.regulationSection.findMany({ select: { id: true, chapterId: true, name: true } }),
    sa.regulationNode.findMany({ select: { id: true, regulationId: true, parentId: true, nodeType: true, code: true } }),
  ])

  const key = (r: string, p: string | null, t: string, c: string) => `${r}|${p ?? ''}|${t}|${c}`
  const nodeId = new Map(nodes.map(n => [key(n.regulationId, n.parentId, n.nodeType, n.code), n.id]))
  const chapterNode = new Map<string, string>()
  for (const c of chapters) { const id = nodeId.get(key(c.regulationId, null, 'Chapter', c.name)); if (id) chapterNode.set(c.id, id) }
  const sectionNode = new Map<string, string>()
  for (const s of sections) {
    const ch = chapters.find(c => c.id === s.chapterId), parent = chapterNode.get(s.chapterId)
    const id = ch && parent && nodeId.get(key(ch.regulationId, parent, 'Section', s.name))
    if (id) sectionNode.set(s.id, id)
  }

  let copied = 0, skipped = 0, citationsWholeRegulation = 0
  for (const c of controls) {
    if (await tdb.customControl.findUnique({ where: { id: c.id }, select: { id: true } })) { skipped++; continue }
    const citations = c.regulationMappings.map(m => {
      const node = (m.sectionId && sectionNode.get(m.sectionId)) || (m.chapterId && chapterNode.get(m.chapterId)) || null
      if (!node && (m.chapterId || m.sectionId)) citationsWholeRegulation++
      return { regulationId: m.regulationId, nodeId: node }
    })
    console.log(`  ${c.id}  tenant ${c.tenantId}  "${c.title}"  actions=${c.predefinedActions.length} citations=${citations.length}`)
    if (APPLY) {
      await tdb.customControl.create({
        data: {
          id: c.id, tenantId: c.tenantId as string, title: c.title, description: c.description, applicableTo: c.applicableTo,
          citations: { create: citations },
          actions: {
            create: c.predefinedActions.map(a => ({
              id: a.id, title: a.title, description: a.description, evidenceTypes: a.evidenceTypes as any,
              suggestedDueDays: a.suggestedDueDays, priority: a.priority as any, orderIndex: a.orderIndex,
            })),
          },
        },
      })
    }
    copied++
  }
  console.log(`\n${controls.length} custom control(s) found; ${APPLY ? 'copied' : 'to copy'}: ${copied}; already present: ${skipped}; citations kept at regulation level (no matching node): ${citationsWholeRegulation}.`)
}

main().catch(e => { console.error(e); process.exit(1) }).finally(async () => { await sa.$disconnect(); await tdb.$disconnect() })
