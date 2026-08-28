-- Reconciliation migration.
-- These two changes were previously applied directly to the database
-- (outside the migration history, e.g. via `prisma db push` during local
-- iteration) and are being recorded here so migration history matches
-- actual database state. This migration is being marked as already-applied
-- (`prisma migrate resolve --applied`) rather than executed, since the
-- target database already has both changes. The SQL below is kept correct
-- and runnable so a future `prisma migrate reset` replays cleanly from empty.

-- AlterEnum
ALTER TYPE "TenantAuditAction" ADD VALUE IF NOT EXISTS 'USER_UPDATED';

-- AlterTable
ALTER TABLE "role_designation_defaults"
  ALTER COLUMN "portalRole" TYPE "TenantRole" USING "portalRole"::"TenantRole";

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "role_designation_defaults_tenantId_portalRole_key"
  ON "role_designation_defaults"("tenantId", "portalRole");
