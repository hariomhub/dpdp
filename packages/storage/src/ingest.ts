import fs from 'fs'
import { checkUploadedFile, SNIFF_BYTES } from './file-policy'
import type { StorageAdapter, StorageProvider } from './types'

/** The file was refused by the upload policy (type not allowed, content does not match its extension...). */
export class FilePolicyError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FilePolicyError'
  }
}

export interface IngestInput {
  /** path of the already-received temp file */
  path: string
  /** the name the browser reported */
  originalname: string
}

export interface IngestedFile {
  storageProvider: StorageProvider
  storageKey: string
  contentType: string
  sha256: string
  /** the sanitised original file name, for display */
  fileName: string
  fileSize: number
  /** safe to render inline in a browser (images, PDF) */
  inline: boolean
}

/** Browsers/busboy hand over file names as latin1; undo that so "résumé.pdf" survives. */
export function decodeUploadedFileName(name: string): string {
  const utf8 = Buffer.from(name, 'latin1').toString('utf8')
  return utf8.includes('�') ? name : utf8
}

async function readHead(filePath: string): Promise<Buffer> {
  const fh = await fs.promises.open(filePath, 'r')
  try {
    const buf = Buffer.alloc(SNIFF_BYTES)
    const { bytesRead } = await fh.read(buf, 0, SNIFF_BYTES, 0)
    return buf.subarray(0, bytesRead)
  } finally {
    await fh.close()
  }
}

/**
 * Check a received temp file against the upload policy and, if it passes, stream it into `store`.
 * The storage key is built by the caller (from the validated extension), never from the user's file name.
 * Throws FilePolicyError with a user-readable reason if the file is refused.
 */
export async function ingestFile(
  file: IngestInput,
  opts: {
    store: StorageAdapter
    buildKey: (validated: { ext: string }) => string
    allowedExtensions?: Iterable<string>
  },
): Promise<IngestedFile> {
  const head = await readHead(file.path)
  const verdict = checkUploadedFile(
    { originalName: decodeUploadedFileName(file.originalname), head },
    { allowedExtensions: opts.allowedExtensions },
  )
  if (!verdict.ok) throw new FilePolicyError(verdict.reason)

  const key = opts.buildKey({ ext: verdict.ext })
  const put = await opts.store.put(key, fs.createReadStream(file.path), { contentType: verdict.contentType })

  return {
    storageProvider: opts.store.provider,
    storageKey: key,
    contentType: verdict.contentType,
    sha256: put.sha256,
    fileName: verdict.safeName,
    fileSize: put.size,
    inline: verdict.inline,
  }
}
