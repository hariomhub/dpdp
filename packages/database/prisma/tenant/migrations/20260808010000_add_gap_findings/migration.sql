-- CreateEnum
CREATE TYPE "GapReasonCode" AS ENUM ('INSUFFICIENT_EVIDENCE', 'NON_COMPLIANT_CONFIGURATION', 'MISSING_DOCUMENTATION', 'INCORRECT_TOOL_USED', 'OUTDATED_EVIDENCE', 'OTHER');

-- AlterEnum
ALTER TYPE "TenantAuditAction" ADD VALUE 'GAP_FINDING_CREATED';

-- CreateTable
CREATE TABLE "gap_findings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "raisedById" TEXT,
    "role" "TenantRole" NOT NULL,
    "reasonCodes" "GapReasonCode"[],
    "otherReason" TEXT,
    "remediation" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gap_findings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gap_finding_actions" (
    "id" TEXT NOT NULL,
    "gapFindingId" TEXT NOT NULL,
    "taskActionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gap_finding_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gap_finding_files" (
    "id" TEXT NOT NULL,
    "gapFindingId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gap_finding_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "gap_finding_actions_gapFindingId_taskActionId_key" ON "gap_finding_actions"("gapFindingId", "taskActionId");

-- AddForeignKey
ALTER TABLE "gap_findings" ADD CONSTRAINT "gap_findings_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "compliance_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gap_findings" ADD CONSTRAINT "gap_findings_raisedById_fkey" FOREIGN KEY ("raisedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gap_finding_actions" ADD CONSTRAINT "gap_finding_actions_gapFindingId_fkey" FOREIGN KEY ("gapFindingId") REFERENCES "gap_findings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gap_finding_actions" ADD CONSTRAINT "gap_finding_actions_taskActionId_fkey" FOREIGN KEY ("taskActionId") REFERENCES "task_actions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gap_finding_files" ADD CONSTRAINT "gap_finding_files_gapFindingId_fkey" FOREIGN KEY ("gapFindingId") REFERENCES "gap_findings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
