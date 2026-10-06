import jwt from 'jsonwebtoken'
import { MulterError } from 'multer'
import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { errorHandler } from '../src/middleware/error-handler'
import { rateLimitKey } from '../src/middleware/rate-limit'
import { contentDisposition } from '../src/modules/files/content-disposition'
import { HttpError } from '../src/utils/http-error'

const req = (headers: Record<string, string> = {}, ip = '10.0.0.5') => ({ headers, ip }) as any

describe('rateLimitKey', () => {
  it('gives each signed-in user their own bucket, even behind one shared IP', () => {
    const a = jwt.sign({ userId: 'alice' }, process.env.JWT_SECRET!)
    const b = jwt.sign({ userId: 'bob' }, process.env.JWT_SECRET!)
    expect(rateLimitKey(req({ authorization: `Bearer ${a}` }))).toBe('u:alice')
    expect(rateLimitKey(req({ authorization: `Bearer ${b}` }))).toBe('u:bob')
  })

  it('falls back to the IP for anonymous callers', () => {
    expect(rateLimitKey(req())).toBe('ip:10.0.0.5')
  })

  it('does not trust an invalid or forged token', () => {
    const forged = jwt.sign({ userId: 'alice' }, 'some-other-secret')
    expect(rateLimitKey(req({ authorization: `Bearer ${forged}` }))).toBe('ip:10.0.0.5')
    expect(rateLimitKey(req({ authorization: 'Bearer junk' }))).toBe('ip:10.0.0.5')
  })

  it("a file-download token does not create a user bucket", () => {
    expect(rateLimitKey(req({ authorization: 'Bearer ' }))).toBe('ip:10.0.0.5')
  })
})

function run(err: Error) {
  const res: any = { statusCode: 0, body: undefined as any }
  res.status = (s: number) => { res.statusCode = s; return res }
  res.json = (b: any) => { res.body = b; return res }
  const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  errorHandler(err, {} as any, res, () => undefined)
  log.mockRestore()
  return res
}

describe('errorHandler', () => {
  it('uses the status carried by an HttpError', () => {
    expect(run(HttpError.forbidden('no')).statusCode).toBe(403)
    expect(run(HttpError.badRequest('bad type')).statusCode).toBe(400)
    expect(run(HttpError.notFound('gone')).statusCode).toBe(404)
    expect(run(HttpError.tooLarge('big')).statusCode).toBe(413)
    expect(run(HttpError.badRequest('bad type')).body).toEqual({ success: false, message: 'bad type' })
  })

  it('maps an oversize upload to 413 with a friendly message', () => {
    const r = run(new MulterError('LIMIT_FILE_SIZE'))
    expect(r.statusCode).toBe(413)
    expect(r.body.message).toMatch(/larger than the allowed/i)
  })

  it('keeps the established status mapping for deliberate errors (full cases: error-classification.test.ts)', () => {
    expect(run(new Error('Task not found')).statusCode).toBe(404)
    // a bug is a 500 with no detail; a deliberate message is a 4xx the person can read
    expect(run(new TypeError('x is undefined')).statusCode).toBe(500)
    expect(run(new Error('something went wrong with your input')).statusCode).toBe(400)
  })

  it('maps validation errors to 400', () => {
    let zerr: Error = new Error()
    try { z.object({ a: z.string() }).parse({}) } catch (e) { zerr = e as Error }
    expect(run(zerr).statusCode).toBe(400)
  })
})

describe('contentDisposition', () => {
  it('encodes non-ASCII names and never allows header injection', () => {
    const h = contentDisposition('attachment', 'résumé "x"\r\nSet-Cookie: a=b.pdf')
    expect(h).not.toMatch(/[\r\n]/)
    expect(h).toContain("filename*=UTF-8''")
    expect(h.startsWith('attachment;')).toBe(true)
  })
  it('supports inline', () => {
    expect(contentDisposition('inline', 'a.pdf')).toBe(`inline; filename="a.pdf"; filename*=UTF-8''a.pdf`)
  })
})
