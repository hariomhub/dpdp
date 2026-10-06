import dotenv from 'dotenv'
dotenv.config()

export const config = {
  env:  process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000'),

  db: {
    tenantUrl:     process.env.TENANT_DATABASE_URL!,
    superAdminUrl: process.env.SUPER_ADMIN_DATABASE_URL!,
  },

  jwt: {
    secret:            process.env.JWT_SECRET!,
    expiresIn:         process.env.JWT_EXPIRES_IN         || '15m',
    refreshExpiresIn:  process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  email: {
    /** Empty = email is not configured (sending is refused with a clear message). */
    host:       process.env.SMTP_HOST || undefined,
    port:       parseInt(process.env.SMTP_PORT || '587'),
    /** Leave user and password empty for an internal relay that needs no login. */
    user:       process.env.SMTP_USER || undefined,
    pass:       process.env.SMTP_PASS || undefined,
    /** true = TLS from the first byte (port 465 style). Unset: on for port 465, otherwise STARTTLS when offered. */
    secure:     process.env.SMTP_SECURE === undefined || process.env.SMTP_SECURE === '' ? undefined : process.env.SMTP_SECURE === 'true',
    fromName:   process.env.SMTP_FROM_NAME  || 'DPDP CMS',
    fromEmail:  process.env.SMTP_FROM_EMAIL || '',
  },

  platform: {
    /** Public address of this portal (https://compliance.example.com). Used in email links and as the default allowed origin. */
    tenantAppUrl:    process.env.TENANT_APP_URL!,
    /** Reported by /version; set by the build (git tag / commit). */
    version:         process.env.APP_VERSION || 'dev',
    commit:          process.env.APP_COMMIT  || 'unknown',
  },

  storage: {
    /** Where NEW evidence / gap-finding files are written. Existing rows remember their own provider. */
    provider: (process.env.STORAGE_PROVIDER || 'local') as 'local' | 'azure',
    /** Root directory for the 'local' provider (dev, single-node on-prem, NAS mount). */
    uploadDir: process.env.UPLOAD_DIR || 'uploads',
    maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB || '25'),
    /** Comma-separated override of the allowed upload extensions; empty = the built-in allow-list. */
    allowedExtensions: (process.env.ALLOWED_UPLOAD_EXTENSIONS || '')
      .split(',').map(s => s.trim().toLowerCase()).filter(Boolean),
    /**
     * Customer evidence lives in its own storage account, apart from the vendor's LMS / sample content
     * (`azure` below). There is deliberately no fallback to AZURE_STORAGE_CONNECTION_STRING: that account belongs to the
     * vendor content, and customer files must never land in it by accident.
     */
    evidence: {
      connectionString: process.env.AZURE_EVIDENCE_CONNECTION_STRING || '',
      container:        process.env.AZURE_EVIDENCE_CONTAINER || 'evidence',
    },
    /** Vendor-supplied sample evidence, read from the vendor content account (`azure.connectionString`). */
    masterEvidenceContainer: process.env.AZURE_STORAGE_MASTER_EVIDENCE_CONTAINER || 'master-evidence',
    /** Lifetime of the short-lived link handed out for viewing/downloading one file. */
    fileLinkTtlSeconds: parseInt(process.env.FILE_LINK_TTL_SECONDS || '60'),
    azure: {
      connectionString:        process.env.AZURE_STORAGE_CONNECTION_STRING || '',
      container:                process.env.AZURE_STORAGE_CONTAINER              || 'evidence',
      lmsContentContainer:      process.env.AZURE_STORAGE_LMS_CONTENT_CONTAINER     || 'lms-content',
      lmsSubmissionsContainer:  process.env.AZURE_STORAGE_LMS_SUBMISSIONS_CONTAINER || 'lms-submissions',
      sasExpiryMinutes:         parseInt(process.env.AZURE_STORAGE_SAS_EXPIRY_MINUTES || '120'),
    },
  },

  entra: {
    /**
     * 32-byte key as a 64-character hex string.
     * Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
     * Required in production; falls back to a dev-only placeholder.
     */
    encryptionKey: process.env.ENTRA_ENCRYPTION_KEY || '',
    redirectUri:   process.env.ENTRA_REDIRECT_URI   || (process.env.TENANT_APP_URL ? process.env.TENANT_APP_URL.replace(/\/+$/, '') + '/auth/callback' : 'http://localhost:5173/auth/callback'),
  },

  cloudScanner: {
    /**
     * Same encryption key/utility as Entra (utils/crypto.ts) — reused for
     * TenantCloudConnection credentials, a separate concern from Entra login,
     * but the same AES-256-GCM mechanism.
     */
    encryptionKey: process.env.CLOUD_CONNECTION_ENCRYPTION_KEY || '',
    scannerServiceUrl: process.env.CLOUD_SCANNER_URL || 'http://localhost:8090',
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  licence: {
    /**
     * enforce = the signed licence decides what the portal permits. off = licences are not checked (development only;
     * refused in production by config validation). Unset: off outside production, enforce in production.
     */
    mode: (process.env.LICENCE_MODE || (process.env.NODE_ENV === 'production' ? 'enforce' : 'off')) as 'enforce' | 'off',
    /** The licence itself (or a file holding it): installed automatically at start-up when it is newer than the one in use. */
    token: process.env.LICENCE_TOKEN || '',
    tokenFile: process.env.LICENCE_FILE || '',
  },

  runtime: {
    /** How long a stopping instance waits for requests in flight before it exits. Keep below the platform's kill timeout. */
    shutdownGraceSeconds: parseInt(process.env.SHUTDOWN_GRACE_SECONDS || '25'),
    /** /ready reports not-ready when the local upload folder has less free space than this. */
    storageMinFreeMb: parseInt(process.env.STORAGE_MIN_FREE_MB || '256'),
  },

  security: {
    /** Extra browser origins allowed to call the API (comma separated). The portal's own address is always allowed. */
    corsAllowedOrigins: (process.env.CORS_ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean),
    /** enforce | report-only | off - the Content-Security-Policy for the portal. */
    cspMode: (process.env.CSP_MODE || 'enforce') as 'enforce' | 'report-only' | 'off',
    /**
     * Number of reverse-proxy hops in front of the app (Azure App Service, nginx, ingress...), so the
     * rate limiter and audit log see the real client address instead of the proxy's. 'false' = none.
     */
    trustProxy: process.env.TRUST_PROXY ?? (process.env.NODE_ENV === 'production' ? '1' : 'false'),
    rateLimit: {
      /** requests per minute per signed-in user */
      userPerMinute: parseInt(process.env.RATE_LIMIT_USER_PER_MINUTE || '600'),
      /** requests per minute per IP for callers with no valid token */
      anonPerMinute: parseInt(process.env.RATE_LIMIT_ANON_PER_MINUTE || '120'),
      /** sign-in / password attempts per 15 minutes per IP + email */
      authPer15Min: parseInt(process.env.RATE_LIMIT_AUTH_PER_15MIN || '10'),
      /** "forgot password" requests per 15 minutes per IP + email */
      resetRequestPer15Min: parseInt(process.env.RATE_LIMIT_RESET_REQUEST_PER_15MIN || '5'),
    },
  },
}