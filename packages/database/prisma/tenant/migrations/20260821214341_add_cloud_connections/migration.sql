-- CreateEnum
CREATE TYPE "CloudConnectionStatus" AS ENUM ('PENDING', 'CONNECTED', 'FAILED', 'DISCONNECTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TenantAuditAction" ADD VALUE 'CLOUD_CONNECTION_CREATED';
ALTER TYPE "TenantAuditAction" ADD VALUE 'CLOUD_CONNECTION_TESTED';
ALTER TYPE "TenantAuditAction" ADD VALUE 'CLOUD_CONNECTION_FAILED';
ALTER TYPE "TenantAuditAction" ADD VALUE 'CLOUD_CONNECTION_DISCONNECTED';
ALTER TYPE "TenantAuditAction" ADD VALUE 'ASSETS_DISCOVERED';

-- CreateTable
CREATE TABLE "tenant_cloud_connections" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "providerKey" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "credentialEncrypted" TEXT NOT NULL,
    "status" "CloudConnectionStatus" NOT NULL DEFAULT 'PENDING',
    "lastCheckedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "connectedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_cloud_connections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenant_cloud_connections_tenantId_providerKey_alias_key" ON "tenant_cloud_connections"("tenantId", "providerKey", "alias");
