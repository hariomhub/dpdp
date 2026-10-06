import { UnsafeKeyError } from './errors'

const SAFE_KEY = /^[A-Za-z0-9][A-Za-z0-9/_.\-]*$/
const MAX_KEY_LENGTH = 512

/**
 * Keys are server-generated (tenant/area/parent/uuid.ext) and are never taken from
 * user input, but both adapters still validate them: a bug elsewhere must not be able
 * to turn a key into a path traversal or a surprising blob name.
 */
export function assertSafeKey(key: string): void {
  if (typeof key !== 'string' || key.length === 0) throw new UnsafeKeyError(String(key), 'empty')
  if (key.length > MAX_KEY_LENGTH) throw new UnsafeKeyError(key, 'too long')
  if (!SAFE_KEY.test(key)) throw new UnsafeKeyError(key, 'contains characters outside [A-Za-z0-9/_.-]')
  for (const seg of key.split('/')) {
    if (seg === '') throw new UnsafeKeyError(key, 'empty path segment')
    if (seg === '.' || seg === '..') throw new UnsafeKeyError(key, 'relative path segment')
  }
}

export interface ObjectKeyParts {
  tenantId: string
  /** logical area, e.g. 'evidence' or 'gap-findings' */
  area: string
  /** the record the file belongs to (task id, gap finding id...) */
  parentId: string
  /** unique id of this file (uuid) */
  fileId: string
  /** extension including the dot, already validated by the file policy (may be '') */
  ext: string
}

/** tenantId/area/parentId/fileId.ext - the customer-visible file name lives in the DB, not the key. */
export function buildObjectKey(p: ObjectKeyParts): string {
  const key = `${p.tenantId}/${p.area}/${p.parentId}/${p.fileId}${p.ext}`
  assertSafeKey(key)
  return key
}
