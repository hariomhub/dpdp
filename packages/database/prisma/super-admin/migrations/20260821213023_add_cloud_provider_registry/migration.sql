-- CreateEnum
CREATE TYPE "ProviderCategory" AS ENUM ('CLOUD_INFRASTRUCTURE', 'IDENTITY_SAAS', 'DEVOPS_SOURCE', 'DATABASE_SERVICE', 'EDGE_PLATFORM', 'CONTAINER_ORCHESTRATION', 'EMERGING');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'CLOUD_PROVIDER_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'CLOUD_PROVIDER_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'CLOUD_PROVIDER_TOGGLED';
ALTER TYPE "AuditAction" ADD VALUE 'ASSET_TEMPLATE_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'ASSET_TEMPLATE_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'ASSET_TEMPLATE_DELETED';

-- CreateTable
CREATE TABLE "cloud_provider_types" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "category" "ProviderCategory" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "credentialSchema" JSONB NOT NULL,
    "logoUrl" TEXT,
    "docsUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cloud_provider_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generic_asset_templates" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "cloudResourceType" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "assetType" TEXT NOT NULL,
    "defaultCriticality" TEXT NOT NULL DEFAULT 'MEDIUM',
    "suggestedDataCategories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "ControlStatus" NOT NULL DEFAULT 'DRAFT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "generic_asset_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cloud_provider_types_key_key" ON "cloud_provider_types"("key");

-- CreateIndex
CREATE UNIQUE INDEX "generic_asset_templates_providerId_cloudResourceType_key" ON "generic_asset_templates"("providerId", "cloudResourceType");

-- AddForeignKey
ALTER TABLE "generic_asset_templates" ADD CONSTRAINT "generic_asset_templates_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "cloud_provider_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;
