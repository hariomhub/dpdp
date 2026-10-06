import { createHash } from 'crypto'
import { Transform, TransformCallback } from 'stream'

/** Pass-through that counts bytes and computes a SHA-256 while the data streams to storage. */
export class Meter extends Transform {
  size = 0
  private readonly hash = createHash('sha256')
  private digestCache?: string

  _transform(chunk: Buffer, _enc: BufferEncoding, cb: TransformCallback): void {
    this.size += chunk.length
    this.hash.update(chunk)
    cb(null, chunk)
  }

  digest(): string {
    if (!this.digestCache) this.digestCache = this.hash.digest('hex')
    return this.digestCache
  }
}
