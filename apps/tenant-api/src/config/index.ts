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
    host:       process.env.SMTP_HOST!,
    port:       parseInt(process.env.SMTP_PORT || '587'),
    user:       process.env.SMTP_USER!,
    pass:       process.env.SMTP_PASS!,
    fromName:   process.env.SMTP_FROM_NAME  || 'DPDP CMS',
    fromEmail:  process.env.SMTP_FROM_EMAIL!,
  },

  platform: {
    tenantAppUrl:    process.env.TENANT_APP_URL!,
    superAdminApiUrl: process.env.SUPER_ADMIN_API_URL!,
  },

  storage: {
    provider: (process.env.STORAGE_PROVIDER || 'local') as 'local' | 'azure',
    uploadDir: process.env.UPLOAD_DIR || 'uploads',
    maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB || '25'),
    azure: {
      connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING || '',
      container:        process.env.AZURE_STORAGE_CONTAINER        || 'evidence',
    },
  },

  entra: {
    /**
     * 32-byte key as a 64-character hex string.
     * Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
     * Required in production; falls back to a dev-only placeholder.
     */
    encryptionKey: process.env.ENTRA_ENCRYPTION_KEY || '',
    redirectUri:   process.env.ENTRA_REDIRECT_URI   || 'http://localhost:5173/auth/callback',
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
}