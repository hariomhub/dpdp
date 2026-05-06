/*
  Warnings:

  - A unique constraint covering the columns `[inviteToken]` on the table `tenants` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "currentVersion" TEXT,
ADD COLUMN     "deployedAt" TIMESTAMP(3),
ADD COLUMN     "deploymentNotes" TEXT,
ADD COLUMN     "inviteAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "inviteExpiresAt" TIMESTAMP(3),
ADD COLUMN     "inviteToken" TEXT,
ADD COLUMN     "tenantPortalUrl" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "tenants_inviteToken_key" ON "tenants"("inviteToken");
