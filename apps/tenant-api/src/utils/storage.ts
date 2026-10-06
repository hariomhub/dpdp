import { config } from '../config'
import {
  BlobServiceClient, StorageSharedKeyCredential,
  generateBlobSASQueryParameters, BlobSASPermissions,
} from '@azure/storage-blob'

// NOTE: evidence and gap-finding files no longer go through this module - they use the storage adapter
// (src/storage/) with authenticated, audited access. This module now only serves the LMS, which is unchanged.

export interface StoredFile {
  fileName:        string
  fileSize:        number
  mimeType:        string
  fileUrl:         string
  storageProvider: 'local' | 'azure'
}

// ─── LMS Azure Blob Storage (private containers, signed URLs) ─────────────────
// Unlike evidence / gap-findings (which use the provider-switchable storage
// adapter), LMS uploads always go to Azure Blob Storage unconditionally
// — a deliberate migration, not gated by STORAGE_PROVIDER. Containers are
// created private; callers must sign a URL with getSignedUrl() before it's
// ever sent to a client. Never persist a signed URL — only the stable,
// unsigned blob URL belongs in the database.

let lmsBlobServiceClient: BlobServiceClient | undefined
function getLmsBlobServiceClient(): BlobServiceClient {
  if (!lmsBlobServiceClient) {
    if (!config.storage.azure.connectionString) {
      throw new Error('AZURE_STORAGE_CONNECTION_STRING is not configured')
    }
    lmsBlobServiceClient = BlobServiceClient.fromConnectionString(config.storage.azure.connectionString)
  }
  return lmsBlobServiceClient
}

function lmsContainerName(kind: 'content' | 'submission'): string {
  return kind === 'content' ? config.storage.azure.lmsContentContainer : config.storage.azure.lmsSubmissionsContainer
}

export async function uploadLmsFile(
  file: Express.Multer.File,
  folder: string,
  kind: 'content' | 'submission'
): Promise<StoredFile> {
  const client = getLmsBlobServiceClient()
  const container = client.getContainerClient(lmsContainerName(kind))
  await container.createIfNotExists() // no `access` option → private, no anonymous reads

  const safeName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`
  const blockBlobClient = container.getBlockBlobClient(`${folder}/${safeName}`)
  await blockBlobClient.uploadData(file.buffer, {
    blobHTTPHeaders: { blobContentType: file.mimetype },
  })

  return {
    fileName:        file.originalname,
    fileSize:        file.size,
    mimeType:        file.mimetype,
    fileUrl:         blockBlobClient.url, // unsigned — always sign before returning to a client
    storageProvider: 'azure',
  }
}

/**
 * Turns a stable (unsigned) LMS blob URL into a short-lived read-only signed
 * URL safe to hand to a browser. Anything that isn't one of our own LMS blob
 * URLs (null, a legacy local /uploads/... path, an external embed URL) is
 * returned unchanged.
 */
export function getSignedUrl<T extends string | null | undefined>(url: T): T {
  if (!url) return url
  let parsed: URL
  try { parsed = new URL(url) } catch { return url }

  const containerName = [config.storage.azure.lmsContentContainer, config.storage.azure.lmsSubmissionsContainer]
    .find(name => parsed.pathname.startsWith(`/${name}/`))
  if (!containerName) return url

  const client = getLmsBlobServiceClient()
  const credential = client.credential as StorageSharedKeyCredential
  const blobName = decodeURIComponent(parsed.pathname.slice(`/${containerName}/`.length))

  const sas = generateBlobSASQueryParameters({
    containerName,
    blobName,
    permissions: BlobSASPermissions.parse('r'),
    expiresOn: new Date(Date.now() + config.storage.azure.sasExpiryMinutes * 60 * 1000),
  }, credential).toString()

  return `${url}?${sas}` as T
}
