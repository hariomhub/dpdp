import fs from 'fs'
import os from 'os'
import path from 'path'
import { randomUUID } from 'crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { FilePolicyError, FsStorageAdapter, decodeUploadedFileName, ingestFile } from '../src'

let tmp: string
let store: FsStorageAdapter
beforeAll(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dpdp-ingest-'))
  store = new FsStorageAdapter(path.join(tmp, 'store'))
})
afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }))

function incoming(name: string, content: Buffer | string) {
  const p = path.join(tmp, randomUUID())
  fs.writeFileSync(p, content)
  return { path: p, originalname: name }
}

const buildKey = ({ ext }: { ext: string }) => `t/area/${randomUUID()}${ext}`

describe('ingestFile', () => {
  it('stores a valid file under the caller-built key', async () => {
    const out = await ingestFile(incoming('Report.PDF', '%PDF-1.7\nx'), { store, buildKey })
    expect(out).toMatchObject({ storageProvider: 'local', contentType: 'application/pdf', fileName: 'Report.PDF', inline: true })
    expect(out.storageKey).toMatch(/^t\/area\/[0-9a-f-]{36}\.pdf$/)
    expect(await store.exists(out.storageKey)).toBe(true)
  })

  it('refuses a disallowed type with FilePolicyError and writes nothing', async () => {
    const key = `t/area/${randomUUID()}.html`
    await expect(
      ingestFile(incoming('x.html', '<script>1</script>'), { store, buildKey: () => key }),
    ).rejects.toBeInstanceOf(FilePolicyError)
    expect(await store.exists(key)).toBe(false)
  })

  it('refuses mismatched content', async () => {
    await expect(ingestFile(incoming('a.png', 'not really a png'), { store, buildKey })).rejects.toBeInstanceOf(FilePolicyError)
  })

  it('honours a custom allow-list', async () => {
    await expect(
      ingestFile(incoming('a.txt', 'hello'), { store, buildKey, allowedExtensions: ['pdf'] }),
    ).rejects.toBeInstanceOf(FilePolicyError)
  })
})

describe('decodeUploadedFileName', () => {
  it('repairs latin1-mangled UTF-8 and leaves plain names alone', () => {
    expect(decodeUploadedFileName(Buffer.from('résumé.pdf', 'utf8').toString('latin1'))).toBe('résumé.pdf')
    expect(decodeUploadedFileName('plain.pdf')).toBe('plain.pdf')
  })
})
