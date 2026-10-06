import { describe, expect, it } from 'vitest'
import { checkUploadedFile, contentTypeForName, sanitizeFileName } from '../src'

const PDF = Buffer.from('%PDF-1.7\n1 0 obj\n')
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10])
const ZIP = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00])
const OLE2 = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0])
const HTML = Buffer.from('<html><script>alert(1)</script></html>')

describe('checkUploadedFile - accepts genuine files', () => {
  it('pdf', () => {
    const r = checkUploadedFile({ originalName: 'Policy.PDF', head: PDF })
    expect(r).toMatchObject({ ok: true, ext: '.pdf', contentType: 'application/pdf', inline: true })
  })
  it('png is served inline', () => {
    expect(checkUploadedFile({ originalName: 'shot.png', head: PNG })).toMatchObject({ ok: true, inline: true })
  })
  it('jpg and jpeg', () => {
    expect(checkUploadedFile({ originalName: 'a.jpg', head: JPEG }).ok).toBe(true)
    expect(checkUploadedFile({ originalName: 'a.jpeg', head: JPEG }).ok).toBe(true)
  })
  it('office documents are never inline', () => {
    expect(checkUploadedFile({ originalName: 'r.docx', head: ZIP })).toMatchObject({ ok: true, inline: false })
    expect(checkUploadedFile({ originalName: 'r.xlsx', head: ZIP })).toMatchObject({ ok: true, inline: false })
    expect(checkUploadedFile({ originalName: 'old.doc', head: OLE2 })).toMatchObject({ ok: true, inline: false })
  })
  it('text-like config exports', () => {
    expect(checkUploadedFile({ originalName: 'conf.yaml', head: Buffer.from('a: 1\nb: 2\n') }).ok).toBe(true)
    expect(checkUploadedFile({ originalName: 'users.csv', head: Buffer.from('id,name\n1,a\n') }).ok).toBe(true)
    expect(checkUploadedFile({ originalName: 'empty.txt', head: Buffer.alloc(0) }).ok).toBe(true)
  })
})

describe('checkUploadedFile - rejects dangerous or mismatched files', () => {
  it.each(['evil.html', 'evil.htm', 'evil.svg', 'evil.js', 'evil.exe', 'evil.bat', 'evil.ps1', 'evil.php', 'evil.jsp'])(
    'blocks %s even with harmless-looking content',
    (name) => {
      expect(checkUploadedFile({ originalName: name, head: Buffer.from('hello') }).ok).toBe(false)
    },
  )

  it('blocks html disguised with a pdf extension', () => {
    const r = checkUploadedFile({ originalName: 'report.pdf', head: HTML })
    expect(r).toMatchObject({ ok: false })
  })

  it('blocks a double extension that ends in a dangerous type', () => {
    expect(checkUploadedFile({ originalName: 'report.pdf.html', head: PDF }).ok).toBe(false)
  })

  it('blocks png content under a txt name only if it looks binary', () => {
    expect(checkUploadedFile({ originalName: 'x.txt', head: PNG }).ok).toBe(false)
  })

  it('blocks files with no extension', () => {
    expect(checkUploadedFile({ originalName: 'README', head: Buffer.from('hi') }).ok).toBe(false)
    expect(checkUploadedFile({ originalName: 'trailing.', head: Buffer.from('hi') }).ok).toBe(false)
  })

  it('blocks a script smuggled in a docx-named non-zip', () => {
    expect(checkUploadedFile({ originalName: 'a.docx', head: HTML }).ok).toBe(false)
  })

  it('honours a tighter allow-list', () => {
    expect(checkUploadedFile({ originalName: 'a.png', head: PNG }, { allowedExtensions: ['pdf'] }).ok).toBe(false)
    expect(checkUploadedFile({ originalName: 'a.pdf', head: PDF }, { allowedExtensions: ['pdf'] }).ok).toBe(true)
  })
})

describe('sanitizeFileName', () => {
  it('drops directories and control characters', () => {
    expect(sanitizeFileName('..\\..\\windows\\evil.pdf')).toBe('evil.pdf')
    expect(sanitizeFileName('a/b/c.png')).toBe('c.png')
    expect(sanitizeFileName('x\u0000y.png')).toBe('xy.png')
  })
  it('keeps the extension when shortening', () => {
    const out = sanitizeFileName('a'.repeat(400) + '.pdf')
    expect(out.length).toBeLessThanOrEqual(150)
    expect(out.endsWith('.pdf')).toBe(true)
  })
  it('never returns empty', () => {
    expect(sanitizeFileName('///')).toBe('file')
  })
})

describe('contentTypeForName', () => {
  it('maps known types and falls back safely', () => {
    expect(contentTypeForName('a.pdf')).toEqual({ contentType: 'application/pdf', inline: true })
    expect(contentTypeForName('a.weird')).toEqual({ contentType: 'application/octet-stream', inline: false })
  })
})
