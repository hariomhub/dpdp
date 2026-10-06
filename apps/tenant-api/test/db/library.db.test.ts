import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { randomUUID } from 'crypto'
import { hasDb, makeAsset, makeDepartment, makeUser, newOrgId, useTestDatabases } from './helpers'

/**
 * The tenant plane reads regulations and controls from the regulation NODE tree (src/library), and keeps its own
 * custom controls in its own database. Seeds a small regulation in the (scratch) Super Admin database.
 */
describe.skipIf(!hasDb)('Library read layer: regulation nodes, mandatory rule, custom controls (real databases)', () => {
  let db: any, sa: any
  let regs: typeof import('../../src/library/regulations'), ctl: typeof import('../../src/library/controls')
  let controlsService: any, assessments: any, directory: typeof import('../../src/modules/controls/control-directory')

  beforeAll(async () => {
    useTestDatabases()
    const database = await import('@dpdp/database')
    db = database.getTenantPrisma(); sa = database.getSuperAdminPrisma()
    regs = await import('../../src/library/regulations'); ctl = await import('../../src/library/controls')
    directory = await import('../../src/modules/controls/control-directory')
    controlsService = (await import('../../src/modules/controls/controls.service')).controlsService
    assessments = (await import('../../src/modules/assessments/assessments.service')).assessmentsService
  })
  afterAll(async () => { await db?.$disconnect(); await sa?.$disconnect() })

  async function world(classification: string | null = 'Significant Data Fiduciary') {
    const reg = await sa.regulation.create({ data: { name: 'Reg', shortCode: `R-${randomUUID().slice(0, 8)}`, issuingAuthority: 'x', description: 'd', effectiveDate: new Date(), status: 'ACTIVE' } })
    const df = await sa.regulationApplicabilityCategory.create({ data: { regulationId: reg.id, code: 'DATA_FIDUCIARY', label: 'Data Fiduciary' } })
    const sdf = await sa.regulationApplicabilityCategory.create({ data: { regulationId: reg.id, code: 'SIGNIFICANT_DF', label: 'Significant Data Fiduciary' } })
    const node = (o: object) => sa.regulationNode.create({ data: { regulationId: reg.id, nodeType: 'Chapter', code: 'X', depth: 0, path: '', ...o } })
    const chA = await node({ code: 'Chapter A', title: 'Duties', orderIndex: 1 })
    const secA1 = await node({ code: 'Section A1', title: 'Notice', nodeType: 'Section', parentId: chA.id, depth: 1 })
    const chB = await node({ code: 'Chapter B', title: 'Rights', orderIndex: 2 })
    // Chapter A is mandatory for Significant Data Fiduciaries only
    await sa.nodeApplicability.create({ data: { nodeId: chA.id, applicabilityCategoryId: sdf.id, status: 'MANDATORY' } })

    const control = (title: string, o: object = {}) => sa.control.create({ data: { title, description: `${title} desc`, status: 'PUBLISHED', ...o } })
    const c1 = await control('Notice control'), c2 = await control('Rights control'), c3 = await control('Draft control', { status: 'DRAFT' })
    const c4 = await control('Shared control'), c5 = await control('Some tenant control', { isCustom: true, tenantId: randomUUID() })
    const link = (controlId: string, nodeId: string, isPrimary = true) => sa.controlNode.create({ data: { controlId, nodeId, isPrimary } })
    await link(c1.id, secA1.id); await link(c2.id, chB.id); await link(c3.id, chB.id); await link(c5.id, chB.id)
    await link(c4.id, secA1.id, true); await link(c4.id, chB.id, false)

    const tenantId = newOrgId()
    if (classification !== null) {
      // the organisation's own record, in the tenant database
      await db.tenantProfile.create({ data: { id: tenantId, tenantCode: `T${randomUUID().slice(0, 8)}`, name: 'Org', contactEmail: 'a@b.test', ceoName: 'x', ceoEmail: 'a@b.test', classification } })
    }
    return { reg, df, sdf, chA, secA1, chB, c1, c2, c3, c4, c5, tenantId }
  }
  const ids = (cs: Array<{ id: string }>) => cs.map(c => c.id).sort()

  it('groups platform controls under their top-level node; a control appears once; drafts and tenant-authored are excluded', async () => {
    const w = await world()
    const tree = (await regs.loadRegulationTree(w.tenantId, w.reg.id))!
    expect(tree.groups.map(g => g.name)).toEqual(['Chapter A', 'Chapter B'])
    expect(ids(tree.groups[0].controls)).toEqual(ids([w.c1, w.c4]))     // c1 sits on a section; c4's primary citation is that section
    expect(ids(tree.groups[1].controls)).toEqual(ids([w.c2]))           // c4 is not repeated here; draft c3 and tenant-authored c5 never appear
    expect(tree.groups[0]).toMatchObject({ id: w.chA.id, title: 'Duties' })
  })

  it('mandatory follows the organisation\'s classification, and is inherited by everything below a mandatory node', async () => {
    const sdf = await world('Significant Data Fiduciary')
    let tree = (await regs.loadRegulationTree(sdf.tenantId, sdf.reg.id))!
    expect(tree.groups.map(g => g.isMandatory)).toEqual([true, false])
    expect(tree.placement.get(sdf.c1.id)).toMatchObject({ isMandatory: true })   // c1 is under a section of the mandatory chapter
    expect(tree.placement.get(sdf.c2.id)).toMatchObject({ isMandatory: false })

    const df = await world('Data Fiduciary')
    tree = (await regs.loadRegulationTree(df.tenantId, df.reg.id))!
    expect(tree.groups.map(g => g.isMandatory)).toEqual([false, false])
  })

  it('an explicit per-regulation classification beats the general one; an unknown classification takes the stricter reading', async () => {
    const w = await world('Data Fiduciary')
    await db.tenantRegulationClassification.create({ data: { tenantId: w.tenantId, regulationId: w.reg.id, applicabilityCategoryId: w.sdf.id } })
    expect((await regs.loadRegulationTree(w.tenantId, w.reg.id))!.groups[0].isMandatory).toBe(true)

    const unknown = await world(null)      // no such organisation record at all
    expect((await regs.loadRegulationTree(unknown.tenantId, unknown.reg.id))!.groups[0].isMandatory).toBe(true)
  })

  it('citations keep the portal\'s existing shape: chapter = top-level node, section = the cited node when deeper', async () => {
    const w = await world()
    const all = await ctl.listPlatformControls()
    const c1 = all.find(c => c.id === w.c1.id)!
    expect(c1.regulationMappings[0]).toMatchObject({
      regulationId: w.reg.id, chapterId: w.chA.id, sectionId: w.secA1.id, nodeId: w.secA1.id,
      chapter: { id: w.chA.id, name: 'Chapter A', title: 'Duties' }, section: { id: w.secA1.id, name: 'Section A1' },
    })
    const c4 = all.find(c => c.id === w.c4.id)!
    expect(c4.regulationMappings).toHaveLength(2)                       // cited in both places, primary first
    expect(c4.regulationMappings[0].chapter?.name).toBe('Chapter A')
    expect(all.find(c => c.id === w.c3.id)).toBeUndefined()             // draft not listed
  })

  describe('custom controls live in the organisation\'s own database', () => {
    const action = { title: 'Do it', description: 'Do the thing', evidenceTypes: ['FILE'], suggestedDueDays: 14, priority: 'HIGH' }

    it('are stored in the tenant database (nothing is written to the vendor\'s), cited by node, and listed with the platform controls', async () => {
      const w = await world()
      const before = await sa.control.count()
      const made = await controlsService.createCustomControl(w.tenantId, undefined, {
        title: 'Our own control', description: 'Written by the customer', applicableTo: 'BOTH',
        regulationMappings: [{ regulationId: w.reg.id, chapterId: w.chA.id, sectionId: w.secA1.id }], predefinedActions: [action],
      })
      expect(await sa.control.count()).toBe(before)                      // the vendor's database is untouched
      expect(await db.customControl.count({ where: { id: made.id, tenantId: w.tenantId } })).toBe(1)
      expect(made).toMatchObject({ isCustom: true, status: 'PUBLISHED' })
      expect(made.regulationMappings[0]).toMatchObject({ regulationId: w.reg.id, chapterId: w.chA.id, sectionId: w.secA1.id })
      expect(made.predefinedActions).toHaveLength(1)

      const list = await controlsService.listControls(w.tenantId)
      expect(list.map((c: any) => c.id)).toContain(made.id)
      expect(list.map((c: any) => c.id)).toContain(w.c1.id)
      // another organisation never sees it
      expect((await controlsService.listControls(newOrgId())).map((c: any) => c.id)).not.toContain(made.id)
      await expect(controlsService.getControl(newOrgId(), made.id)).rejects.toMatchObject({ status: 404 })
    })

    it('refuses a citation whose chapter belongs to another regulation, or a regulation that does not exist', async () => {
      const a = await world(), b = await world()
      await expect(controlsService.createCustomControl(a.tenantId, undefined, {
        title: 'Bad cite', description: 'x', applicableTo: 'BOTH', regulationMappings: [{ regulationId: a.reg.id, chapterId: b.chA.id }], predefinedActions: [action],
      })).rejects.toMatchObject({ status: 400, message: expect.stringMatching(/does not belong/) })
      await expect(controlsService.createCustomControl(a.tenantId, undefined, {
        title: 'No reg', description: 'x', applicableTo: 'BOTH', regulationMappings: [{ regulationId: randomUUID() }], predefinedActions: [action],
      })).rejects.toMatchObject({ status: 400 })
      await expect(controlsService.createCustomControl(a.tenantId, undefined, { title: 'No actions', description: 'x', applicableTo: 'BOTH', predefinedActions: [] }))
        .rejects.toMatchObject({ status: 400 })
    })

    it('are resolved for the task screen and for titles, like platform controls', async () => {
      const w = await world()
      const made = await controlsService.createCustomControl(w.tenantId, undefined, { title: 'Mine', description: 'd', applicableTo: 'BOTH', predefinedActions: [action] })
      const forTask: any = await directory.getControlForTask(w.tenantId, made.id)
      expect(forTask.predefinedActions[0]).toMatchObject({ title: 'Do it', products: [] })
      const heads = await directory.getControlHeads(w.tenantId, [made.id, w.c1.id], w.reg.id)
      expect(heads.get(made.id)).toMatchObject({ title: 'Mine', chapter: 'Custom Control' })
      expect(heads.get(w.c1.id)).toMatchObject({ title: 'Notice control', chapter: 'Chapter A' })
    })
  })

  describe('assessments over the node tree', () => {
    async function ready() {
      const w = await world('Significant Data Fiduciary')
      const co = await makeUser(db, w.tenantId, 'CO'), dept = await makeDepartment(db, w.tenantId), asset = await makeAsset(db, w.tenantId, dept.id)
      const custom = await controlsService.createCustomControl(w.tenantId, co.id, { title: 'Our control', description: 'd', applicableTo: 'BOTH', predefinedActions: [{ title: 'Do it', description: 'd', evidenceTypes: ['FILE'], suggestedDueDays: 7, priority: 'LOW' }] })
      const input = (exclusions?: Array<{ controlId: string; reason: string }>) => ({
        name: 'A', departmentId: dept.id, regulationId: w.reg.id, assetIds: [asset.id], exclusions,
        startDate: new Date().toISOString(), endDate: new Date(Date.now() + 864e5).toISOString(),
      })
      return { w, co, custom, input }
    }

    it('covers the regulation\'s platform controls plus the organisation\'s own', async () => {
      const { w, co, custom, input } = await ready()
      const a = await assessments.createAssessment(w.tenantId, co.id, input())
      const covered = (await db.assessmentControl.findMany({ where: { assessmentId: a.id } })).map((c: any) => c.controlId).sort()
      expect(covered).toEqual(ids([w.c1, w.c2, w.c4, { id: custom.id }]))   // not the draft, not another tenant's control
      expect(await db.complianceTask.count({ where: { assessmentId: a.id } })).toBe(4)
    })

    it('a mandatory control cannot be excluded (even if the client asks); an optional one can', async () => {
      const { w, co, input } = await ready()
      await expect(assessments.createAssessment(w.tenantId, co.id, input([{ controlId: w.c1.id, reason: 'skip' }])))
        .rejects.toThrow(/Cannot exclude controls from mandatory chapter "Duties"/)
      expect(await db.assessment.count({ where: { tenantId: w.tenantId } })).toBe(0)

      const ok = await assessments.createAssessment(w.tenantId, co.id, input([{ controlId: w.c2.id, reason: 'not relevant' }]))
      expect(await db.complianceTask.count({ where: { assessmentId: ok.id } })).toBe(3)
    })

    it('a regulation that is not ACTIVE cannot be assessed', async () => {
      const { w, co, input } = await ready()
      await sa.regulation.update({ where: { id: w.reg.id }, data: { status: 'ARCHIVED' } })
      await expect(assessments.createAssessment(w.tenantId, co.id, input())).rejects.toThrow(/not found or not active/)
    })

    it('the detail view labels every control with its chapter in this regulation (custom ones as "Custom Control")', async () => {
      const { w, co, custom, input } = await ready()
      const a = await assessments.createAssessment(w.tenantId, co.id, input())
      const detail = await assessments.getAssessment(w.tenantId, a.id)
      const byId = new Map(detail.controls.map((c: any) => [c.controlId, c]))
      expect(byId.get(w.c1.id)).toMatchObject({ title: 'Notice control', chapter: 'Chapter A' })
      expect(byId.get(w.c2.id)).toMatchObject({ chapter: 'Chapter B' })
      expect(byId.get(custom.id)).toMatchObject({ title: 'Our control', chapter: 'Custom Control' })
      expect(detail.regulationDetails).toMatchObject({ shortCode: w.reg.shortCode })
    })

    it('the assessment wizard list carries the groups, with mandatory flags for this organisation', async () => {
      const { w } = await ready()
      const list = await assessments.listRegulations(w.tenantId)
      const mine = list.find((r: any) => r.id === w.reg.id)
      expect(mine.chapters.map((c: any) => [c.name, c.isMandatory])).toEqual([['Chapter A', true], ['Chapter B', false]])
      expect(mine.chapters[0].controls.map((c: any) => c.id).sort()).toEqual(ids([w.c1, w.c4]))
    })
  })
})
