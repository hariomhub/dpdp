import fs from 'fs'
import os from 'os'
import path from 'path'
import { randomUUID } from 'crypto'
import { NextFunction, Request, Response } from 'express'
import multer from 'multer'
import { AzureStorageAdapter, FilePolicyError, FsStorageAdapter, ingestFile, StorageAdapter } from '@dpdp/storage'
import { config } from '../config'
import { HttpError } from '../utils/http-error'

const TMP_DIR = path.join(os.tmpdir(), 'dpdp-admin-uploads')

/** Streams each upload to a temp file (not into RAM) while enforcing the size limit. */
export function createUploader() {
  fs.mkdirSync(TMP_DIR, { recursive: true })
  return multer({
    storage: multer.diskStorage({ destination: TMP_DIR, filename: (_req, _file, cb) => cb(null, randomUUID()) }),
    limits: { fileSize: config.storage.maxFileSizeMb * 1024 * 1024, files: 1 },
  })
}

/** Put BEFORE the multer middleware: removes the request's temp file once the response is finished or aborted. */
export function cleanupTempUploads(req: Request, res: Response, next: NextFunction) {
  const cleanup = () => {
    if (req.file) fs.promises.rm(req.file.path, { force: true }).catch(() => undefined)
  }
  res.once('finish', cleanup)
  res.once('close', cleanup)
  next()
}

let azure: StorageAdapter | undefined
let local: StorageAdapter | undefined

function azureStore(): StorageAdapter {
  if (!azure) azure = new AzureStorageAdapter(config.storage.azure.connectionString, config.storage.masterEvidenceContainer)
  return azure
}

function localStore(): StorageAdapter {
  if (!local) local = new FsStorageAdapter(path.resolve(process.cwd(), config.storage.uploadDir))
  return local
}

/** Where NEW sample files are written, per STORAGE_PROVIDER. */
function currentStore(): StorageAdapter {
  return config.storage.provider === 'azure' ? azureStore() : localStore()
}

export interface IncomingFile {
  path: string
  originalname: string
  size: number
}

export interface StoredMasterEvidenceFile {
  fileName: string
  fileSize: number
  mimeType: string
  /** the storage KEY (not a URL) - the tenant API opens it through an authenticated, audited link */
  fileUrl: string
  storageProvider: string
}

/** Validate a sample file against the upload policy and store it privately (Azure container, or local disk in dev). */
export async function storeMasterEvidenceFile(file: IncomingFile, actionId: string): Promise<StoredMasterEvidenceFile> {
  const store = currentStore()
  // Local dev keeps the historical uploads/master-evidence/<action>/ layout; in Azure the container is already "master-evidence".
  const prefix = store.provider === 'local' ? 'master-evidence/' : ''
  try {
    const out = await ingestFile(file, {
      store,
      buildKey: ({ ext }) => `${prefix}${actionId}/${randomUUID()}${ext}`,
    })
    return {
      fileName: out.fileName,
      fileSize: out.fileSize,
      mimeType: out.contentType,
      fileUrl: out.storageKey,
      storageProvider: out.storageProvider,
    }
  } catch (err) {
    if (err instanceof FilePolicyError) throw HttpError.badRequest(err.message)
    throw err
  }
}

/** Remove a sample file from whichever store the row points at (also handles legacy "/uploads/..." rows). */
export async function deleteMasterEvidenceFile(row: { fileUrl: string | null; storageProvider: string }): Promise<void> {
  if (!row.fileUrl) return
  const key = row.fileUrl.startsWith('/uploads/') ? row.fileUrl.slice('/uploads/'.length) : row.fileUrl
  const store = row.storageProvider === 'azure' ? azureStore() : localStore()
  await store.delete(key)
}
