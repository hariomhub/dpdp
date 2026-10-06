import { describe, expect, it, vi } from 'vitest'
import { assertValidConfig, validateConfig } from '../src/config/validate'

const GOOD = {
  NODE_ENV: 'production',
  TENANT_DATABASE_URL: 'postgresql://u:p@db.example.com:5432/tenant',
  SUPER_ADMIN_DATABASE_URL: 'postgresql://u:p@db.example.com:5432/sa',
  REDIS_URL: 'rediss://:secret@cache.example.com:10000',
  JWT_SECRET: 'x'.repeat(48),
  TENANT_APP_URL: 'https://compliance.example.com',
  SMTP_HOST: 'smtp.example.com',
  SMTP_PORT: '587',
  SMTP_FROM_EMAIL: 'noreply@example.com',
  STORAGE_PROVIDER: 'azure',
  AZURE_EVIDENCE_CONNECTION_STRING: 'DefaultEndpointsProtocol=https;AccountName=x;AccountKey=y;EndpointSuffix=core.windows.net',
  ENTRA_ENCRYPTION_KEY: 'a'.repeat(64),
  CLOUD_CONNECTION_ENCRYPTION_KEY: 'b'.repeat(64),
} as NodeJS.ProcessEnv

const errorsOf = (env: Record<string, string | undefined>, role: 'api' | 'worker' = 'api') =>
  validateConfig({ ...GOOD, ...env } as NodeJS.ProcessEnv, role).errors

