import { beforeEach, describe, expect, it, vi } from 'vitest'
import jwt from 'jsonwebtoken'

const access = vi.hoisted(() => ({ getUserAccess: vi.fn() }))
vi.mock('../src/utils/user-access', async (orig) => ({ ...(await orig<typeof import('../src/utils/user-access')>()), getUserAccess: access.getUserAccess }))

import { authenticate } from '../src/middleware/auth'
import { evaluateSession } from '../src/utils/user-access'
import { generateTokens, signAccessToken } from '../src/utils/tokens'
import { hashRefreshToken } from '../src/modules/auth/sessions'
import { createLoginSession } from '../src/modules/entra/entra-state'

const SECRET = process.env.JWT_SECRET!
const T = { userId: 'u1', tenantId: 't1', role: 'CO' }
const active = (o: object = {}) => ({ tenantId: 't1', status: 'ACTIVE', role: 'CO', passwordChangedAt: null, ...o })

describe('evaluateSession: is this token still good right now?', () => {
  it('active user of the same organisation: ok, and the role is the CURRENT one from the database', () => {
    expect(evaluateSession({ ...T, iat: 100 }, active({ role: 'IT_ADMIN' }))).toEqual({ ok: true, role: 'IT_ADMIN' })
  })
  it('deactivated, pending, or unknown user: 401 (so the portal signs them out)', () => {
    for (const a of [active({ status: 'INACTIVE' }), active({ status: 'PENDING_INVITE' }), null]) {
      expect(evaluateSession({ ...T, iat: 100 }, a)).toMatchObject({ ok: false, status: 401 })
    }
  })
  it('a token for another organisation is refused', () => {
    expect(evaluateSession({ ...T, iat: 100 }, active({ tenantId: 'other' }))).toMatchObject({ ok: false, status: 401 })
  })
  it('a token issued before the password changed is refused; one issued after is fine', () => {
    const changed = new Date('2026-10-06T10:00:00Z')
    const before = Math.floor(changed.getTime() / 1000) - 60
    const after = Math.floor(changed.getTime() / 1000) + 60
    expect(evaluateSession({ ...T, iat: before }, active({ passwordChangedAt: changed }))).toMatchObject({ ok: false })
    expect(evaluateSession({ ...T, iat: after }, active({ passwordChangedAt: changed }))).toMatchObject({ ok: true })
  })
})

function call(token?: string) {
  const req: any = { headers: token ? { authorization: `Bearer ${token}` } : {} }
  const res: any = { code: 0, body: undefined as any }
  res.status = (c: number) => { res.code = c; return res }
  res.json = (b: any) => { res.body = b; return res }
  const next = vi.fn()
  return authenticate(req, res, next).then(() => ({ req, res, next }))
}

describe('authenticate middleware', () => {
  beforeEach(() => access.getUserAccess.mockReset())

  it('accepts an access token and uses the role from the database, not the token', async () => {
    access.getUserAccess.mockResolvedValue(active({ role: 'IT_ADMIN' }))
    const { req, next } = await call(signAccessToken(T))
    expect(next).toHaveBeenCalled()
    expect(req.userRole).toBe('IT_ADMIN')          // demoted since the token was issued
    expect(req.userId).toBe('u1')
  })

  it('a refresh token cannot be used as an access token', async () => {
    access.getUserAccess.mockResolvedValue(active())
    const { res, next } = await call(generateTokens(T).refreshToken)
    expect(res.code).toBe(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('a Microsoft sign-in state token cannot be used as an access token', async () => {
    const { res, next } = await call(createLoginSession('t1').state)
    expect(res.code).toBe(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('a token from before the type claim existed (no `type`) is still accepted until it expires', async () => {
    access.getUserAccess.mockResolvedValue(active())
    const legacy = jwt.sign(T, SECRET, { expiresIn: '15m' })
    expect((await call(legacy)).next).toHaveBeenCalled()
  })

  it('a token missing identity claims is refused', async () => {
    const { res, next } = await call(jwt.sign({ type: 'access' }, SECRET))
    expect(res.code).toBe(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('a deactivated user is refused immediately, even with a valid token', async () => {
    access.getUserAccess.mockResolvedValue(active({ status: 'INACTIVE' }))
    const { res, next } = await call(signAccessToken(T))
    expect(res.code).toBe(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('if the user lookup itself fails, the request falls back to the token (a database hiccup does not sign everyone out)', async () => {
    access.getUserAccess.mockResolvedValue(undefined)
    const { req, next } = await call(signAccessToken(T))
    expect(next).toHaveBeenCalled()
    expect(req.userRole).toBe('CO')
  })

  it('no token, bad signature and expired token are all 401', async () => {
    expect((await call()).res.code).toBe(401)
    expect((await call(jwt.sign(T, 'wrong-secret'))).res.code).toBe(401)
    expect((await call(jwt.sign(T, SECRET, { expiresIn: -5 }))).res.code).toBe(401)
  })
})

describe('refresh-token hashing', () => {
  it('is a stable one-way hash (the token itself is never stored)', () => {
    const t = generateTokens(T).refreshToken
    expect(hashRefreshToken(t)).toBe(hashRefreshToken(t))
    expect(hashRefreshToken(t)).toMatch(/^[0-9a-f]{64}$/)
    expect(hashRefreshToken(t)).not.toContain(t.slice(0, 20))
  })
})
