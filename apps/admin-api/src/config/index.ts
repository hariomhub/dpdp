import dotenv from 'dotenv'
dotenv.config()

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001'),
  
  db: {
    url: process.env.SUPER_ADMIN_DATABASE_URL!,
  },

  licence: {
    /** PEM private key (or a file holding it) used to sign licences. In production this is a managed key (e.g. Key Vault), never committed. */
    signingKey: process.env.LICENCE_SIGNING_KEY || '',
    signingKeyFile: process.env.LICENCE_SIGNING_KEY_FILE || '',
    /** id of that key; instances look it up in their trust list */
    keyId: process.env.LICENCE_KEY_ID || '',
    issuer: process.env.LICENCE_ISSUER || 'niyamsaathi',
  },

  jwt: {
    secret: process.env.JWT_SECRET!,
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  email: {
    host: process.env.SMTP_HOST!,
    port: parseInt(process.env.SMTP_PORT || '587'),
    user: process.env.SMTP_USER!,
    pass: process.env.SMTP_PASS!,
    fromName: process.env.SMTP_FROM_NAME || 'DPDP CMS',
    fromEmail: process.env.SMTP_FROM_EMAIL!,
  },

  storage: {
    provider: (process.env.STORAGE_PROVIDER || 'local') as 'local' | 'azure',
    uploadDir: process.env.UPLOAD_DIR || 'uploads',
    maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB || '25'),
    /** Container (in the vendor content account, `azure.connectionString`) for the sample evidence files shown to tenants. */
    masterEvidenceContainer: process.env.AZURE_STORAGE_MASTER_EVIDENCE_CONTAINER || 'master-evidence',
    azure: {
      connectionString:        process.env.AZURE_STORAGE_CONNECTION_STRING || '',
      container:                process.env.AZURE_STORAGE_CONTAINER              || 'master-evidence',
      lmsContentContainer:      process.env.AZURE_STORAGE_LMS_CONTENT_CONTAINER     || 'lms-content',
      lmsSubmissionsContainer:  process.env.AZURE_STORAGE_LMS_SUBMISSIONS_CONTAINER || 'lms-submissions',
      sasExpiryMinutes:         parseInt(process.env.AZURE_STORAGE_SAS_EXPIRY_MINUTES || '120'),
    },
  },

  platform: {
    name: process.env.PLATFORM_NAME || 'DPDP CMS',
    url: process.env.PLATFORM_URL!,
    tenantAppUrl: process.env.TENANT_APP_URL!,
    inviteTokenExpiryHours: parseInt(
      process.env.INVITE_TOKEN_EXPIRY_HOURS || '48'
    ),
  },

  cloudScanner: {
    // Read-only from here — Super Admin only ever browses Prowler's check
    // catalog (GET /checks) to build mappings, never scans a real account.
    scannerServiceUrl: process.env.CLOUD_SCANNER_URL || 'http://localhost:8090',
  },
}