describe('validateConfig', () => {
  it('accepts a complete production configuration', () => {
    const r = validateConfig(GOOD)
    expect(r.errors).toEqual([])
    expect(r.warnings).toEqual([])
  })

  it('reports every problem at once, not just the first', () => {
    const errors = validateConfig({ NODE_ENV: 'production' } as NodeJS.ProcessEnv).errors
    expect(errors.length).toBeGreaterThanOrEqual(5)
    expect(errors.join('\n')).toMatch(/TENANT_DATABASE_URL/)
    expect(errors.join('\n')).toMatch(/JWT_SECRET/)
    expect(errors.join('\n')).toMatch(/TENANT_APP_URL/)
    expect(errors.join('\n')).toMatch(/REDIS_URL/)
  })

  it('requires a postgres URL', () => {
    expect(errorsOf({ TENANT_DATABASE_URL: 'mysql://x' })).toContain('TENANT_DATABASE_URL must be a postgresql:// URL.')
  })

  it('requires a strong JWT secret in production, only warns elsewhere', () => {
    expect(errorsOf({ JWT_SECRET: 'short' }).join()).toMatch(/JWT_SECRET is shorter than 32/)
    const dev = validateConfig({ ...GOOD, NODE_ENV: 'development', JWT_SECRET: 'short' } as NodeJS.ProcessEnv)
    expect(dev.errors.join()).not.toMatch(/JWT_SECRET/)
    expect(dev.warnings.join()).toMatch(/JWT_SECRET/)
  })

  it('checks encryption keys are 64 hex characters when present', () => {
    expect(errorsOf({ ENTRA_ENCRYPTION_KEY: 'not-hex' }).join()).toMatch(/ENTRA_ENCRYPTION_KEY must be 64 hexadecimal/)
    expect(errorsOf({ CLOUD_CONNECTION_ENCRYPTION_KEY: 'a'.repeat(63) }).join()).toMatch(/CLOUD_CONNECTION_ENCRYPTION_KEY/)
  })

  it('azure storage needs its own connection string (no silent fallback to another account)', () => {
    expect(errorsOf({ AZURE_EVIDENCE_CONNECTION_STRING: undefined })).toContain(
      'AZURE_EVIDENCE_CONNECTION_STRING is required (STORAGE_PROVIDER=azure stores customer evidence there).')
    expect(errorsOf({ STORAGE_PROVIDER: 'ftp' }).join()).toMatch(/STORAGE_PROVIDER must be local or azure/)
    expect(errorsOf({ AZURE_EVIDENCE_CONTAINER: 'Bad_Name' }).join()).toMatch(/AZURE_EVIDENCE_CONTAINER/)
  })

  it('warns that local storage in production is the machine disk', () => {
    const r = validateConfig({ ...GOOD, STORAGE_PROVIDER: 'local' } as NodeJS.ProcessEnv)
    expect(r.errors).toEqual([])
    expect(r.warnings.join()).toMatch(/files live on this machine/)
  })

  it('SMTP is optional, an unauthenticated relay is valid, a half-set login is not', () => {
    expect(validateConfig({ ...GOOD, SMTP_HOST: undefined } as NodeJS.ProcessEnv).errors).toEqual([])
    expect(validateConfig({ ...GOOD, SMTP_HOST: undefined } as NodeJS.ProcessEnv).warnings.join()).toMatch(/SMTP_HOST is not set/)
    expect(errorsOf({ SMTP_USER: undefined, SMTP_PASS: undefined })).toEqual([])                 // relay, no login
    expect(errorsOf({ SMTP_USER: 'u' }).join()).toMatch(/SMTP_USER and SMTP_PASS must be set together/)
    expect(errorsOf({ SMTP_FROM_EMAIL: undefined }).join()).toMatch(/SMTP_FROM_EMAIL is required/)
    expect(errorsOf({ SMTP_FROM_EMAIL: 'not an email' }).join()).toMatch(/must be an email/)
  })

  it('validates numbers, durations and origins', () => {
    expect(errorsOf({ PORT: 'abc' }).join()).toMatch(/PORT must be a whole number/)
    expect(errorsOf({ PORT: '70000' }).join()).toMatch(/PORT must be a whole number/)
    expect(errorsOf({ JWT_EXPIRES_IN: 'soon' }).join()).toMatch(/JWT_EXPIRES_IN must be a duration/)
    expect(errorsOf({ JWT_EXPIRES_IN: '15m', JWT_REFRESH_EXPIRES_IN: '7d' })).toEqual([])
    expect(errorsOf({ CORS_ALLOWED_ORIGINS: 'https://a.example.com, https://b.example.com:8443' })).toEqual([])
    expect(errorsOf({ CORS_ALLOWED_ORIGINS: 'https://a.example.com/path' }).join()).toMatch(/CORS_ALLOWED_ORIGINS entry/)
    expect(errorsOf({ CSP_MODE: 'strict' }).join()).toMatch(/CSP_MODE/)
    expect(errorsOf({ FILE_LINK_TTL_SECONDS: '5' }).join()).toMatch(/FILE_LINK_TTL_SECONDS/)
    expect(errorsOf({ DATABASE_POOL_MAX: '0' }).join()).toMatch(/DATABASE_POOL_MAX/)
    expect(errorsOf({ DATABASE_POOL_MAX: '20', DATABASE_CONNECT_TIMEOUT_MS: '5000' })).toEqual([])
  })

  it('licence enforcement cannot be switched off in production; one licence source only', () => {
    expect(errorsOf({ LICENCE_MODE: 'off' }).join()).toMatch(/not allowed in production/)
    expect(validateConfig({ ...GOOD, NODE_ENV: 'development', LICENCE_MODE: 'off' } as NodeJS.ProcessEnv).errors).toEqual([])
    expect(errorsOf({ LICENCE_MODE: 'maybe' }).join()).toMatch(/LICENCE_MODE must be/)
    expect(errorsOf({ LICENCE_TOKEN: 'abc', LICENCE_FILE: '/x' }).join()).toMatch(/only one of LICENCE_TOKEN and LICENCE_FILE/)
    expect(errorsOf({ PLATFORM_TRUST_KEYS: '{bad' }).join()).toMatch(/PLATFORM_TRUST_KEYS must be a JSON array/)
  })

  it('accepts redis:// and rediss:// only', () => {
    expect(errorsOf({ REDIS_URL: 'http://x' }).join()).toMatch(/REDIS_URL must be a redis/)
    expect(errorsOf({ REDIS_URL: 'redis://localhost:6379' })).toEqual([])
  })

  it('the worker needs only database, redis and keys', () => {
    const r = validateConfig({ NODE_ENV: 'production', TENANT_DATABASE_URL: GOOD.TENANT_DATABASE_URL, SUPER_ADMIN_DATABASE_URL: GOOD.SUPER_ADMIN_DATABASE_URL, REDIS_URL: GOOD.REDIS_URL } as NodeJS.ProcessEnv, 'worker')
    expect(r.errors).toEqual([])
  })
})

describe('assertValidConfig', () => {
  it('prints all problems and exits non-zero', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const exit = vi.fn(() => { throw new Error('exit') }) as unknown as (c: number) => never
    expect(() => assertValidConfig({ NODE_ENV: 'production' } as NodeJS.ProcessEnv, 'api', exit)).toThrow('exit')
    expect(exit).toHaveBeenCalledWith(1)
    expect(err.mock.calls.flat().join('\n')).toMatch(/cannot start/)
    err.mockRestore()
  })

  it('does nothing for a valid configuration', () => {
    const exit = vi.fn() as unknown as (c: number) => never
    assertValidConfig(GOOD, 'api', exit)
    expect(exit).not.toHaveBeenCalled()
  })
})
