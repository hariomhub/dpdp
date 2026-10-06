import { describe, expect, it } from 'vitest'
import { canViewTaskFile } from '../src/modules/files/files.authz'

const task = { assignedToId: 'it-1' }

describe('canViewTaskFile', () => {
  it.each(['CEO', 'CO', 'INTERNAL_AUDITOR', 'EXTERNAL_AUDITOR'])('%s can open files on any task in their tenant', (role) => {
    expect(canViewTaskFile({ role, userId: 'u' }, task)).toBe(true)
  })

  it('an IT Admin can open files on a task assigned to them', () => {
    expect(canViewTaskFile({ role: 'IT_ADMIN', userId: 'it-1' }, task)).toBe(true)
  })

  it('an IT Admin can open evidence they uploaded themselves', () => {
    expect(canViewTaskFile({ role: 'IT_ADMIN', userId: 'it-2' }, { assignedToId: 'it-1', submittedById: 'it-2' })).toBe(true)
  })

  it("an IT Admin cannot open another IT Admin's task files", () => {
    expect(canViewTaskFile({ role: 'IT_ADMIN', userId: 'it-2' }, task)).toBe(false)
  })

  it('an unassigned task is not open to an arbitrary IT Admin', () => {
    expect(canViewTaskFile({ role: 'IT_ADMIN', userId: 'it-2' }, { assignedToId: null })).toBe(false)
  })

  it('unknown roles are denied', () => {
    expect(canViewTaskFile({ role: 'GUEST', userId: 'u' }, task)).toBe(false)
    expect(canViewTaskFile({ role: '', userId: 'u' }, task)).toBe(false)
  })
})
