-- Activation and licence installation are audited under their own names (expand-only: enum values).
ALTER TYPE "TenantAuditAction" ADD VALUE IF NOT EXISTS 'INSTANCE_ACTIVATED';
ALTER TYPE "TenantAuditAction" ADD VALUE IF NOT EXISTS 'LICENCE_INSTALLED';
