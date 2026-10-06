import { describe, expect, it } from 'vitest'
import { decide } from '../src/platform/licence-gate'

const READ = ['GET', 'HEAD']
const CHANGE = ['POST', 'PUT', 'PATCH', 'DELETE']
const ANY_PATH = '/api/v1/assessments'

describe('what the licence permits (gate decisions)', () => {
  it('active and grace: everything is allowed', () => {
    for (const state of ['ACTIVE', 'GRACE'] as const) {
      for (const m of [...READ, ...CHANGE]) expect(decide(state, m, ANY_PATH).allowed).toBe(true)
    }
  })

  it('read-only (a licence that lapsed): reading and exporting work, every change is refused with the reason', () => {
    for (const m of READ) expect(decide('RESTRICTED', m, ANY_PATH, 'expired').allowed).toBe(true)
    for (const m of CHANGE) expect(decide('RESTRICTED', m, ANY_PATH, 'expired')).toMatchObject({ allowed: false, code: 'LICENCE_RESTRICTED' })
    expect(decide('RESTRICTED', 'POST', ANY_PATH, 'revoked').message).toMatch(/withdrawn/)
    expect(decide('RESTRICTED', 'POST', ANY_PATH, 'clock').message).toMatch(/clock/)
    expect(decide('RESTRICTED', 'POST', ANY_PATH, 'invalid').message).toMatch(/cannot be verified/)
  })

  it('read-only still lets people sign out, stay signed in, renew, and open a file (a POST that only reads)', () => {
    expect(decide('RESTRICTED', 'POST', '/api/v1/auth/logout').allowed).toBe(true)
    expect(decide('RESTRICTED', 'POST', '/api/v1/auth/refresh').allowed).toBe(true)
    expect(decide('RESTRICTED', 'POST', '/api/v1/platform/licence').allowed).toBe(true)
    expect(decide('RESTRICTED', 'POST', '/api/v1/files/evidence/abc/link').allowed).toBe(true)
    expect(decide('RESTRICTED', 'POST', '/api/v1/files/evidence/abc/link/extra').allowed).toBe(false)
  })

  it('never licensed: a hard gate - not even reading, not even export - except the few things needed to install a licence', () => {
    for (const m of READ) expect(decide('UNLICENSED', m, ANY_PATH)).toMatchObject({ allowed: false, code: 'NO_LICENCE' })
    for (const m of CHANGE) expect(decide('UNLICENSED', m, ANY_PATH)).toMatchObject({ allowed: false, code: 'NO_LICENCE' })
    expect(decide('UNLICENSED', 'GET', '/api/v1/files/evidence/abc/link').allowed).toBe(false)
    expect(decide('UNLICENSED', 'POST', '/api/v1/files/evidence/abc/link').allowed).toBe(false)   // export is blocked too

    expect(decide('UNLICENSED', 'GET', '/api/v1/auth/me').allowed).toBe(true)
    expect(decide('UNLICENSED', 'POST', '/api/v1/auth/logout').allowed).toBe(true)
    expect(decide('UNLICENSED', 'GET', '/api/v1/platform/licence').allowed).toBe(true)
    expect(decide('UNLICENSED', 'POST', '/api/v1/platform/licence').allowed).toBe(true)
  })

  it('the message for a never-licensed organization says what to do', () => {
    expect(decide('UNLICENSED', 'GET', ANY_PATH).message).toMatch(/no licence installed/)
  })
})
