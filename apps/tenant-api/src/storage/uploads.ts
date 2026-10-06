import fs from 'fs'
import os from 'os'
import path from 'path'
import { randomUUID } from 'crypto'
import { NextFunction, Request, Response } from 'express'
import multer from 'multer'
import { buildObjectKey, FilePolicyError, ingestFile, IngestedFile } from '@dpdp/storage'
import { config } from '../config'
import { HttpError } from '../utils/http-error'
import { currentEvidenceStore, evidenceStoreFor } from './stores'

const TMP_DIR = path.join(os.tmpdir(), 'dpdp-uploads')

/**
 * Multer that streams each upload to a temp file on disk (not into RAM) while enforcing the size limit.
 * The file is only moved into real storage after validation, by ingestUpload().
 */
export function createUploader(opts: { maxFiles?: number } = {}) {
  fs.mkdirSync(TMP_DIR, { recursive: true })
  return multer({
    storage: multer.diskStorage({
      destination: TMP_DIR,
      filename: (_req, _file, cb) => cb(null, randomUUID()),
    }),
    limits: { fileSize: config.storage.maxFileSizeMb * 1024 * 1024, files: opts.maxFiles ?? 1 },
  })
}

function tempFilesOf(req: Request): Express.Multer.File[] {
  const out: Express.Multer.File[] = []
  if (req.file) out.push(req.file)
  const files = req.files
  if (Array.isArray(files)) out.push(...files)
  else if (files) for (const list of Object.values(files)) out.push(...list)
  return out
}

/**
 * Put this BEFORE the multer middleware on a route: once the response is finished (or the client aborts),
 * every temp file multer wrote for this request is removed, whatever happened in between.
 */
export function cleanupTempUploads(req: Request, res: Response, next: NextFunction) {
  const cleanup = () => {
    for (const f of tempFilesOf(req)) fs.promises.rm(f.path, { force: true }).catch(() => undefined)
  }
  res.once('finish', cleanup)
  res.once('close', cleanup)
  next()
}

export interface IncomingFile {
  path: string
  originalname: string
  size: number
}

/** What we persist about a stored file (the storage key, hash and type - never a URL). */
export type StoredFile = IngestedFile

/**
 * Validate an uploaded temp file against the file policy and stream it into the evidence store.
 * Throws HttpError(400) with a user-readable reason if the file type is not allowed.
 */
export async function ingestUpload(
  file: IncomingFile,
  target: { tenantId: string; area: 'evidence' | 'gap-findings'; parentId: string },
): Promise<StoredFile> {
  try {
    return await ingestFile(file, {
      store: currentEvidenceStore(),
      allowedExtensions: config.storage.allowedExtensions.length ? config.storage.allowedExtensions : undefined,
      buildKey: ({ ext }) => buildObjectKey({ ...target, fileId: randomUUID(), ext }),
    })
  } catch (err) {
    if (err instanceof FilePolicyError) throw HttpError.badRequest(err.message)
    throw err
  }
}

/** Best-effort removal of a stored file (used to undo an upload when the database write that followed it failed). */
export async function discardStoredFile(f: Pick<StoredFile, 'storageProvider' | 'storageKey'>): Promise<void> {
  try {
    await evidenceStoreFor(f.storageProvider).delete(f.storageKey)
  } catch (err) {
    console.error('Failed to discard orphaned upload', f.storageKey, err)
  }
}
