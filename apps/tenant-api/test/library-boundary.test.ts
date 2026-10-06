import { describe, expect, it } from 'vitest'
import fs from 'fs'
import path from 'path'

/**
 * The tenant plane must stop reaching into the Super Admin (vendor) database - an instance never connects to it
 * (docs/architecture D1). Library content goes through src/library, the organisation's own record through
 * src/platform. This test pins the files that still import the Super Admin client; the list may only SHRINK, and each
 * entry says what removes it.
 */
const STILL_ALLOWED: Record<string, string> = {
  'library/client.ts': 'the single switch point for Library reads (becomes the local catalog replica)',
  'app.ts': 'readiness probe + shutdown of the vendor connection (goes when the connection goes)',
  'worker.ts': 'closes the vendor connection on shutdown (goes when the connection goes)',
}

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e =>
    e.isDirectory() ? walk(path.join(dir, e.name)) : e.name.endsWith('.ts') ? [path.join(dir, e.name)] : [])
}

describe('the tenant plane and the vendor database', () => {
  const src = path.resolve(__dirname, '../src')
  const users = walk(src)
    .filter(f => /getSuperAdminPrisma/.test(fs.readFileSync(f, 'utf8')))
    .map(f => path.relative(src, f).split(path.sep).join('/'))
    .sort()

  it('only the listed files import the Super Admin client', () => {
    const unexpected = users.filter(f => !(f in STILL_ALLOWED))
    expect(unexpected, `New direct use of the vendor database: ${unexpected.join(', ')}. Read Library content via src/library and the organisation record via src/platform.`).toEqual([])
  })

  it('the list does not keep entries that no longer need it (so it only shrinks)', () => {
    const stale = Object.keys(STILL_ALLOWED).filter(f => !users.includes(f))
    expect(stale, `Remove from STILL_ALLOWED: ${stale.join(', ')}`).toEqual([])
  })
})
