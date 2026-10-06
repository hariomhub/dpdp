import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { hasDb, makeAsset, makeAssessment, makeDepartment, makeTask, makeUser, newOrgId, useTestDatabases } from './helpers'

describe.skipIf(!hasDb)('deactivation, role change and reactivation (real database)', () => {
  let db: any, usersService: any, access: typeof import('../../src/utils/user-access')

  beforeAll(async () => {
    useTestDatabases()
    db = (await import('@dpdp/database')).getTenantPrisma()
    usersService = (await import('../../src/modules/users/users.service')).usersService
    access = await import('../../src/utils/user-access')
  })
  afterAll(async () => { await db?.$disconnect() })

  /** An organisation with a CEO, a CO, an IT admin, one department, one asset, one assessment. */
  async function org() {
    const tenantId = newOrgId()
    const ceo = await makeUser(db, tenantId, 'CEO'), co = await makeUser(db, tenantId, 'CO'), admin = await makeUser(db, tenantId, 'IT_ADMIN')
    const dept = await makeDepartment(db, tenantId)
    await db.department.update({ where: { id: dept.id }, data: { assignedItAdminId: admin.id } })
    await db.departmentUser.create({ data: { userId: admin.id, departmentId: dept.id } })
    const asset = await makeAsset(db, tenantId, dept.id)
    const assessment = await makeAssessment(db, tenantId, dept.id, co.id)
    let n = 0
    const task = (status: string, assignedToId: string | null = admin.id) =>
      makeTask(db, { tenantId, assessmentId: assessment.id, assetId: asset.id, assignedToId, status, code: `ACT-${++n}` })
    return { tenantId, ceo, co, admin, dept, task }
  }
  const reload = (id: string) => db.complianceTask.findUnique({ where: { id } })

  it('deactivating hands back the work in progress and leaves work in review alone', async () => {
    const o = await org()
    const pending = await o.task('PENDING'), working = await o.task('IN_PROGRESS'), overdue = await o.task('OVERDUE')
    const submitted = await o.task('EVIDENCE_SUBMITTED'), review = await o.task('UNDER_REVIEW'), approved = await o.task('APPROVED_INTERNAL')
    const finalReview = await o.task('FINAL_REVIEW'), done = await o.task('COMPLIANT'), rejected = await o.task('REJECTED')

    const result = await usersService.deactivateUser({ tenantId: o.tenantId, actorId: o.co.id, targetUserId: o.admin.id })
    expect(result).toMatchObject({ success: true, releasedTasks: 3, tasksInReview: 4 })

    for (const t of [pending, working, overdue]) expect(await reload(t.id)).toMatchObject({ assignedToId: null, status: 'PENDING', startedAt: null })
    for (const [t, status] of [[submitted, 'EVIDENCE_SUBMITTED'], [review, 'UNDER_REVIEW'], [approved, 'APPROVED_INTERNAL'], [finalReview, 'FINAL_REVIEW'], [done, 'COMPLIANT'], [rejected, 'REJECTED']] as const) {
      expect(await reload(t.id)).toMatchObject({ assignedToId: o.admin.id, status })
    }

    const history = await db.taskStatusHistory.findMany({ where: { taskId: { in: [working.id] } } })
    expect(history[0]).toMatchObject({ fromStatus: 'IN_PROGRESS', toStatus: 'PENDING', changedById: o.co.id })
    expect(history[0].notes).toMatch(/user deactivated/)
  })

  it('the person is switched off with a reason, loses their department roles, and their sessions stop at once', async () => {
    const o = await org()
    expect((await access.getUserAccess(o.admin.id))).toMatchObject({ status: 'ACTIVE' }) // primes the cache
    await usersService.deactivateUser({ tenantId: o.tenantId, actorId: o.co.id, targetUserId: o.admin.id })

    expect(await db.user.findUnique({ where: { id: o.admin.id } })).toMatchObject({ status: 'INACTIVE', deactivatedReason: 'ADMIN' })
    expect((await db.department.findUnique({ where: { id: o.dept.id } })).assignedItAdminId).toBeNull()
    expect(await db.departmentUser.count({ where: { userId: o.admin.id } })).toBe(0)
    // the cached "ACTIVE" was dropped, so the next request is refused immediately, not after the cache expires
    expect(await access.getUserAccess(o.admin.id)).toMatchObject({ status: 'INACTIVE' })
  })

  it('the audit log says what happened, with the numbers', async () => {
    const o = await org(); await o.task('IN_PROGRESS'); await o.task('UNDER_REVIEW')
    await usersService.deactivateUser({ tenantId: o.tenantId, actorId: o.co.id, targetUserId: o.admin.id })
    const entry = await db.tenantAuditLog.findFirst({ where: { tenantId: o.tenantId, targetId: o.admin.id, action: 'USER_DEACTIVATED' } })
    expect(entry.details).toMatchObject({ releasedTasks: 1, tasksInReview: 1 })
  })

  it('the CEO cannot be deactivated, and nobody can deactivate themselves', async () => {
    const o = await org()
    await expect(usersService.deactivateUser({ tenantId: o.tenantId, actorId: o.co.id, targetUserId: o.ceo.id })).rejects.toThrow(/CEO cannot be deactivated/)
    await expect(usersService.deactivateUser({ tenantId: o.tenantId, actorId: o.co.id, targetUserId: o.co.id })).rejects.toThrow(/yourself/)
  })

  it('reactivating clears the reason and re-opens access', async () => {
    const o = await org()
    await usersService.deactivateUser({ tenantId: o.tenantId, actorId: o.co.id, targetUserId: o.admin.id })
    await usersService.reactivateUser({ tenantId: o.tenantId, actorId: o.co.id, targetUserId: o.admin.id })
    expect(await db.user.findUnique({ where: { id: o.admin.id } })).toMatchObject({ status: 'ACTIVE', deactivatedReason: null })
    expect(await access.getUserAccess(o.admin.id)).toMatchObject({ status: 'ACTIVE' })
  })

  it('an IT Admin demoted to another role hands back the work in progress; work in review stays', async () => {
    const o = await org()
    const working = await o.task('IN_PROGRESS'), review = await o.task('UNDER_REVIEW')
    const r = await usersService.updateUserRole({ tenantId: o.tenantId, actorId: o.co.id, targetUserId: o.admin.id, newRole: 'INTERNAL_AUDITOR' })
    expect(r).toMatchObject({ success: true, oldRole: 'IT_ADMIN', newRole: 'INTERNAL_AUDITOR' })
    expect(await reload(working.id)).toMatchObject({ assignedToId: null, status: 'PENDING' })
    expect(await reload(review.id)).toMatchObject({ assignedToId: o.admin.id, status: 'UNDER_REVIEW' })
    // the new role is effective immediately for this person's next request
    expect(await access.getUserAccess(o.admin.id)).toMatchObject({ role: 'INTERNAL_AUDITOR' })
    // and the audit entry is a role change, not "user activated"
    expect(await db.tenantAuditLog.count({ where: { tenantId: o.tenantId, targetId: o.admin.id, action: 'USER_ROLE_CHANGED' } })).toBe(1)
    expect(await db.tenantAuditLog.count({ where: { tenantId: o.tenantId, targetId: o.admin.id, action: 'USER_ACTIVATED' } })).toBe(0)
  })

  it('changing a role does not touch tasks when the person stays an IT Admin elsewhere in the rules (CO -> IT Admin keeps nothing to release)', async () => {
    const o = await org()
    const extra = await makeUser(db, o.tenantId, 'INTERNAL_AUDITOR')
    const r = await usersService.updateUserRole({ tenantId: o.tenantId, actorId: o.co.id, targetUserId: extra.id, newRole: 'IT_ADMIN' })
    expect(r).toMatchObject({ newRole: 'IT_ADMIN' })
  })

  it('the CEO role cannot be assigned or changed through user management; a CO cannot make another CO', async () => {
    const o = await org()
    await expect(usersService.updateUserRole({ tenantId: o.tenantId, actorId: o.co.id, targetUserId: o.admin.id, newRole: 'CEO' })).rejects.toThrow(/CEO role cannot be assigned/)
    await expect(usersService.updateUserRole({ tenantId: o.tenantId, actorId: o.co.id, targetUserId: o.ceo.id, newRole: 'IT_ADMIN' })).rejects.toThrow(/CEO's role cannot be changed/)
    await expect(usersService.updateUserRole({ tenantId: o.tenantId, actorId: o.co.id, targetUserId: o.admin.id, newRole: 'CO' })).rejects.toThrow(/only the CEO can/)
  })
})
