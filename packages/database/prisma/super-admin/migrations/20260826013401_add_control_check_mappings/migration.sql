-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'CHECK_MAPPING_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'CHECK_MAPPING_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'CHECK_MAPPING_DELETED';

-- CreateTable
CREATE TABLE "control_check_mappings" (
    "id" TEXT NOT NULL,
    "predefinedActionId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "checkId" TEXT NOT NULL,
    "checkTitle" TEXT NOT NULL,
    "checkSeverity" TEXT,
    "status" "ControlStatus" NOT NULL DEFAULT 'DRAFT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "control_check_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "control_check_mappings_predefinedActionId_providerId_checkI_key" ON "control_check_mappings"("predefinedActionId", "providerId", "checkId");

-- AddForeignKey
ALTER TABLE "control_check_mappings" ADD CONSTRAINT "control_check_mappings_predefinedActionId_fkey" FOREIGN KEY ("predefinedActionId") REFERENCES "control_predefined_actions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_check_mappings" ADD CONSTRAINT "control_check_mappings_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "cloud_provider_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;
