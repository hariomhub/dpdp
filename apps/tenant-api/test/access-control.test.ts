import jwt from 'jsonwebtoken'
import { describe, expect, it, vi } from 'vitest'

import { authenticate, requireRole } from '../src/middleware/auth'
import { AUDIT_LOG_VIEWER_ROLES, CLOUD_OPERATOR_ROLES, ORG_SETUP_ROLES } from '../src/utils/roles'

function res() {
  const r: any = { statusCode: 200, body: undefined }
  r.status = (s: number) => { r.statusCode = s; return r }
  r.json = (b: any) => { r.body = b; return r }
  return r
}

function callAuth(authorization?: string) {
  const r = res()
  const next = vi.fn()
  const req: any = { headers: authorization ? { authorization } : {} }
  return authenticate(req, r, next).then(() => ({ req, res: r, next }))
}

const token = (claims: object = { userId: 'u1', tenantId: 't1', role: 'CO' }, secret = process.env.JWT_SECRET!) =>
  jwt.sign(claims, secret, { expiresIn: 60 })

describe('authenticate', () => {
  it('lets a valid token through and sets the caller', async () => {
    const { req, next, res: r } = await callAuth(`Bearer ${token()}`)
    expect(next).toHaveBeenCalledOnce()
    expect(r.statusCode).toBe(200)
    expect(req).toMatchObject({ userId: 'u1', tenantId: 't1', userRole: 'CO' })
  })

  it('401 without a token, with garbage, with the wrong secret', async () => {
    for (const h of [undefined, 'Bearer ', 'Bearer junk', `Bearer ${token(undefined, 'some-other-secret')}`, 'Basic abc']) {
      const { next, res: r } = await callAuth(h)
      expect(next).not.toHaveBeenCalled()
      expect(r.statusCode).toBe(401)
    }
  })
})

function allowed(guard: ReturnType<typeof requireRole>, role?: string) {
  const r = res()
  const next = vi.fn()
  guard({ userRole: role } as any, r, next)
  return next.mock.calls.length === 1
}

describe('role groups', () => {
  const ALL = ['CEO', 'CO', 'IT_ADMIN', 'INTERNAL_AUDITOR', 'EXTERNAL_AUDITOR']
  const who = (g: ReturnType<typeof requireRole>) => ALL.filter(r => allowed(g, r))

  it('organisation setup (details, classification, structure, invites, complete): CEO and CO only', () => {
    expect(who(requireRole(...ORG_SETUP_ROLES))).toEqual(['CEO', 'CO'])
  })

  it('cloud connections and discovery: CEO, CO and IT Admin - never an auditor', () => {
    expect(who(requireRole(...CLOUD_OPERATOR_ROLES))).toEqual(['CEO', 'CO', 'IT_ADMIN'])
  })

  it('audit log: CEO, CO and Internal Auditor - not IT Admin, not External Auditor', () => {
    expect(who(requireRole(...AUDIT_LOG_VIEWER_ROLES))).toEqual(['CEO', 'CO', 'INTERNAL_AUDITOR'])
  })

  it('a missing or unknown role is always refused', () => {
    for (const g of [ORG_SETUP_ROLES, CLOUD_OPERATOR_ROLES, AUDIT_LOG_VIEWER_ROLES]) {
      expect(allowed(requireRole(...g), undefined)).toBe(false)
      expect(allowed(requireRole(...g), 'GUEST')).toBe(false)
    }
  })

  it('a refusal is a 403', () => {
    const r = res()
    requireRole(...ORG_SETUP_ROLES)({ userRole: 'EXTERNAL_AUDITOR' } as any, r, vi.fn())
    expect(r.statusCode).toBe(403)
  })
})
