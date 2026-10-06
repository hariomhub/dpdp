-- Audit entries that said the wrong thing: a role change, a department change, a cancelled invitation and a course
-- enrolment were all recorded as "user activated/deactivated". Give them their own names (expand-only: enum values).
ALTER TYPE "TenantAuditAction" ADD VALUE IF NOT EXISTS 'USER_ROLE_CHANGED';
ALTER TYPE "TenantAuditAction" ADD VALUE IF NOT EXISTS 'USER_DEPARTMENTS_UPDATED';
ALTER TYPE "TenantAuditAction" ADD VALUE IF NOT EXISTS 'INVITATION_CANCELLED';
ALTER TYPE "TenantAuditAction" ADD VALUE IF NOT EXISTS 'LMS_ENROLLED';
ALTER TYPE "TenantAuditAction" ADD VALUE IF NOT EXISTS 'LMS_UNENROLLED';
