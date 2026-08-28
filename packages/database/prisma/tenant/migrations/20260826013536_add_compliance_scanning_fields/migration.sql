-- CreateEnum
CREATE TYPE "EvidenceSource" AS ENUM ('MANUAL', 'AUTOMATED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TenantAuditAction" ADD VALUE 'AUTOMATED_EVIDENCE_CREATED';
ALTER TYPE "TenantAuditAction" ADD VALUE 'AUTOMATED_GAP_FINDING_CREATED';

-- AlterTable
ALTER TABLE "assets" ADD COLUMN     "cloudConnectionId" TEXT,
ADD COLUMN     "cloudResourceUid" TEXT;

-- AlterTable
ALTER TABLE "evidence" ADD COLUMN     "source" "EvidenceSource" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "sourceCheckId" TEXT;

-- AlterTable
ALTER TABLE "gap_findings" ADD COLUMN     "source" "EvidenceSource" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "sourceCheckId" TEXT,
ALTER COLUMN "role" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "assets_cloudConnectionId_cloudResourceUid_idx" ON "assets"("cloudConnectionId", "cloudResourceUid");
