import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { classifyError, errorHandler } from '../src/middleware/error-handler'
import { HttpError } from '../src/utils/http-error'

function run(err: any, req: any = { id: 'req-12345678', method: 'GET', originalUrl: '/x' }) {
  const res: any = { statusCode: 0, body: undefined as any, headersSent: false }
  res.status = (s: number) => { res.statusCode = s; return res }
  res.json = (b: any) => { res.body = b; return res }
  const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  errorHandler(err, req, res, () => undefined)
  const logged = log.mock.calls.length
  log.mockRestore()
  return { res, logged }
}

class PrismaClientKnownRequestError extends Error {
  constructor(public code: string, message = 'Invalid `prisma.user.findMany()` invocation: table "users" column "secret_col" ...') {
    super(message); this.name = 'PrismaClientKnownRequestError'
  }
}

describe('error handler: what the caller is told', () => {
  it('turns a deliberate service error into a 4xx with its message (it used to be a 500)', () => {
    const { res, logged } = run(new Error('The selected owner is not an active user'))
    expect(res.statusCode).toBe(400)
    expect(res.body.message).toBe('The selected owner is not an active user')
    expect(logged).toBe(0) // not a server fault, not logged as one
  })

  it('keeps the established mappings: not found -> 404, already exists -> 409, Unauthorized -> 401', () => {
    expect(run(new Error('Task not found')).res.statusCode).toBe(404)
    expect(run(new Error('A connection named "x" already exists')).res.statusCode).toBe(409)
    expect(run(new Error('Unauthorized')).res.statusCode).toBe(401)
  })

  it('never leaks database detail: a Prisma error becomes a generic message with a reference', () => {
    const { res, logged } = run(new PrismaClientKnownRequestError('P2021'))
    expect(res.statusCode).toBe(500)
    expect(JSON.stringify(res.body)).not.toMatch(/prisma|users|secret_col|invocation/i)
    expect(res.body.reference).toBe('req-12345678')
    expect(logged).toBe(1) // the detail goes to the server log
  })

  it('maps the Prisma errors a user can cause to 4xx without detail', () => {
    expect(classifyError(new PrismaClientKnownRequestError('P2002')).status).toBe(409)
    expect(classifyError(new PrismaClientKnownRequestError('P2025')).status).toBe(404)
    expect(classifyError(new PrismaClientKnownRequestError('P2003')).status).toBe(409)
    expect(classifyError(new PrismaClientKnownRequestError('P2034')).status).toBe(409)
    expect(classifyError(new PrismaClientKnownRequestError('P2002')).message).not.toMatch(/prisma|users/i)
  })

  it('treats a bug (TypeError) as a generic 500, not a message to show', () => {
    const { res } = run(new TypeError("Cannot read properties of undefined (reading 'id')"))
    expect(res.statusCode).toBe(500)
    expect(res.body.message).not.toMatch(/undefined|reading/)
  })

  it('treats a plain Error that describes infrastructure as a 500', () => {
    for (const text of ['connect ECONNREFUSED 10.0.0.4:5432', 'Connection terminated unexpectedly', "Can't reach database server", 'timeout exceeded when trying to connect']) {
      expect(classifyError(new Error(text)).status).toBe(500)
    }
  })

  it('passes malformed-JSON and too-large-body errors from Express through as 4xx', () => {
    const e: any = new SyntaxError('Unexpected token } in JSON'); e.status = 400; e.expose = true
    expect(classifyError(e).status).toBe(400)
    const big: any = new Error('request entity too large'); big.status = 413; big.expose = true
    expect(classifyError(big).status).toBe(413)
  })

  it('HttpError carries its status and any extra fields to the client', () => {
    const { res } = run(HttpError.conflict('This would remove 5 users', { requiresConfirmation: true, wouldDeactivate: 5 }))
    expect(res.statusCode).toBe(409)
    expect(res.body).toMatchObject({ success: false, message: 'This would remove 5 users', requiresConfirmation: true, wouldDeactivate: 5 })
  })

  it('validation errors list the offending fields', () => {
    let zerr: any
    try { z.object({ a: z.string() }).parse({}) } catch (e) { zerr = e }
    const { res } = run(zerr)
    expect(res.statusCode).toBe(400)
    expect(res.body.errors[0]).toMatchObject({ field: 'a' })
  })

  it('does not write twice if headers were already sent', () => {
    const res: any = { headersSent: true }
    const next = vi.fn()
    errorHandler(new Error('x'), {} as any, res, next)
    expect(next).toHaveBeenCalled()
  })
})
