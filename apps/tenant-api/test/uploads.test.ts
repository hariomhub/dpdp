import fs from 'fs'
import os from 'os'
import path from 'path'
import { randomUUID } from 'crypto'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

// The config module reads env at import time, so point the local store at a temp dir BEFORE importing anything.
const env = vi.hoisted(() => {
  const dir = require('fs').mkdtempSync(require('path').join(require('os').tmpdir(), 'dpdp-uploads-test-'))
  process.env.UPLOAD_DIR = dir
  return { dir }
})

import { discardStoredFile, ingestUpload } from '../src/storage/uploads'
import { currentEvidenceStore, hasStoredFile, resolveStoredRef } from '../src/storage/stores'
import { HttpError } from '../src/utils/http-error'

let tmp: string
beforeAll(() => { tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dpdp-incoming-')) })
afterAll(() => {
  fs.rmSync(tmp, { recursive: true, force: true })
  fs.rmSync(env.dir, { recursive: true, force: true })
})

function incoming(name: string, content: Buffer | string) {
  const p = path.join(tmp, randomUUID())
  const data = Buffer.isBuffer(content) ? content : Buffer.from(content)
  fs.writeFileSync(p, data)
  return { path: p, originalname: name, size: data.length }
}

const target = { tenantId: 'tenant-1', area: 'evidence' as const, parentId: 'task-1' }

describe('ingestUpload', () => {
  it('validates, stores under a server-generated key and records the hash', async () => {
    const pdf = Buffer.from('%PDF-1.7\nhello evidence\n%%EOF')
    const stored = await ingestUpload(incoming('Access Review Q3.pdf', pdf), target)

    expect(stored.storageProvider).toBe('local')
    expect(stored.contentType).toBe('application/pdf')
    expect(stored.fileName).toBe('Access Review Q3.pdf')
    expect(stored.fileSize).toBe(pdf.length)
    // key is tenant/area/parent/uuid.ext - the user's file name is NOT in it
    expect(stored.storageKey).toMatch(/^tenant-1\/evidence\/task-1\/[0-9a-f-]{36}\.pdf$/)
    expect(stored.sha256).toMatch(/^[0-9a-f]{64}$/)

    const got = await currentEvidenceStore().get(stored.storageKey)
    const chunks: Buffer[] = []
    for await (const c of got.stream) chunks.push(c as Buffer)
    expect(Buffer.concat(chunks).equals(pdf)).toBe(true)
  })

  it('rejects an html page uploaded as evidence, and stores nothing', async () => {
    const before = fs.existsSync(path.join(env.dir, 'tenant-1', 'evidence', 'task-bad'))
    await expect(
      ingestUpload(incoming('totally-a-report.html', '<script>steal(localStorage)</script>'), { ...target, parentId: 'task-bad' }),
    ).rejects.toMatchObject({ status: 400 })
    expect(before).toBe(false)
    expect(fs.existsSync(path.join(env.dir, 'tenant-1', 'evidence', 'task-bad'))).toBe(false)
  })

  it('rejects html disguised with a .pdf extension', async () => {
    await expect(ingestUpload(incoming('invoice.pdf', '<html><script>x</script></html>'), target)).rejects.toBeInstanceOf(HttpError)
  })

  it('a path-looking file name cannot influence the storage key', async () => {
    const stored = await ingestUpload(incoming('../../../etc/passwd.txt', 'plain text'), target)
    expect(stored.storageKey).not.toContain('..')
    expect(stored.storageKey).toMatch(/^tenant-1\/evidence\/task-1\/[0-9a-f-]{36}\.txt$/)
    expect(stored.fileName).toBe('passwd.txt')
  })

  it('keeps non-ASCII file names intact', async () => {
    const latin1 = Buffer.from('résumé.pdf', 'utf8').toString('latin1') // how busboy delivers it
    const stored = await ingestUpload(incoming(latin1, '%PDF-1.4'), target)
    expect(stored.fileName).toBe('résumé.pdf')
  })

  it('discardStoredFile removes an orphaned upload', async () => {
    const stored = await ingestUpload(incoming('x.txt', 'orphan'), target)
    expect(await currentEvidenceStore().exists(stored.storageKey)).toBe(true)
    await discardStoredFile(stored)
    expect(await currentEvidenceStore().exists(stored.storageKey)).toBe(false)
  })
})

describe('resolveStoredRef (new rows and legacy rows)', () => {
  it('uses storageKey + provider when present', () => {
    expect(resolveStoredRef({ storageKey: 't/evidence/x/a.pdf', storageProvider: 'azure' }))
      .toEqual({ provider: 'azure', key: 't/evidence/x/a.pdf' })
  })
  it('maps a legacy /uploads URL to a local key', () => {
    expect(resolveStoredRef({ fileUrl: '/uploads/evidence/task-9/123-shot.png' }))
      .toEqual({ provider: 'local', key: 'evidence/task-9/123-shot.png' })
  })
  it('refuses anything else (never a raw URL)', () => {
    expect(resolveStoredRef({ fileUrl: 'https://evil.example/x.html' })).toBeNull()
    expect(resolveStoredRef({})).toBeNull()
  })
  it('hasStoredFile', () => {
    expect(hasStoredFile({ storageKey: 'a' })).toBe(true)
    expect(hasStoredFile({ fileUrl: '/uploads/a' })).toBe(true)
    expect(hasStoredFile({})).toBe(false)
  })
})
