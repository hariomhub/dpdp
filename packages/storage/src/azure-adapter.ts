import { BlobServiceClient, ContainerClient } from '@azure/storage-blob'
import { PassThrough, Readable, pipeline } from 'stream'
import { StorageNotFoundError } from './errors'
import { assertSafeKey } from './keys'
import { Meter } from './meter'
import type { GetResult, PutOptions, PutResult, StorageAdapter } from './types'

const UPLOAD_BUFFER_BYTES = 4 * 1024 * 1024
const UPLOAD_CONCURRENCY = 4

/** Azure Blob Storage. Containers are created private; there are no anonymous reads. */
export class AzureStorageAdapter implements StorageAdapter {
  readonly provider = 'azure' as const
  private readonly container: ContainerClient
  private ready?: Promise<void>

  constructor(connectionString: string, containerName: string) {
    if (!connectionString) throw new Error('Azure storage connection string is not configured')
    this.container = BlobServiceClient.fromConnectionString(connectionString).getContainerClient(containerName)
  }

  /** Create the container once per process. No `access` option => private. */
  private ensureContainer(): Promise<void> {
    if (!this.ready) {
      this.ready = this.container.createIfNotExists().then(
        () => undefined,
        (err: any) => {
          // A least-privilege identity may not be allowed to create containers; if ops pre-created it, carry on.
          if (err?.statusCode === 403) return undefined
          this.ready = undefined
          throw err
        },
      )
    }
    return this.ready
  }

  async put(key: string, body: Readable | Buffer, opts: PutOptions): Promise<PutResult> {
    assertSafeKey(key)
    await this.ensureContainer()
    const blob = this.container.getBlockBlobClient(key)
    const meter = new Meter()
    const source = Buffer.isBuffer(body) ? Readable.from([body]) : body
    const pass = new PassThrough()
    pipeline(source, meter, pass, (err) => { if (err) pass.destroy(err) })
    await blob.uploadStream(pass, UPLOAD_BUFFER_BYTES, UPLOAD_CONCURRENCY, {
      blobHTTPHeaders: { blobContentType: opts.contentType },
    })
    return { size: meter.size, sha256: meter.digest() }
  }

  async get(key: string): Promise<GetResult> {
    assertSafeKey(key)
    try {
      const res = await this.container.getBlobClient(key).download()
      if (!res.readableStreamBody) throw new StorageNotFoundError(key)
      return {
        stream: res.readableStreamBody as Readable,
        size: res.contentLength ?? 0,
        contentType: res.contentType,
      }
    } catch (err: any) {
      if (err?.statusCode === 404) throw new StorageNotFoundError(key)
      throw err
    }
  }

  async delete(key: string): Promise<void> {
    assertSafeKey(key)
    await this.container.getBlobClient(key).deleteIfExists()
  }

  async exists(key: string): Promise<boolean> {
    assertSafeKey(key)
    return this.container.getBlobClient(key).exists()
  }
}
