-- CreateEnum
CREATE TYPE "DraftStatus" AS ENUM ('PENDING', 'CONFIRMED', 'DISMISSED');

-- CreateTable
CREATE TABLE "discovered_asset_drafts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "cloudResourceUid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "cloudResourceType" TEXT NOT NULL,
    "suggestedAssetType" TEXT,
    "suggestedCriticality" TEXT,
    "internetFacing" BOOLEAN NOT NULL DEFAULT false,
    "tags" JSONB,
    "metadata" JSONB,
    "status" "DraftStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedAssetId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discovered_asset_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "discovered_asset_drafts_connectionId_cloudResourceUid_key" ON "discovered_asset_drafts"("connectionId", "cloudResourceUid");

-- AddForeignKey
ALTER TABLE "discovered_asset_drafts" ADD CONSTRAINT "discovered_asset_drafts_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "tenant_cloud_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
