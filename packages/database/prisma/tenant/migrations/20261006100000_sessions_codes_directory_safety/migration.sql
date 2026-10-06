-- Sign-out, atomic code counters, directory-sync safety (expand-only: new enum values, a nullable column, two new
-- tables; nothing existing is changed or dropped).

-- AlterEnum
ALTER TYPE "TenantAuditAction" ADD VALUE IF NOT EXISTS 'DISCOVERY_DRAFT_DISMISSED';
ALTER TYPE "TenantAuditAction" ADD VALUE IF NOT EXISTS 'ENTRA_SYNC_COMPLETED';
ALTER TYPE "TenantAuditAction" ADD VALUE IF NOT EXISTS 'ENTRA_SYNC_REFUSED';

-- CreateEnum
CREATE TYPE "DeactivationReason" AS ENUM ('ADMIN', 'ENTRA_SYNC');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "deactivatedReason" "DeactivationReason";

-- CreateTable
CREATE TABLE "revoked_refresh_tokens" (
    "tokenHash" TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revoked_refresh_tokens_pkey" PRIMARY KEY ("tokenHash")
);

-- CreateIndex
CREATE INDEX "revoked_refresh_tokens_expiresAt_idx" ON "revoked_refresh_tokens"("expiresAt");

-- CreateTable
CREATE TABLE "code_counters" (
    "tenantId" TEXT NOT NULL,
    "name"     TEXT NOT NULL,
    "value"    INTEGER NOT NULL,

    CONSTRAINT "code_counters_pkey" PRIMARY KEY ("tenantId", "name")
);

-- Seed the counters from the codes already handed out, so the first new code continues the sequence.
INSERT INTO "code_counters" ("tenantId", "name", "value")
SELECT "tenantId", 'ASSET', COALESCE(MAX(NULLIF(regexp_replace("assetCode", '[^0-9]', '', 'g'), '')::int), 0)
FROM "assets" GROUP BY "tenantId";

INSERT INTO "code_counters" ("tenantId", "name", "value")
SELECT "tenantId", 'TASK', COALESCE(MAX(NULLIF(regexp_replace("taskCode", '[^0-9]', '', 'g'), '')::int), 0)
FROM "compliance_tasks" GROUP BY "tenantId";
