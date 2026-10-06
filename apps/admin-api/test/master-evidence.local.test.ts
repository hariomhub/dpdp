import fs from 'fs'
import os from 'os'
import path from 'path'
import { randomUUID } from 'crypto'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

// The config module reads env at import time: point local storage at a temp dir BEFORE importing anything.
const env = vi.hoisted(() => {
  const dir = require('fs').mkdtempSync(require('path').join(require('os').tmpdir(), 'dpdp-admin-store-'))
  process.env.UPLOAD_DIR = dir
  process.env.STORAGE_PROVIDER = 'local'
  return { dir }
})

import { deleteMasterEvidenceFile, storeMasterEvidenceFile } from '../src/storage/master-evidence'

let tmp: string
beforeAll(() => { tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dpdp-admin-incoming-')) })
afterAll(() => {
  fs.rmSync(tmp, { recursive: true, force: true })
  fs.rmSync(env.dir, { recursive: true, force: true })
})

function incoming(name: string, content: Buffer | string) {
  const p = path.join(tmp, randomUUID())
  const data = Buffer.from(content)
  fs.writeFileSync(p, data)
  return { path: p, originalname: name, size: data.length }
}

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4])
const actionId = randomUUID()

describe('sample evidence storage (local provider)', () => {
  it('stores a valid sample under a generated key and returns a key, not a URL', async () => {
    const out = await storeMasterEvidenceFile(incoming('MFA policy screenshot.png', PNG), actionId)
    expect(out).toMatchObject({ fileName: 'MFA policy screenshot.png', mimeType: 'image/png', storageProvider: 'local', fileSize: PNG.length })
    expect(out.fileUrl).toMatch(new RegExp(`^master-evidence/${actionId}/[0-9a-f-]{36}\\.png$`))
    expect(out.fileUrl.startsWith('/')).toBe(false)
    expect(fs.existsSync(path.join(env.dir, out.fileUrl))).toBe(true)
  })

  it('refuses html with a 400 and stores nothing', async () => {
    await expect(storeMasterEvidenceFile(incoming('x.html', '<script>1</script>'), actionId)).rejects.toMatchObject({ status: 400 })
  })

  it('refuses mismatched content', async () => {
    await expect(storeMasterEvidenceFile(incoming('fake.png', 'definitely not a png'), actionId)).rejects.toMatchObject({ status: 400 })
  })

  it('deletes a stored sample', async () => {
    const out = await storeMasterEvidenceFile(incoming('a.png', PNG), actionId)
    await deleteMasterEvidenceFile({ fileUrl: out.fileUrl, storageProvider: out.storageProvider })
    expect(fs.existsSync(path.join(env.dir, out.fileUrl))).toBe(false)
  })

  it('deletes a legacy row that stored a "/uploads/..." path, and tolerates a missing file', async () => {
    const legacyKey = `master-evidence/${actionId}/1778892970114-logo.png`
    fs.mkdirSync(path.dirname(path.join(env.dir, legacyKey)), { recursive: true })
    fs.writeFileSync(path.join(env.dir, legacyKey), PNG)
    await deleteMasterEvidenceFile({ fileUrl: `/uploads/${legacyKey}`, storageProvider: 'local' })
    expect(fs.existsSync(path.join(env.dir, legacyKey))).toBe(false)
    await expect(deleteMasterEvidenceFile({ fileUrl: `/uploads/${legacyKey}`, storageProvider: 'local' })).resolves.toBeUndefined()
    await expect(deleteMasterEvidenceFile({ fileUrl: null, storageProvider: 'local' })).resolves.toBeUndefined()
  })
})
