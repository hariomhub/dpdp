import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { randomUUID } from 'crypto'
import { hasDb, makeAsset, makeAssessment, makeDepartment, makeTask, makeUser, newOrgId, useTestDatabases } from './helpers'

describe.skipIf(!hasDb)('directory (Entra) sync (real database, fake directory)', () => {
  let db: any, run: typeof import('../../src/modules/entra/entra-sync').runDirectorySync

  beforeAll(async () => {
    useTestDatabases()
    db = (await import('@dpdp/database')).getTenantPrisma()
    run = (await import('../../src/modules/entra/entra-sync')).runDirectorySync
  })
  afterAll(async () => { await db?.$disconnect() })

  type Member = { id: string; email: string; displayName?: string }
  const member = (email: string, id = randomUUID()): Member => ({ id, email, displayName: email.split('@')[0] })

  /** One organisation with a Microsoft connection, a CEO, a CO and an IT-admin group (optionally an auditor group). */
  async function org(groups: Record<string, Member[]> = {}) {
    const tenantId = newOrgId()
    await db.entraConfig.create({ data: { tenantId, tenantDomain: 'x.onmicrosoft.com', clientId: randomUUID(), clientSecretEncrypted: 'x', azureTenantId: randomUUID() } })
    const ceo = await makeUser(db, tenantId, 'CEO'), co = await makeUser(db, tenantId, 'CO')
    const dept = await makeDepartment(db, tenantId)
    const mappings: Record<string, any> = {}
    for (const [name, role] of [['it', 'IT_ADMIN'], ['audit', 'INTERNAL_AUDITOR']] as const) {
      mappings[name] = await db.entraGroupMapping.create({ data: { tenantId, entraGroupId: randomUUID(), entraGroupName: name, role, departmentId: dept.id } })
    }
    const directory: Record<string, Member[]> = { it: [], audit: [], ...groups }
    const sync = (confirmRemovals = false, fetchOverride?: any) => run({
      db,
      fetchMembers: fetchOverride ?? (async (m: any) => directory[Object.keys(mappings).find(k => mappings[k].id === m.id)!]),
    }, { tenantId, userId: co.id, confirmRemovals })
    return { tenantId, ceo, co, dept, mappings, directory, sync }
  }
  const userByEmail = (tenantId: string, email: string) => db.user.findFirst({ where: { tenantId, email } })

  it('creates new people with the group\'s role and department, and makes the first IT Admin the department\'s primary', async () => {
    const o = await org({ it: [member('Asha@Example.test'), member('ravi@example.test')] })
    const r = await o.sync()
    expect(r).toMatchObject({ synced: 2, created: 2, updated: 0, deactivated: 0, failed: [] })

    const asha = await userByEmail(o.tenantId, 'asha@example.test')            // e-mail stored lower-case
    expect(asha).toMatchObject({ role: 'IT_ADMIN', status: 'ACTIVE', source: 'ENTRA_ID', syncedGroupId: o.mappings.it.id })
    expect(await db.departmentUser.count({ where: { departmentId: o.dept.id } })).toBe(2)
    expect((await db.department.findUnique({ where: { id: o.dept.id } })).assignedItAdminId).toBeTruthy()
    expect((await db.entraConfig.findUnique({ where: { tenantId: o.tenantId } })).lastSyncAt).toBeTruthy()
    expect(await db.tenantAuditLog.count({ where: { tenantId: o.tenantId, action: 'ENTRA_SYNC_COMPLETED' } })).toBe(1)
  })

  it('never touches the CEO or a Compliance Officer, even when they appear in a group or are missing from every group', async () => {
    const o = await org()
    await db.user.update({ where: { id: o.co.id }, data: { source: 'ENTRA_ID', entraObjectId: randomUUID() } })   // signed in with SSO once
    await db.user.update({ where: { id: o.ceo.id }, data: { source: 'ENTRA_ID', entraObjectId: randomUUID() } })
    o.directory.it = [member(o.co.email), member(o.ceo.email), member('someone@example.test')]   // CO and CEO are in the IT group
    const r = await o.sync()
    expect(r).toMatchObject({ created: 1, skippedProtected: 2, deactivated: 0 })
    expect(await db.user.findUnique({ where: { id: o.co.id } })).toMatchObject({ role: 'CO', status: 'ACTIVE' })
    expect(await db.user.findUnique({ where: { id: o.ceo.id } })).toMatchObject({ role: 'CEO', status: 'ACTIVE' })

    o.directory.it = []   // now missing from every group
    const again = await o.sync(true)   // confirmed: the one real IT admin leaves
    expect(again.deactivated).toBe(1)
    expect(await db.user.findUnique({ where: { id: o.co.id } })).toMatchObject({ status: 'ACTIVE' })
    expect(await db.user.findUnique({ where: { id: o.ceo.id } })).toMatchObject({ status: 'ACTIVE' })
  })

  it('does not re-enable someone an administrator switched off; does re-enable someone sync switched off', async () => {
    const o = await org()
    const byAdmin = await makeUser(db, o.tenantId, 'IT_ADMIN', { status: 'INACTIVE', deactivatedReason: 'ADMIN' })
    const bySync = await makeUser(db, o.tenantId, 'IT_ADMIN', { status: 'INACTIVE', deactivatedReason: 'ENTRA_SYNC', source: 'ENTRA_ID', syncedGroupId: o.mappings.it.id })
    const unknown = await makeUser(db, o.tenantId, 'IT_ADMIN', { status: 'INACTIVE', deactivatedReason: null })
    o.directory.it = [member(byAdmin.email), member(bySync.email), member(unknown.email)]

    const r = await o.sync()
    expect(r).toMatchObject({ skippedDeactivatedByAdmin: 2, reactivated: 1 })
    expect(await db.user.findUnique({ where: { id: byAdmin.id } })).toMatchObject({ status: 'INACTIVE', deactivatedReason: 'ADMIN' })
    expect(await db.user.findUnique({ where: { id: unknown.id } })).toMatchObject({ status: 'INACTIVE' })
    expect(await db.user.findUnique({ where: { id: bySync.id } })).toMatchObject({ status: 'ACTIVE', deactivatedReason: null })
  })

  it('removing someone from the group deactivates them: work in progress is handed back, work in review stays, department roles go', async () => {
    const o = await org({ it: [member('stays@example.test')] })
    await o.sync()
    const leaver = await makeUser(db, o.tenantId, 'IT_ADMIN', { source: 'ENTRA_ID', syncedGroupId: o.mappings.it.id, entraObjectId: randomUUID() })
    await db.department.update({ where: { id: o.dept.id }, data: { assignedItAdminId: leaver.id } })
    const asset = await makeAsset(db, o.tenantId, o.dept.id), assessment = await makeAssessment(db, o.tenantId, o.dept.id, o.co.id)
    const working = await makeTask(db, { tenantId: o.tenantId, assessmentId: assessment.id, assetId: asset.id, assignedToId: leaver.id, status: 'IN_PROGRESS', code: 'ACT-1' })
    const review = await makeTask(db, { tenantId: o.tenantId, assessmentId: assessment.id, assetId: asset.id, assignedToId: leaver.id, status: 'UNDER_REVIEW', code: 'ACT-2' })

    const r = await o.sync()   // 1 of 2 managed users removed (50%) but only 1 person: under the minimum count, no confirmation needed
    expect(r.deactivated).toBe(1)
    expect(await db.user.findUnique({ where: { id: leaver.id } })).toMatchObject({ status: 'INACTIVE', deactivatedReason: 'ENTRA_SYNC' })
    expect(await db.complianceTask.findUnique({ where: { id: working.id } })).toMatchObject({ assignedToId: null, status: 'PENDING' })
    expect(await db.complianceTask.findUnique({ where: { id: review.id } })).toMatchObject({ assignedToId: leaver.id, status: 'UNDER_REVIEW' })
    expect((await db.department.findUnique({ where: { id: o.dept.id } })).assignedItAdminId).not.toBe(leaver.id)
  })

  it('refuses a sync that would remove too many people, changes nothing, and works once confirmed', async () => {
    const people = Array.from({ length: 10 }, (_, i) => member(`p${i}@example.test`))
    const o = await org({ it: people })
    await o.sync()
    o.directory.it = people.slice(0, 5)    // half the team disappears (e.g. a wrong group was selected)

    const err: any = await o.sync().catch(e => e)
    expect(err).toMatchObject({ status: 409, extra: { requiresConfirmation: true, wouldDeactivate: 5, activeManaged: 10 } })
    expect(await db.user.count({ where: { tenantId: o.tenantId, source: 'ENTRA_ID', status: 'ACTIVE' } })).toBe(10)   // nothing changed
    expect(await db.tenantAuditLog.count({ where: { tenantId: o.tenantId, action: 'ENTRA_SYNC_REFUSED' } })).toBe(1)

    const done = await o.sync(true)
    expect(done.deactivated).toBe(5)
    expect(await db.user.count({ where: { tenantId: o.tenantId, source: 'ENTRA_ID', status: 'ACTIVE' } })).toBe(5)
  })

  it('an empty answer from the directory is refused, not treated as "everyone left"', async () => {
    const o = await org({ it: [member('a@example.test'), member('b@example.test')] })
    await o.sync()
    o.directory.it = []
    const err: any = await o.sync().catch(e => e)
    expect(err.status).toBe(409)
    expect(err.message).toMatch(/returned no members/)
    expect(await db.user.count({ where: { tenantId: o.tenantId, source: 'ENTRA_ID', status: 'ACTIVE' } })).toBe(2)
  })

  it('a directory failure aborts before anything is written, and does not leave the lock held', async () => {
    const o = await org()
    await expect(o.sync(false, async () => { throw new Error('Graph is down') })).rejects.toThrow('Graph is down')
    expect(await db.user.count({ where: { tenantId: o.tenantId } })).toBe(2)       // just the CEO and CO
    expect((await db.entraConfig.findUnique({ where: { tenantId: o.tenantId } })).syncStartedAt).toBeNull()
    o.directory.it = [member('ok@example.test')]
    expect((await o.sync()).created).toBe(1)                                         // the next sync runs
  })

  it('two syncs cannot overlap; a lease abandoned by a dead process is taken over', async () => {
    const o = await org({ it: [member('x@example.test')] })
    let release!: () => void
    const gate = new Promise<void>(resolve => { release = resolve })
    const slow = o.sync(false, async () => { await gate; return [] })   // first sync waits on the directory
    await new Promise(r => setTimeout(r, 50))
    const second: any = await o.sync().catch(e => e)
    expect(second).toMatchObject({ status: 409 })
    expect(second.message).toMatch(/already running/)
    release(); await slow.catch(() => undefined)

    await db.entraConfig.update({ where: { tenantId: o.tenantId }, data: { syncStartedAt: new Date(Date.now() - 60 * 60 * 1000) } })   // an hour-old lease
    expect((await o.sync()).created).toBe(1)
  })

  it('matches a person by their directory id, so a changed e-mail address does not create a duplicate account', async () => {
    const oid = randomUUID()
    const o = await org({ it: [member('old.name@example.test', oid)] })
    await o.sync()
    o.directory.it = [{ id: oid, email: 'new.name@example.test', displayName: 'Renamed' }]
    const r = await o.sync()
    expect(r).toMatchObject({ created: 0, updated: 1 })
    expect(await db.user.count({ where: { tenantId: o.tenantId, entraObjectId: oid } })).toBe(1)
  })

  it('first group wins when a person is in several; a person managed by another group keeps that group\'s role', async () => {
    const dup = member('both@example.test')
    const o = await org({ it: [dup], audit: [dup] })
    await o.sync()
    expect(await userByEmail(o.tenantId, 'both@example.test')).toMatchObject({ role: 'IT_ADMIN', syncedGroupId: o.mappings.it.id })
    await o.sync()   // second run: the audit group does not take them over
    expect(await userByEmail(o.tenantId, 'both@example.test')).toMatchObject({ role: 'IT_ADMIN' })
  })

  it('a stored mapping to a role a group may not grant (CO) is ignored and reported, never applied', async () => {
    const o = await org()
    const bad = await db.entraGroupMapping.create({ data: { tenantId: o.tenantId, entraGroupId: randomUUID(), entraGroupName: 'compliance-officers', role: 'CO', departmentId: null } })
    const r = await run({ db, fetchMembers: async (m: any) => (m.id === bad.id ? [member('sneaky@example.test')] : []) }, { tenantId: o.tenantId, userId: o.co.id })
    expect(r.skippedMappings).toEqual(['compliance-officers (CO)'])
    expect(await userByEmail(o.tenantId, 'sneaky@example.test')).toBeNull()
  })

  it('promotes nobody to CEO/CO and reassigns an existing member to the group role only when the group owns them', async () => {
    const o = await org()
    const manual = await makeUser(db, o.tenantId, 'INTERNAL_AUDITOR')        // invited by hand as an auditor
    o.directory.it = [member(manual.email)]                                    // later also appears in the IT group
    await o.sync()
    expect(await db.user.findUnique({ where: { id: manual.id } })).toMatchObject({ role: 'IT_ADMIN', source: 'ENTRA_ID', syncedGroupId: o.mappings.it.id })
  })
})
