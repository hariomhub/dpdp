import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { hasDb, newOrgId, useTestDatabases } from './helpers'

describe.skipIf(!hasDb)('code counter (real database)', () => {
  let db: any, counter: typeof import('../../src/utils/code-counter')

  beforeAll(async () => {
    useTestDatabases()
    db = (await import('@dpdp/database')).getTenantPrisma()
    counter = await import('../../src/utils/code-counter')
  })
  afterAll(async () => { await db?.$disconnect() })

  it('hands out consecutive numbers per organisation and kind, starting at 1', async () => {
    const org = newOrgId()
    expect(await counter.nextCode(db, org, 'ASSET')).toBe('AST-001')
    expect(await counter.nextCode(db, org, 'ASSET')).toBe('AST-002')
    expect(await counter.nextCode(db, org, 'TASK')).toBe('ACT-001')   // separate sequence
    expect(await counter.nextCode(db, newOrgId(), 'ASSET')).toBe('AST-001') // separate organisation
  })

  it('reserves a block: returns the first number and advances by the block size', async () => {
    const org = newOrgId()
    expect(await counter.reserveCodeNumbers(db, org, 'TASK', 10)).toBe(1)
    expect(await counter.reserveCodeNumbers(db, org, 'TASK', 5)).toBe(11)
    expect(await counter.reserveCodeNumbers(db, org, 'TASK', 1)).toBe(16)
  })

  it('concurrent callers never receive the same number (the old max+1 did)', async () => {
    const org = newOrgId()
    const codes = await Promise.all(Array.from({ length: 40 }, () => counter.nextCode(db, org, 'ASSET')))
    expect(new Set(codes).size).toBe(40)
    expect(codes.map(c => Number(c.slice(4))).sort((a, b) => a - b)).toEqual(Array.from({ length: 40 }, (_, i) => i + 1))
  })

  it('concurrent transactions each get their own disjoint block', async () => {
    const org = newOrgId()
    const starts: number[] = await Promise.all(
      Array.from({ length: 12 }, () => db.$transaction((tx: any) => counter.reserveCodeNumbers(tx, org, 'TASK', 7))),
    )
    const sorted = [...starts].sort((a, b) => a - b)
    sorted.forEach((s, i) => expect(s).toBe(i * 7 + 1))   // 1, 8, 15 ... : no overlap, no gap
  })

  it('a transaction that fails leaves no gap in the numbering', async () => {
    const org = newOrgId()
    await counter.reserveCodeNumbers(db, org, 'ASSET', 3)
    await expect(db.$transaction(async (tx: any) => {
      await counter.reserveCodeNumbers(tx, org, 'ASSET', 50)
      throw new Error('creation failed')
    })).rejects.toThrow('creation failed')
    expect(await counter.nextCode(db, org, 'ASSET')).toBe('AST-004')
  })

  it('continues from a counter that was seeded from existing codes (as the migration does)', async () => {
    const org = newOrgId()
    await db.codeCounter.create({ data: { tenantId: org, name: 'ASSET', value: 107 } })
    expect(await counter.nextCode(db, org, 'ASSET')).toBe('AST-108')
  })

  it('rejects a nonsensical block size', async () => {
    await expect(counter.reserveCodeNumbers(db, newOrgId(), 'ASSET', 0)).rejects.toThrow(/positive/)
    await expect(counter.reserveCodeNumbers(db, newOrgId(), 'ASSET', 1.5)).rejects.toThrow(/positive/)
  })
})
