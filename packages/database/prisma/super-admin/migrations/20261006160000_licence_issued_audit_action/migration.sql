-- Issuing a licence is audited (expand-only: one enum value).
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'LICENCE_ISSUED';
