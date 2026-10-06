import { describe, expect, it } from 'vitest'
import { assertSafeKey, buildObjectKey, UnsafeKeyError } from '../src'

describe('assertSafeKey', () => {
  it('accepts server-built keys', () => {
    expect(() => assertSafeKey('t1/evidence/task-1/0b6c.png')).not.toThrow()
  })

  it.each([
    ['empty', ''],
    ['leading slash', '/etc/passwd'],
    ['parent traversal', 'a/../b'],
    ['leading traversal', '../secret'],
    ['dot segment', 'a/./b'],
    ['double slash', 'a//b'],
    ['backslash', 'a\\b'],
    ['space', 'a b'],
    ['unicode', 'a/é.png'],
    ['null byte', 'a\u0000b'],
    ['too long', 'a'.repeat(513)],
  ])('rejects %s', (_label, key) => {
    expect(() => assertSafeKey(key)).toThrow(UnsafeKeyError)
  })
})

describe('buildObjectKey', () => {
  it('builds tenant/area/parent/file.ext', () => {
    expect(buildObjectKey({ tenantId: 't1', area: 'evidence', parentId: 'task9', fileId: 'abc', ext: '.pdf' }))
      .toBe('t1/evidence/task9/abc.pdf')
  })

  it('refuses a parent id that tries to escape', () => {
    expect(() => buildObjectKey({ tenantId: 't1', area: 'evidence', parentId: '../x', fileId: 'abc', ext: '.pdf' }))
      .toThrow(UnsafeKeyError)
  })
})
