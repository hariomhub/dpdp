import fs from 'fs'
import os from 'os'
import path from 'path'
import { createHash, randomUUID } from 'crypto'
import { Readable } from 'stream'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  AzureStorageAdapter,
  FsStorageAdapter,
  StorageNotFoundError,
  UnsafeKeyError,
  type StorageAdapter,
} from '../src'

const sha256 = (b: Buffer) => createHash('sha256').update(b).digest('hex')
async function readAll(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const c of stream) chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c))
  return Buffer.concat(chunks)
}

/** The same behavioural contract must hold for every adapter. */
function contract(name: string, make: () => StorageAdapter, prefix: () => string) {
  describe(`${name} adapter contract`, () => {
    it('stores a buffer and reads it back with size and sha256', async () => {
      const store = make()
      const key = `${prefix()}/a/${randomUUID()}.txt`
      const data = Buffer.from('hello evidence')
      const res = await store.put(key, data, { contentType: 'text/plain' })
      expect(res).toEqual({ size: data.length, sha256: sha256(data) })
      const got = await store.get(key)
      expect(await readAll(got.stream)).toEqual(data)
      expect(got.size).toBe(data.length)
      expect(await store.exists(key)).toBe(true)
    })

    it('stores a stream larger than one chunk (multi-MB)', async () => {
      const store = make()
      const key = `${prefix()}/big/${randomUUID()}.zip`
      const data = Buffer.alloc(9 * 1024 * 1024, 7)
      const res = await store.put(key, Readable.from([data.subarray(0, 3_000_000), data.subarray(3_000_000)]), {
        contentType: 'application/zip',
      })
      expect(res.size).toBe(data.length)
      expect(res.sha256).toBe(sha256(data))
      // Buffer.equals, not toEqual: deep-comparing 9 MB element by element makes the test crawl.
      expect((await readAll((await store.get(key)).stream)).equals(data)).toBe(true)
    })

    it('reports a missing object as StorageNotFoundError', async () => {
      const store = make()
      await expect(store.get(`${prefix()}/nope/${randomUUID()}.txt`)).rejects.toBeInstanceOf(StorageNotFoundError)
      expect(await store.exists(`${prefix()}/nope/${randomUUID()}.txt`)).toBe(false)
    })

    it('delete is idempotent', async () => {
      const store = make()
      const key = `${prefix()}/d/${randomUUID()}.txt`
      await store.put(key, Buffer.from('x'), { contentType: 'text/plain' })
      await store.delete(key)
      await store.delete(key)
      expect(await store.exists(key)).toBe(false)
    })

    it('refuses unsafe keys', async () => {
      const store = make()
      await expect(store.put('../escape.txt', Buffer.from('x'), { contentType: 'text/plain' })).rejects.toBeInstanceOf(UnsafeKeyError)
      await expect(store.get('/abs/path.txt')).rejects.toBeInstanceOf(UnsafeKeyError)
    })

    it('a failing source stream leaves nothing behind under the key', async () => {
      const store = make()
      const key = `${prefix()}/fail/${randomUUID()}.txt`
      const bad = new Readable({
        read() {
          this.push(Buffer.from('partial'))
          this.destroy(new Error('boom'))
        },
      })
      await expect(store.put(key, bad, { contentType: 'text/plain' })).rejects.toThrow()
      expect(await store.exists(key)).toBe(false)
    })
  })
}

describe('FsStorageAdapter', () => {
  let root: string
  beforeAll(() => { root = fs.mkdtempSync(path.join(os.tmpdir(), 'dpdp-fs-')) })
  afterAll(() => { fs.rmSync(root, { recursive: true, force: true }) })

  contract('fs', () => new FsStorageAdapter(root), () => 't1')

  it('leaves no .part files after a successful write', async () => {
    const store = new FsStorageAdapter(root)
    await store.put('t1/clean/a.txt', Buffer.from('x'), { contentType: 'text/plain' })
    const leftovers = fs.readdirSync(path.join(root, 't1', 'clean')).filter(f => f.endsWith('.part'))
    expect(leftovers).toEqual([])
  })
})

// Runs only when an Azure Storage emulator (Azurite) or a real test account is available:
//   AZURE_TEST_CONNECTION_STRING="UseDevelopmentStorage=true"  (with `npx azurite` running)
const azureCs = process.env.AZURE_TEST_CONNECTION_STRING
describe.skipIf(!azureCs)('AzureStorageAdapter (Azurite)', () => {
  const container = `test-${randomUUID().slice(0, 8)}`
  contract('azure', () => new AzureStorageAdapter(azureCs!, container), () => 't1')
})
