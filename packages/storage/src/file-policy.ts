/**
 * Upload file policy: an allow-list of file types, checked by BOTH the file name's extension and
 * the file's actual leading bytes ("magic numbers"). The content type we later serve is taken from
 * this table, never from what the browser claimed.
 *
 * Deliberately NOT allowed: html, svg, js, exe and similar - files a browser can execute. Together
 * with attachment-only serving and a sandboxing CSP, this closes the stored-XSS path where an uploaded
 * page runs in the app's origin.
 */

type Sniff = 'pdf' | 'png' | 'jpeg' | 'gif' | 'webp' | 'zip' | 'ole2' | 'gzip' | 'mp4' | 'webm' | 'text'

interface TypeRule {
  mime: string
  sniff: Sniff
  /** safe for the browser to render inline (inside a sandboxed response) */
  inline?: boolean
}

const RULES: Record<string, TypeRule> = {
  pdf:  { mime: 'application/pdf', sniff: 'pdf', inline: true },
  png:  { mime: 'image/png', sniff: 'png', inline: true },
  jpg:  { mime: 'image/jpeg', sniff: 'jpeg', inline: true },
  jpeg: { mime: 'image/jpeg', sniff: 'jpeg', inline: true },
  gif:  { mime: 'image/gif', sniff: 'gif', inline: true },
  webp: { mime: 'image/webp', sniff: 'webp', inline: true },

  docx: { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', sniff: 'zip' },
  xlsx: { mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', sniff: 'zip' },
  pptx: { mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', sniff: 'zip' },
  odt:  { mime: 'application/vnd.oasis.opendocument.text', sniff: 'zip' },
  ods:  { mime: 'application/vnd.oasis.opendocument.spreadsheet', sniff: 'zip' },
  odp:  { mime: 'application/vnd.oasis.opendocument.presentation', sniff: 'zip' },
  doc:  { mime: 'application/msword', sniff: 'ole2' },
  xls:  { mime: 'application/vnd.ms-excel', sniff: 'ole2' },
  ppt:  { mime: 'application/vnd.ms-powerpoint', sniff: 'ole2' },

  zip:  { mime: 'application/zip', sniff: 'zip' },
  gz:   { mime: 'application/gzip', sniff: 'gzip' },

  mp4:  { mime: 'video/mp4', sniff: 'mp4' },
  webm: { mime: 'video/webm', sniff: 'webm' },

  txt:  { mime: 'text/plain; charset=utf-8', sniff: 'text' },
  log:  { mime: 'text/plain; charset=utf-8', sniff: 'text' },
  md:   { mime: 'text/plain; charset=utf-8', sniff: 'text' },
  conf: { mime: 'text/plain; charset=utf-8', sniff: 'text' },
  cfg:  { mime: 'text/plain; charset=utf-8', sniff: 'text' },
  ini:  { mime: 'text/plain; charset=utf-8', sniff: 'text' },
  csv:  { mime: 'text/csv; charset=utf-8', sniff: 'text' },
  json: { mime: 'application/json', sniff: 'text' },
  yaml: { mime: 'text/plain; charset=utf-8', sniff: 'text' },
  yml:  { mime: 'text/plain; charset=utf-8', sniff: 'text' },
  xml:  { mime: 'text/plain; charset=utf-8', sniff: 'text' },
}

export const DEFAULT_ALLOWED_EXTENSIONS: readonly string[] = Object.keys(RULES)

/** How many leading bytes the caller must hand to checkUploadedFile(). */
export const SNIFF_BYTES = 8192

function at(b: Buffer, offset: number, bytes: number[]): boolean {
  if (b.length < offset + bytes.length) return false
  return bytes.every((v, i) => b[offset + i] === v)
}

function ascii(b: Buffer, offset: number, s: string): boolean {
  return at(b, offset, Array.from(Buffer.from(s, 'latin1')))
}

function looksLikeText(b: Buffer): boolean {
  if (b.length === 0) return true
  const n = Math.min(b.length, SNIFF_BYTES)
  let control = 0
  for (let i = 0; i < n; i++) {
    const c = b[i]
    if (c === 0) return false
    // allow \t \n \r \f and everything >= 0x20; anything else is a stray control byte
    if (c < 0x20 && c !== 0x09 && c !== 0x0a && c !== 0x0d && c !== 0x0c) control++
  }
  return control / n < 0.02
}

function sniffMatches(sniff: Sniff, head: Buffer): boolean {
  switch (sniff) {
    case 'pdf':  return ascii(head, 0, '%PDF-')
    case 'png':  return at(head, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    case 'jpeg': return at(head, 0, [0xff, 0xd8, 0xff])
    case 'gif':  return ascii(head, 0, 'GIF87a') || ascii(head, 0, 'GIF89a')
    case 'webp': return ascii(head, 0, 'RIFF') && ascii(head, 8, 'WEBP')
    case 'zip':  return at(head, 0, [0x50, 0x4b, 0x03, 0x04]) || at(head, 0, [0x50, 0x4b, 0x05, 0x06])
    case 'ole2': return at(head, 0, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])
    case 'gzip': return at(head, 0, [0x1f, 0x8b])
    case 'mp4':  return ascii(head, 4, 'ftyp')
    case 'webm': return at(head, 0, [0x1a, 0x45, 0xdf, 0xa3])
    case 'text': return looksLikeText(head)
  }
}

export interface FileCheckInput {
  /** the file name as the user's browser reported it */
  originalName: string
  /** the first SNIFF_BYTES bytes of the file */
  head: Buffer
}

export type FileCheckResult =
  | { ok: true; ext: string; contentType: string; inline: boolean; safeName: string }
  | { ok: false; reason: string }

/** Strip any path, control characters and odd whitespace; keep it readable and short. */
export function sanitizeFileName(name: string): string {
  const base = name.replace(/\\/g, '/').split('/').pop() ?? ''
  const cleaned = base
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/[<>:"|?*]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
  const dot = cleaned.lastIndexOf('.')
  const stem = dot > 0 ? cleaned.slice(0, dot) : cleaned
  const ext = dot > 0 ? cleaned.slice(dot) : ''
  const maxStem = Math.max(1, 150 - ext.length)
  const out = (stem.length > maxStem ? stem.slice(0, maxStem) : stem) + ext
  return out || 'file'
}

export function checkUploadedFile(
  input: FileCheckInput,
  opts: { allowedExtensions?: Iterable<string> } = {},
): FileCheckResult {
  const safeName = sanitizeFileName(input.originalName)
  const dot = safeName.lastIndexOf('.')
  if (dot <= 0 || dot === safeName.length - 1) {
    return { ok: false, reason: 'The file has no extension, so its type cannot be verified.' }
  }
  const ext = safeName.slice(dot + 1).toLowerCase()

  const allowed = new Set(Array.from(opts.allowedExtensions ?? DEFAULT_ALLOWED_EXTENSIONS, e => e.toLowerCase()))
  const rule = RULES[ext]
  if (!rule || !allowed.has(ext)) {
    return { ok: false, reason: `Files of type ".${ext}" are not allowed.` }
  }
  if (!sniffMatches(rule.sniff, input.head)) {
    return { ok: false, reason: `The file content does not match its ".${ext}" extension.` }
  }
  return { ok: true, ext: `.${ext}`, contentType: rule.mime, inline: !!rule.inline, safeName }
}

/** For serving: derive the content type from a stored file name (used for legacy rows without one). */
export function contentTypeForName(name: string): { contentType: string; inline: boolean } {
  const ext = name.slice(name.lastIndexOf('.') + 1).toLowerCase()
  const rule = RULES[ext]
  return rule
    ? { contentType: rule.mime, inline: !!rule.inline }
    : { contentType: 'application/octet-stream', inline: false }
}
