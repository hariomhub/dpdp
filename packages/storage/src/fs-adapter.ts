import fs from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import { Readable } from 'stream'
import { pipeline } from 'stream/promises'
import { StorageNotFoundError, UnsafeKeyError } from './errors'
import { assertSafeKey } from './keys'
import { Meter } from './meter'
import type { GetResult, PutOptions, PutResult, StorageAdapter } from './types'

/** Plain directory storage: local dev, single-node on-prem, or a NAS mount. */
export class FsStorageAdapter implements StorageAdapter {
  readonly provider = 'local' as const
  private readonly root: string

  constructor(rootDir: string) {
    this.root = path.resolve(rootDir)
  }

  private resolve(key: string): string {
    assertSafeKey(key)
    const full = path.resolve(this.root, key)
    if (full !== this.root && !full.startsWith(this.root + path.sep)) {
      throw new UnsafeKeyError(key, 'resolves outside the storage root')
    }
    return full
  }

  async put(key: string, body: Readable | Buffer, _opts: PutOptions): Promise<PutResult> {
    const full = this.resolve(key)
    await fs.promises.mkdir(path.dirname(full), { recursive: true })
    // Write to a temp name and rename, so a crash never leaves a half-written file under the real key.
    const tmp = `${full}.${randomUUID()}.part`
    const meter = new Meter()
    const source = Buffer.isBuffer(body) ? Readable.from([body]) : body
    try {
      await pipeline(source, meter, fs.createWriteStream(tmp, { flags: 'wx' }))
      await fs.promises.rename(tmp, full)
    } catch (err) {
      await fs.promises.rm(tmp, { force: true })
      throw err
    }
    return { size: meter.size, sha256: meter.digest() }
  }

  async get(key: string): Promise<GetResult> {
    const full = this.resolve(key)
    let stat: fs.Stats
    try {
      stat = await fs.promises.stat(full)
    } catch (err: any) {
      if (err?.code === 'ENOENT') throw new StorageNotFoundError(key)
      throw err
    }
    if (!stat.isFile()) throw new StorageNotFoundError(key)
    return { stream: fs.createReadStream(full), size: stat.size }
  }

  async delete(key: string): Promise<void> {
    await fs.promises.rm(this.resolve(key), { force: true })
  }

  async exists(key: string): Promise<boolean> {
    try {
      return (await fs.promises.stat(this.resolve(key))).isFile()
    } catch (err: any) {
      if (err?.code === 'ENOENT') return false
      throw err
    }
  }
}
