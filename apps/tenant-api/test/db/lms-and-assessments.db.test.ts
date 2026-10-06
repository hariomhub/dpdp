import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { randomUUID } from 'crypto'
import { hasDb, makeAsset, makeDepartment, makeUser, newOrgId, useTestDatabases } from './helpers'

describe.skipIf(!hasDb)('LMS designations and assessments (real databases)', () => {
  let db: any, sa: any, lms: any, assessments: any

  beforeAll(async () => {
    useTestDatabases()
    const database = await import('@dpdp/database')
    db = database.getTenantPrisma(); sa = database.getSuperAdminPrisma()
    lms = (await import('../../src/modules/lms/lms.service')).lmsService
    assessments = (await import('../../src/modules/assessments/assessments.service')).assessmentsService
  })
  afterAll(async () => { await db?.$disconnect(); await sa?.$disconnect() })

  describe('bulk designation', () => {
    it('changes only this organisation\'s people, rejects a foreign or unknown id without half-applying, and audits it', async () => {
      const designation = await sa.lmsDesignation.create({ data: { name: `CISO-${randomUUID().slice(0, 6)}` } })
      const org = newOrgId(), other = newOrgId()
      const mine1 = await makeUser(db, org, 'IT_ADMIN'), mine2 = await makeUser(db, org, 'IT_ADMIN'), co = await makeUser(db, org, 'CO')
      const foreign = await makeUser(db, other, 'IT_ADMIN')

      // a foreign id in the selection: nothing changes, not even for the valid ones
      await expect(lms.bulkSetDesignation(org, co.id, [mine1.id, foreign.id], designation.name)).rejects.toMatchObject({ status: 400, message: expect.stringMatching(/not found in your organization/) })
      expect((await db.user.findUnique({ where: { id: mine1.id } })).lmsDesignation).toBeNull()
      expect((await db.user.findUnique({ where: { id: foreign.id } })).lmsDesignation).toBeNull()

      const ok = await lms.bulkSetDesignation(org, co.id, [mine1.id, mine2.id, mine1.id], designation.name)
      expect(ok).toMatchObject({ updated: 2 })
      expect((await db.user.findUnique({ where: { id: mine2.id } })).lmsDesignation).toBe(designation.name)
      expect((await db.user.findUnique({ where: { id: foreign.id } })).lmsDesignation).toBeNull()
      expect(await db.tenantAuditLog.count({ where: { tenantId: org, action: 'USER_UPDATED', targetType: 'lms_designation' } })).toBe(1)
    })

    it('refuses a designation that does not exist or is switched off', async () => {
      const org = newOrgId(), co = await makeUser(db, org, 'CO'), u = await makeUser(db, org, 'IT_ADMIN')
      await expect(lms.bulkSetDesignation(org, co.id, [u.id], 'Nonexistent Title')).rejects.toMatchObject({ status: 400, message: expect.stringMatching(/not an available designation/) })
      const off = await sa.lmsDesignation.create({ data: { name: `Retired-${randomUUID().slice(0, 6)}`, isActive: false } })
      await expect(lms.setUserDesignation(org, co.id, u.id, off.name)).rejects.toMatchObject({ status: 400 })
      expect((await db.user.findUnique({ where: { id: u.id } })).lmsDesignation).toBeNull()
    })

    it('single-user assignment scopes the write to the organisation too', async () => {
      const designation = await sa.lmsDesignation.create({ data: { name: `DPO-${randomUUID().slice(0, 6)}` } })
      const org = newOrgId(), other = newOrgId()
      const co = await makeUser(db, org, 'CO'), foreign = await makeUser(db, other, 'IT_ADMIN')
      await expect(lms.setUserDesignation(org, co.id, foreign.id, designation.name)).rejects.toThrow(/User not found/)
      expect((await db.user.findUnique({ where: { id: foreign.id } })).lmsDesignation).toBeNull()
    })
  })

  describe('createAssessment', () => {
    /** A regulation with 3 published controls on a node of its tree (what the portal reads), plus an organisation with 2 assets. */
    async function setup() {
      const reg = await sa.regulation.create({ data: { name: 'Test Reg', shortCode: `T-${randomUUID().slice(0, 8)}`, issuingAuthority: 'Test', description: 'd', effectiveDate: new Date(), status: 'ACTIVE' } })
      const chapter = await sa.regulationNode.create({ data: { regulationId: reg.id, nodeType: 'Chapter', code: 'Chapter 1', depth: 0, path: '' } })
      const controls = []
      for (let i = 1; i <= 3; i++) {
        const c = await sa.control.create({ data: { title: `Control ${i}`, description: 'd', status: 'PUBLISHED' } })
        await sa.controlNode.create({ data: { controlId: c.id, nodeId: chapter.id, isPrimary: true } })
        controls.push(c)
      }
      const tenantId = newOrgId()
      const co = await makeUser(db, tenantId, 'CO'), admin = await makeUser(db, tenantId, 'IT_ADMIN')
      const dept = await makeDepartment(db, tenantId)
      await db.department.update({ where: { id: dept.id }, data: { assignedItAdminId: admin.id } })
      const a1 = await makeAsset(db, tenantId, dept.id), a2 = await makeAsset(db, tenantId, dept.id)
      const input = (assetIds = [a1.id, a2.id], extra: object = {}) => ({
        name: `Assessment ${randomUUID().slice(0, 4)}`, departmentId: dept.id, regulationId: reg.id,
        startDate: new Date().toISOString(), endDate: new Date(Date.now() + 864e5 * 30).toISOString(), assetIds, ...extra,
      })
      return { tenantId, co, admin, dept, a1, a2, controls, reg, input }
    }
    const codes = async (tenantId: string) =>
      (await db.complianceTask.findMany({ where: { tenantId }, select: { taskCode: true } })).map((t: any) => Number(t.taskCode.slice(4))).sort((a: number, b: number) => a - b)

    it('creates one task per control per asset with consecutive codes, auto-delegated to the department\'s IT Admin', async () => {
      const s = await setup()
      const a = await assessments.createAssessment(s.tenantId, s.co.id, s.input())
      expect(a.id).toBeTruthy()
      expect(await codes(s.tenantId)).toEqual([1, 2, 3, 4, 5, 6])
      const tasks = await db.complianceTask.findMany({ where: { assessmentId: a.id } })
      expect(tasks.every((t: any) => t.assignedToId === s.admin.id && t.status === 'PENDING')).toBe(true)
      expect((await db.assessment.findUnique({ where: { id: a.id } })).openTasks).toBe(6)

      await assessments.createAssessment(s.tenantId, s.co.id, s.input([s.a1.id]))   // the next assessment continues the sequence
      expect(await codes(s.tenantId)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])
    })

    it('two assessments created at the same moment both succeed and never share a task code', async () => {
      const s = await setup()
      const results = await Promise.allSettled(Array.from({ length: 5 }, () => assessments.createAssessment(s.tenantId, s.co.id, s.input())))
      expect(results.map(r => r.status)).toEqual(Array(5).fill('fulfilled'))
      const all = await codes(s.tenantId)
      expect(all).toEqual(Array.from({ length: 30 }, (_, i) => i + 1))   // 5 x 6 tasks, no duplicate, no gap
    })

    it('rejects a department, asset or assignee that is not this organisation\'s, and creates nothing', async () => {
      const s = await setup(), other = await setup()
      const count = () => db.assessment.count({ where: { tenantId: s.tenantId } })

      await expect(assessments.createAssessment(s.tenantId, s.co.id, s.input([s.a1.id, other.a1.id]))).rejects.toMatchObject({ status: 400, message: expect.stringMatching(/assets were not found/) })
      await expect(assessments.createAssessment(s.tenantId, s.co.id, s.input(undefined, { departmentId: other.dept.id }))).rejects.toMatchObject({ status: 400, message: expect.stringMatching(/Department not found/) })
      await expect(assessments.createAssessment(s.tenantId, s.co.id, s.input(undefined, { taskAssignments: [{ controlId: s.controls[0].id, assetId: s.a1.id, assigneeId: other.admin.id }] })))
        .rejects.toMatchObject({ status: 400, message: expect.stringMatching(/not active IT Admins/) })
      const inactive = await makeUser(db, s.tenantId, 'IT_ADMIN', { status: 'INACTIVE' })
      await expect(assessments.createAssessment(s.tenantId, s.co.id, s.input(undefined, { taskAssignments: [{ controlId: s.controls[0].id, assetId: s.a1.id, assigneeId: inactive.id }] })))
        .rejects.toMatchObject({ status: 400 })
      expect(await count()).toBe(0)
      expect(await codes(s.tenantId)).toEqual([])
    })

    it('a manual assignment to an active IT Admin of this organisation is honoured', async () => {
      const s = await setup()
      const second = await makeUser(db, s.tenantId, 'IT_ADMIN')
      const a = await assessments.createAssessment(s.tenantId, s.co.id, s.input([s.a1.id], {
        taskAssignments: [{ controlId: s.controls[0].id, assetId: s.a1.id, assigneeId: second.id }],
      }))
      const mine = await db.complianceTask.findMany({ where: { assessmentId: a.id, assignedToId: second.id } })
      expect(mine).toHaveLength(1)
    })

    it('a failed creation rolls the code reservation back (no gap in the next assessment)', async () => {
      const s = await setup()
      await assessments.createAssessment(s.tenantId, s.co.id, s.input([s.a1.id]))      // ACT-001..003
      await expect(assessments.createAssessment(s.tenantId, s.co.id, s.input([s.a1.id], { regulationId: randomUUID() }))).rejects.toThrow(/Regulation not found/)
      await assessments.createAssessment(s.tenantId, s.co.id, s.input([s.a2.id]))      // continues at ACT-004
      expect(await codes(s.tenantId)).toEqual([1, 2, 3, 4, 5, 6])
    })
  })
})
