import { AzureStorageAdapter } from './azure-adapter'
import { FsStorageAdapter } from './fs-adapter'
import type { StorageAdapter, StorageConfig } from './types'

export * from './types'
export * from './errors'
export { assertSafeKey, buildObjectKey } from './keys'
export type { ObjectKeyParts } from './keys'
export {
  checkUploadedFile,
  contentTypeForName,
  sanitizeFileName,
  DEFAULT_ALLOWED_EXTENSIONS,
  SNIFF_BYTES,
} from './file-policy'
export type { FileCheckInput, FileCheckResult } from './file-policy'
export { ingestFile, decodeUploadedFileName, FilePolicyError } from './ingest'
export type { IngestInput, IngestedFile } from './ingest'
export { FsStorageAdapter } from './fs-adapter'
export { AzureStorageAdapter } from './azure-adapter'

export function createStorage(config: StorageConfig): StorageAdapter {
  return config.provider === 'azure'
    ? new AzureStorageAdapter(config.connectionString, config.container)
    : new FsStorageAdapter(config.rootDir)
}
