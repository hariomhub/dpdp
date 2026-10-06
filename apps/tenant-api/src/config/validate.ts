/**
 * Boot-time validation of the environment.
 *
 * A missing or malformed setting should stop the process at start-up with one message that lists EVERY problem - not
 * surface later as an odd runtime failure (an email that never sends, a file that cannot be stored, a token that
 * cannot be verified). Pure function over an env object, so it is unit-tested without touching process.env.
 */

export type ProcessRole = 'api' | 'worker'

export interface ConfigReport {
  errors: string[]
  warnings: string[]
}

const isInt = (v: string, min: number, max: number): boolean => /^\d+$/.test(v) && +v >= min && +v <= max
const isHex64 = (v: string): boolean => /^[0-9a-fA-F]{64}$/.test(v)
const DURATION = /^\d+(ms|s|m|h|d)?$/

function isUrl(v: string, protocols: string[]): boolean {
  try { return protocols.includes(new URL(v).protocol) } catch { return false }
}

/** An origin is scheme + host (+ port) and nothing else - no path, no trailing slash. */
function isOrigin(v: string): boolean {
  try { const u = new URL(v); return /^https?:$/.test(u.protocol) && v === u.origin } catch { return false }
}

const CONTAINER_NAME = /^(?!.*--)[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/

export function validateConfig(env: NodeJS.ProcessEnv, role: ProcessRole = 'api'): ConfigReport {
  const errors: string[] = []
  const warnings: string[] = []
  const prod = env.NODE_ENV === 'production'
  const has = (k: string) => !!(env[k] && env[k]!.trim() !== '')
  const need = (k: string, why: string) => { if (!has(k)) errors.push(`${k} is required (${why}).`) }
  const intRange = (k: string, min: number, max: number) => {
    if (has(k) && !isInt(env[k]!, min, max)) errors.push(`${k} must be a whole number between ${min} and ${max} (got "${env[k]}").`)
  }

  // ── Always ────────────────────────────────────────────────────────────────
  if (has('NODE_ENV') && !['development', 'test', 'production'].includes(env.NODE_ENV!)) {
    warnings.push(`NODE_ENV is "${env.NODE_ENV}"; use development, test or production.`)
  }

  need('TENANT_DATABASE_URL', 'the PostgreSQL connection string')
  if (has('TENANT_DATABASE_URL') && !isUrl(env.TENANT_DATABASE_URL!, ['postgresql:', 'postgres:'])) {
    errors.push('TENANT_DATABASE_URL must be a postgresql:// URL.')
  }

  // The tenant plane still reads Super Admin data until the decoupling work lands; this requirement is removed with it.
  need('SUPER_ADMIN_DATABASE_URL', 'still required until the Super Admin decoupling is complete')
  if (has('SUPER_ADMIN_DATABASE_URL') && !isUrl(env.SUPER_ADMIN_DATABASE_URL!, ['postgresql:', 'postgres:'])) {
    errors.push('SUPER_ADMIN_DATABASE_URL must be a postgresql:// URL.')
  }

  if (has('REDIS_URL') && !isUrl(env.REDIS_URL!, ['redis:', 'rediss:'])) {
    errors.push('REDIS_URL must be a redis:// or rediss:// (TLS) URL.')
  } else if (prod && !has('REDIS_URL')) {
    errors.push('REDIS_URL is required in production (background jobs and scheduled snapshots use it).')
  }

  for (const k of ['ENTRA_ENCRYPTION_KEY', 'CLOUD_CONNECTION_ENCRYPTION_KEY']) {
    if (has(k) && !isHex64(env[k]!)) errors.push(`${k} must be 64 hexadecimal characters (32 bytes). Generate one with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
    else if (!has(k) && prod) warnings.push(`${k} is not set: the feature that stores credentials with it will be unavailable.`)
  }

  if (role === 'worker') return { errors, warnings }

  // ── API process ───────────────────────────────────────────────────────────
  intRange('PORT', 1, 65535)

  need('JWT_SECRET', 'signs every session')
  if (has('JWT_SECRET') && env.JWT_SECRET!.length < 32) {
    ;(prod ? errors : warnings).push('JWT_SECRET is shorter than 32 characters; use at least 32 random characters.')
  }
  for (const k of ['JWT_EXPIRES_IN', 'JWT_REFRESH_EXPIRES_IN']) {
    if (has(k) && !DURATION.test(env[k]!)) errors.push(`${k} must be a duration such as 15m, 12h or 7d (got "${env[k]}").`)
  }

  if (prod) need('TENANT_APP_URL', "the portal's public address, used in email links and as the allowed browser origin")
  if (has('TENANT_APP_URL')) {
    if (!isUrl(env.TENANT_APP_URL!, ['http:', 'https:'])) errors.push('TENANT_APP_URL must be an http(s) URL.')
    else if (prod && env.TENANT_APP_URL!.startsWith('http:')) warnings.push('TENANT_APP_URL is plain http in production; use https.')
  }

  if (has('CORS_ALLOWED_ORIGINS')) {
    for (const o of env.CORS_ALLOWED_ORIGINS!.split(',').map(s => s.trim()).filter(Boolean)) {
      if (!isOrigin(o)) errors.push(`CORS_ALLOWED_ORIGINS entry "${o}" must be an origin like https://portal.example.com (no path, no trailing slash).`)
    }
  }
  if (has('CSP_MODE') && !['enforce', 'report-only', 'off'].includes(env.CSP_MODE!)) {
    errors.push('CSP_MODE must be enforce, report-only or off.')
  }

  // ── Email: optional, but half-configured is a mistake ──────────────────────
  if (has('SMTP_HOST')) {
    intRange('SMTP_PORT', 1, 65535)
    need('SMTP_FROM_EMAIL', 'the sender address, because SMTP_HOST is set')
    if (has('SMTP_FROM_EMAIL') && !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(env.SMTP_FROM_EMAIL!)) errors.push('SMTP_FROM_EMAIL must be an email address.')
    if (has('SMTP_USER') !== has('SMTP_PASS')) errors.push('SMTP_USER and SMTP_PASS must be set together (or both left empty for an unauthenticated internal relay).')
    if (has('SMTP_SECURE') && !['true', 'false'].includes(env.SMTP_SECURE!)) errors.push('SMTP_SECURE must be true or false.')
  } else {
    warnings.push('SMTP_HOST is not set: invitation and password-reset emails cannot be sent.')
  }

  // ── Storage ───────────────────────────────────────────────────────────────
  const provider = env.STORAGE_PROVIDER || 'local'
  if (!['local', 'azure'].includes(provider)) {
    errors.push(`STORAGE_PROVIDER must be local or azure (got "${provider}").`)
  } else if (provider === 'azure') {
    need('AZURE_EVIDENCE_CONNECTION_STRING', 'STORAGE_PROVIDER=azure stores customer evidence there')
    if (has('AZURE_EVIDENCE_CONTAINER') && !CONTAINER_NAME.test(env.AZURE_EVIDENCE_CONTAINER!)) {
      errors.push('AZURE_EVIDENCE_CONTAINER must be 3-63 lowercase letters, digits or single hyphens.')
    }
  } else if (prod) {
    warnings.push('STORAGE_PROVIDER=local in production: files live on this machine\'s disk. Mount durable storage at UPLOAD_DIR, or use azure.')
  }
  intRange('MAX_FILE_SIZE_MB', 1, 500)
  intRange('FILE_LINK_TTL_SECONDS', 10, 3600)
  intRange('STORAGE_MIN_FREE_MB', 0, 1_000_000)

  // ── Limits and runtime ────────────────────────────────────────────────────
  for (const k of ['RATE_LIMIT_USER_PER_MINUTE', 'RATE_LIMIT_ANON_PER_MINUTE', 'RATE_LIMIT_AUTH_PER_15MIN', 'RATE_LIMIT_RESET_REQUEST_PER_15MIN']) {
    intRange(k, 1, 1_000_000)
  }
  intRange('SHUTDOWN_GRACE_SECONDS', 1, 600)

  // ── Licence ───────────────────────────────────────────────────────────────
  if (has('LICENCE_MODE') && !['enforce', 'off'].includes(env.LICENCE_MODE!)) errors.push('LICENCE_MODE must be enforce or off.')
  if (prod && env.LICENCE_MODE === 'off') errors.push('LICENCE_MODE=off is for development only and is not allowed in production.')
  if (has('LICENCE_TOKEN') && has('LICENCE_FILE')) errors.push('Set only one of LICENCE_TOKEN and LICENCE_FILE.')
  if (prod && env.ALLOW_CUSTOM_TRUST_KEYS === 'true') warnings.push('ALLOW_CUSTOM_TRUST_KEYS=true: extra licence-signing keys are trusted in production. Remove it unless you are rotating keys.')
  if (has('PLATFORM_TRUST_KEYS')) {
    try { if (!Array.isArray(JSON.parse(env.PLATFORM_TRUST_KEYS!))) throw new Error() } catch { errors.push('PLATFORM_TRUST_KEYS must be a JSON array of { "kid", "publicKey" }.') }
  }
  intRange('DATABASE_POOL_MAX', 1, 500)
  intRange('DATABASE_POOL_IDLE_MS', 1000, 3_600_000)
  intRange('DATABASE_CONNECT_TIMEOUT_MS', 500, 120_000)
  if (has('TRUST_PROXY') && !/^(true|false|\d+|[A-Za-z0-9.:,/ -]+)$/.test(env.TRUST_PROXY!)) {
    errors.push('TRUST_PROXY must be true, false, a number of proxy hops, or a list of trusted addresses.')
  }

  return { errors, warnings }
}

/**
 * Validate and, if anything is wrong, print every problem and stop. Called first thing at process start.
 * `exit` is injectable for tests.
 */
export function assertValidConfig(
  env: NodeJS.ProcessEnv = process.env,
  role: ProcessRole = 'api',
  exit: (code: number) => never = process.exit,
): void {
  const { errors, warnings } = validateConfig(env, role)
  for (const w of warnings) console.warn(`[config] warning: ${w}`)
  if (errors.length > 0) {
    console.error(`\n[config] The ${role} cannot start - ${errors.length} setting problem${errors.length > 1 ? 's' : ''}:`)
    for (const e of errors) console.error(`  - ${e}`)
    console.error('')
    exit(1)
  }
}
