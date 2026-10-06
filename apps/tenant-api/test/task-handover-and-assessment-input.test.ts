import { describe, expect, it, vi } from 'vitest'
import { IN_REVIEW_STATUSES, WORKING_STATUSES, releaseWorkingTasks } from '../src/modules/users/task-handover'
import { validateAssessmentReferences } from '../src/modules/assessments/assessment-input'

/** An in-memory stand-in for the part of the database the handover touches. */
function fakeDb(tasks: Array<{ id: string; status: string; assignedToId: string | null }>) {
  const history: any[] = []
  return {
    tasks, history,
    complianceTask: {
      findMany: async ({ where }: any) => tasks.filter(t => t.assignedToId === where.assignedToId && where.status.in.includes(t.status)).map(({ id, status }) => ({ id, status })),
      updateMany: async ({ where, data }: any) => {
        const hit = tasks.filter(t => where.id.in.includes(t.id) && t.assignedToId === where.assignedToId && where.status.in.includes(t.status))
        hit.forEach(t => Object.assign(t, { assignedToId: data.assignedToId, status: data.status }))
        return { count: hit.length }
      },
      count: async ({ where }: any) => tasks.filter(t => t.assignedToId === where.assignedToId && where.status.in.includes(t.status)).length,
    },
    taskStatusHistory: { createMany: async ({ data }: any) => { history.push(...data) } },
  }
}

describe('what happens to a person\'s tasks when they are deactivated', () => {
  it('only work they were DOING goes back to the pool; submitted / in-review / approved / closed work is untouched', async () => {
    const all = [...WORKING_STATUSES, ...IN_REVIEW_STATUSES, 'COMPLIANT', 'REJECTED']
    const db = fakeDb(all.map((status, i) => ({ id: `t${i}`, status, assignedToId: 'u1' })))
    db.tasks.push({ id: 'other', status: 'IN_PROGRESS', assignedToId: 'u2' })

    const r = await releaseWorkingTasks(db as any, 'org', 'u1', 'user deactivated', 'admin')

    expect(r).toEqual({ released: 3, inReview: 4 })
    const released = db.tasks.filter(t => t.assignedToId === null)
    expect(released).toHaveLength(3)
    expect(released.every(t => t.status === 'PENDING')).toBe(true)
    // the review-stage tasks keep their status AND their assignee (history of who did the work)
    for (const s of [...IN_REVIEW_STATUSES, 'COMPLIANT', 'REJECTED']) {
      const t = db.tasks.find(t => t.status === s)!
      expect(t.assignedToId).toBe('u1')
    }
    // someone else's work is never touched
    expect(db.tasks.find(t => t.id === 'other')).toMatchObject({ assignedToId: 'u2', status: 'IN_PROGRESS' })
  })

  it('records why each released task changed, with who did it', async () => {
    const db = fakeDb([{ id: 'a', status: 'IN_PROGRESS', assignedToId: 'u1' }])
    await releaseWorkingTasks(db as any, 'org', 'u1', 'user deactivated', 'admin-7')
    expect(db.history).toEqual([{ taskId: 'a', fromStatus: 'IN_PROGRESS', toStatus: 'PENDING', changedById: 'admin-7', notes: 'Unassigned: user deactivated' }])
  })

  it('nobody has working tasks: nothing is written', async () => {
    const db = fakeDb([{ id: 'a', status: 'UNDER_REVIEW', assignedToId: 'u1' }])
    const spy = vi.spyOn(db.complianceTask, 'updateMany')
    expect(await releaseWorkingTasks(db as any, 'org', 'u1', 'x')).toEqual({ released: 0, inReview: 1 })
    expect(spy).not.toHaveBeenCalled()
    expect(db.history).toEqual([])
  })
})

function refDb(o: { dept?: boolean; assets?: Array<{ id: string; name: string }>; users?: Array<{ id: string }> }) {
  return {
    department: { findFirst: vi.fn(async () => (o.dept === false ? null : { id: 'd1' })) },
    asset: { findMany: vi.fn(async ({ where }: any) => (o.assets ?? []).filter(a => where.id.in.includes(a.id))) },
    user: { findMany: vi.fn(async ({ where }: any) => (o.users ?? []).filter(u => where.id.in.includes(u.id))) },
  }
}

describe('assessment inputs must belong to the organisation', () => {
  const assets = [{ id: 'a1', name: 'CRM' }, { id: 'a2', name: 'HRMS' }]

  it('valid input passes and returns de-duplicated assets with their names', async () => {
    const r = await validateAssessmentReferences(refDb({ assets, users: [{ id: 'u1' }] }) as any, 'org', {
      departmentId: 'd1', assetIds: ['a1', 'a2', 'a1'], taskAssignments: [{ controlId: 'c', assetId: 'a1', assigneeId: 'u1' }, { controlId: 'c', assetId: 'a2', assigneeId: null }],
    })
    expect(r.assetIds).toEqual(['a1', 'a2'])
    expect(r.assetNames.get('a2')).toBe('HRMS')
  })

  it('a department that is not in this organisation is rejected', async () => {
    await expect(validateAssessmentReferences(refDb({ dept: false, assets }) as any, 'org', { departmentId: 'x', assetIds: ['a1'] }))
      .rejects.toMatchObject({ status: 400, message: expect.stringMatching(/Department not found/) })
  })

  it('an asset id from elsewhere (or a stale selection) is rejected', async () => {
    await expect(validateAssessmentReferences(refDb({ assets }) as any, 'org', { departmentId: 'd1', assetIds: ['a1', 'foreign'] }))
      .rejects.toMatchObject({ status: 400, message: expect.stringMatching(/assets were not found/) })
  })

  it('an assignee who is not an active IT Admin of this organisation is rejected', async () => {
    await expect(validateAssessmentReferences(refDb({ assets, users: [] }) as any, 'org', {
      departmentId: 'd1', assetIds: ['a1'], taskAssignments: [{ controlId: 'c', assetId: 'a1', assigneeId: 'u9' }],
    })).rejects.toMatchObject({ status: 400, message: expect.stringMatching(/not active IT Admins/) })
  })

  it('looks assignees up with the organisation, active status and IT Admin role - not just the id', async () => {
    const db = refDb({ assets, users: [{ id: 'u1' }] })
    await validateAssessmentReferences(db as any, 'org-9', { departmentId: 'd1', assetIds: ['a1'], taskAssignments: [{ controlId: 'c', assetId: 'a1', assigneeId: 'u1' }] })
    expect(db.user.findMany.mock.calls[0][0].where).toMatchObject({ tenantId: 'org-9', status: 'ACTIVE', role: 'IT_ADMIN' })
    expect(db.asset.findMany.mock.calls[0][0].where).toMatchObject({ tenantId: 'org-9' })
    expect(db.department.findFirst.mock.calls[0][0].where).toMatchObject({ tenantId: 'org-9' })
  })
})
