-- CreateTable
CREATE TABLE "dashboard_metric_snapshots" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "snapshotDate" DATE NOT NULL,
    "complianceScore" INTEGER,
    "totalControls" INTEGER NOT NULL DEFAULT 0,
    "compliantControls" INTEGER NOT NULL DEFAULT 0,
    "overdueTasksTotal" INTEGER NOT NULL DEFAULT 0,
    "overdueCritical" INTEGER NOT NULL DEFAULT 0,
    "overdueHigh" INTEGER NOT NULL DEFAULT 0,
    "overdueMedium" INTEGER NOT NULL DEFAULT 0,
    "overdueLow" INTEGER NOT NULL DEFAULT 0,
    "crossBorderPiiCount" INTEGER NOT NULL DEFAULT 0,
    "suppliersWithoutDpa" INTEGER NOT NULL DEFAULT 0,
    "auditReadinessScore" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dashboard_metric_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dashboard_metric_snapshots_tenantId_snapshotDate_key" ON "dashboard_metric_snapshots"("tenantId", "snapshotDate");
