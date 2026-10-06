import path from 'path'
import { AzureStorageAdapter, FsStorageAdapter, StorageAdapter } from '@dpdp/storage'
import { config } from '../config'
import { HttpError } from '../utils/http-error'

let local: StorageAdapter | undefined
let azureEvidence: StorageAdapter | undefined
let masterEvidence: StorageAdapter | undefined

/**
 * Local-disk store. Besides being the dev / single-node on-prem store, it is always available so that
 * rows written before the storage adapter existed (provider 'local') can still be read.
 */
export function localStore(): StorageAdapter {
  if (!local) local = new FsStorageAdapter(path.resolve(process.cwd(), config.storage.uploadDir))
  return local
}

/** Customer evidence in Azure Blob Storage (its own storage account, private container). */
export function azureEvidenceStore(): StorageAdapter {
  if (!azureEvidence) {
    azureEvidence = new AzureStorageAdapter(config.storage.evidence.connectionString, config.storage.evidence.container)
  }
  return azureEvidence
}

/** Where NEW evidence and gap-finding files are written, per STORAGE_PROVIDER. */
export function currentEvidenceStore(): StorageAdapter {
  return config.storage.provider === 'azure' ? azureEvidenceStore() : localStore()
}

/** The store a persisted row points at. Rows remember their provider, so a deployment can switch providers safely. */
export function evidenceStoreFor(provider: string): StorageAdapter {
  if (provider === 'azure') return azureEvidenceStore()
  if (provider === 'local') return localStore()
  throw HttpError.notFound(`File unavailable (unknown storage provider "${provider}")`)
}

/**
 * Vendor-supplied sample evidence. Super Admin writes these to the vendor content account; the tenant API
 * reads them from there. (Interim: the Asset Library will replace this cross-account read.)
 */
export function masterEvidenceStoreFor(provider: string): StorageAdapter {
  if (provider === 'azure') {
    if (!masterEvidence) {
      masterEvidence = new AzureStorageAdapter(config.storage.azure.connectionString, config.storage.masterEvidenceContainer)
    }
    return masterEvidence
  }
  return localStore()
}

export interface StoredRef {
  provider: string
  key: string
}

/**
 * Work out where a persisted file lives. New rows carry storageKey + storageProvider. Legacy rows only have a
 * "/uploads/<key>" URL (local disk). Anything else cannot be served.
 */
export function resolveStoredRef(row: {
  storageKey?: string | null
  storageProvider?: string | null
  fileUrl?: string | null
}): StoredRef | null {
  if (row.storageKey) return { provider: row.storageProvider || 'local', key: row.storageKey }
  if (row.fileUrl && row.fileUrl.startsWith('/uploads/')) {
    return { provider: 'local', key: row.fileUrl.slice('/uploads/'.length) }
  }
  return null
}

export function hasStoredFile(row: { storageKey?: string | null; fileUrl?: string | null }): boolean {
  return !!(row.storageKey || row.fileUrl)
}
