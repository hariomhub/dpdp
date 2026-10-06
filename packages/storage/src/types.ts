import type { Readable } from 'stream'

export type StorageProvider = 'azure' | 'local'

export interface PutOptions {
  /** Content type recorded with the object (taken from the file policy, never from the client). */
  contentType: string
}

export interface PutResult {
  size: number
  /** hex SHA-256 of the bytes that were stored */
  sha256: string
}

export interface GetResult {
  stream: Readable
  size: number
  contentType?: string
}

/**
 * The one storage interface the application codes against. Azure Blob in the cloud,
 * a plain directory (or NAS mount) on-prem - switching is configuration, not code.
 */
export interface StorageAdapter {
  readonly provider: StorageProvider
  put(key: string, body: Readable | Buffer, opts: PutOptions): Promise<PutResult>
  /** Throws StorageNotFoundError when the object does not exist. */
  get(key: string): Promise<GetResult>
  /** Idempotent: deleting a missing object is not an error. */
  delete(key: string): Promise<void>
  exists(key: string): Promise<boolean>
}

export type StorageConfig =
  | { provider: 'azure'; connectionString: string; container: string }
  | { provider: 'local'; rootDir: string }
