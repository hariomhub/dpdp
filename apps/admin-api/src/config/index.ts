import dotenv from 'dotenv'
dotenv.config()

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001'),
  
  db: {
    url: process.env.SUPER_ADMIN_DATABASE_URL!,
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

  platform: {
    name: process.env.PLATFORM_NAME || 'DPDP CMS',
    url: process.env.PLATFORM_URL!,
    tenantAppUrl: process.env.TENANT_APP_URL!,
    inviteTokenExpiryHours: parseInt(
      process.env.INVITE_TOKEN_EXPIRY_HOURS || '48'
    ),
  },
}