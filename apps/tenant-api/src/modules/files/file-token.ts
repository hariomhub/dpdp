import { createHmac } from 'crypto'
import jwt from 'jsonwebtoken'
import { config } from '../../config'
import { HttpError } from '../../utils/http-error'

export type FileKind = 'evidence' | 'gap' | 'master'

export interface FileTokenClaims {
  typ: 'file'
  /** what kind of record `id` refers to */
  k: FileKind
  id: string
  /** an evidence version id, when a previous version is being opened */
  v?: string
  /** viewer user id and tenant id (the download is re-authorised against these) */
  uid: string
  tid: string
  /** true = force a download instead of rendering inline */
  dl: boolean
}

/**
 * File links are signed with a key DERIVED from the JWT secret, not the secret itself. A file token can
 * therefore never verify as a login access token (and vice versa), even though they share one secret.
 */
function signingKey(): Buffer {
  return createHmac('sha256', config.jwt.secret).update('dpdp:file-download:v1').digest()
}

export function signFileToken(claims: Omit<FileTokenClaims, 'typ'>, ttlSeconds = config.storage.fileLinkTtlSeconds): string {
  return jwt.sign({ ...claims, typ: 'file' }, signingKey(), { algorithm: 'HS256', expiresIn: ttlSeconds })
}

export function verifyFileToken(token: string): FileTokenClaims {
  try {
    const decoded = jwt.verify(token, signingKey(), { algorithms: ['HS256'] }) as FileTokenClaims
    if (decoded.typ !== 'file') throw new Error('wrong token type')
    return decoded
  } catch {
    throw HttpError.unauthorized('This file link is invalid or has expired. Go back and open the file again.')
  }
}
