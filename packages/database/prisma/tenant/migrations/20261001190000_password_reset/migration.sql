-- Password reset (expand-only: a new table, a nullable column and two enum values; nothing existing is changed).

-- AlterEnum
ALTER TYPE "TenantAuditAction" ADD VALUE IF NOT EXISTS 'PASSWORD_RESET_REQUESTED';
ALTER TYPE "TenantAuditAction" ADD VALUE IF NOT EXISTS 'PASSWORD_RESET_COMPLETED';

-- AlterTable: sessions issued before a reset are rejected
ALTER TABLE "users" ADD COLUMN "passwordChangedAt" TIMESTAMP(3);

-- CreateTable: only a hash of each token is stored
CREATE TABLE "password_reset_tokens" (
    "id"          TEXT NOT NULL,
    "userId"      TEXT NOT NULL,
    "tenantId"    TEXT NOT NULL,
    "tokenHash"   TEXT NOT NULL,
    "expiresAt"   TIMESTAMP(3) NOT NULL,
    "usedAt"      TIMESTAMP(3),
    "requestedIp" TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_tokenHash_key" ON "password_reset_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_userId_idx" ON "password_reset_tokens"("userId");

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
