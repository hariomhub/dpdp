import jwt from 'jsonwebtoken'
import { describe, expect, it } from 'vitest'
import { signFileToken, verifyFileToken } from '../src/modules/files/file-token'
import { HttpError } from '../src/utils/http-error'

const claims = { k: 'evidence' as const, id: 'ev-1', uid: 'user-1', tid: 'tenant-1', dl: false }

describe('file link tokens', () => {
  it('round-trips the claims', () => {
    const t = verifyFileToken(signFileToken(claims))
    expect(t).toMatchObject({ typ: 'file', k: 'evidence', id: 'ev-1', uid: 'user-1', tid: 'tenant-1', dl: false })
  })

  it('carries a version id and the download flag', () => {
    const t = verifyFileToken(signFileToken({ ...claims, v: 'ver-9', dl: true }))
    expect(t.v).toBe('ver-9')
    expect(t.dl).toBe(true)
  })

  it('expires', async () => {
    const token = signFileToken(claims, 1)
    await new Promise(r => setTimeout(r, 2100))
    expect(() => verifyFileToken(token)).toThrow(HttpError)
  })

  it('rejects a tampered token', () => {
    const token = signFileToken(claims)
    const [h, p, s] = token.split('.')
    const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(p, 'base64url').toString()), id: 'someone-elses' })).toString('base64url')
    expect(() => verifyFileToken(`${h}.${forged}.${s}`)).toThrow(HttpError)
  })

  it('rejects garbage', () => {
    expect(() => verifyFileToken('not-a-token')).toThrow(HttpError)
    expect(() => verifyFileToken('')).toThrow(HttpError)
  })

  it('a login access token can NOT be used as a file link', () => {
    const access = jwt.sign({ userId: 'user-1', tenantId: 'tenant-1', role: 'CO' }, process.env.JWT_SECRET!, { expiresIn: 60 })
    expect(() => verifyFileToken(access)).toThrow(HttpError)
  })

  it('a file link can NOT be used as a login access token', () => {
    const token = signFileToken(claims)
    expect(() => jwt.verify(token, process.env.JWT_SECRET!)).toThrow()
  })

  it('rejects an unsigned (alg none) token', () => {
    const none = `${Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url')}.${Buffer.from(JSON.stringify({ ...claims, typ: 'file' })).toString('base64url')}.`
    expect(() => verifyFileToken(none)).toThrow(HttpError)
  })
})
