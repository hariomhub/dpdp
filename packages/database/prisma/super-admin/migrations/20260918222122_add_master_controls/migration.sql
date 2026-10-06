-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'MASTER_CONTROL_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'MASTER_CONTROL_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'MASTER_CONTROL_DELETED';
ALTER TYPE "AuditAction" ADD VALUE 'MASTER_CONTROL_ACTION_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'MASTER_CONTROL_ACTION_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'MASTER_CONTROL_ACTION_DELETED';
ALTER TYPE "AuditAction" ADD VALUE 'CONTROL_LINKED_TO_MASTER';
ALTER TYPE "AuditAction" ADD VALUE 'CONTROL_UNLINKED_FROM_MASTER';

-- AlterTable
ALTER TABLE "control_predefined_actions" ADD COLUMN     "masterActionId" TEXT;

-- AlterTable
ALTER TABLE "controls" ADD COLUMN     "masterControlId" TEXT;

-- CreateTable
CREATE TABLE "master_controls" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "master_controls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "master_control_actions" (
    "id" TEXT NOT NULL,
    "masterControlId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "evidenceTypes" "EvidenceType"[],
    "suggestedDueDays" INTEGER NOT NULL DEFAULT 30,
    "priority" "Priority" NOT NULL DEFAULT 'HIGH',
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "master_control_actions_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "master_control_actions" ADD CONSTRAINT "master_control_actions_masterControlId_fkey" FOREIGN KEY ("masterControlId") REFERENCES "master_controls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "controls" ADD CONSTRAINT "controls_masterControlId_fkey" FOREIGN KEY ("masterControlId") REFERENCES "master_controls"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_predefined_actions" ADD CONSTRAINT "control_predefined_actions_masterActionId_fkey" FOREIGN KEY ("masterActionId") REFERENCES "master_control_actions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
