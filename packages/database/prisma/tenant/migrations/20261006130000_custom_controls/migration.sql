-- Customer-authored controls move out of the vendor database into the organisation's own (expand-only: three new tables).

CREATE TABLE "custom_controls" (
    "id"           TEXT NOT NULL,
    "tenantId"     TEXT NOT NULL,
    "title"        TEXT NOT NULL,
    "description"  TEXT NOT NULL,
    "applicableTo" TEXT NOT NULL DEFAULT 'BOTH',
    "createdById"  TEXT,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_controls_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "custom_control_citations" (
    "id"           TEXT NOT NULL,
    "controlId"    TEXT NOT NULL,
    "regulationId" TEXT NOT NULL,
    "nodeId"       TEXT,

    CONSTRAINT "custom_control_citations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "custom_control_actions" (
    "id"               TEXT NOT NULL,
    "controlId"        TEXT NOT NULL,
    "title"            TEXT NOT NULL,
    "description"      TEXT NOT NULL,
    "evidenceTypes"    "EvidenceType"[],
    "suggestedDueDays" INTEGER NOT NULL DEFAULT 30,
    "priority"         "Priority" NOT NULL DEFAULT 'HIGH',
    "orderIndex"       INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "custom_control_actions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "custom_controls_tenantId_idx" ON "custom_controls"("tenantId");
CREATE INDEX "custom_control_citations_controlId_idx" ON "custom_control_citations"("controlId");
CREATE INDEX "custom_control_actions_controlId_idx" ON "custom_control_actions"("controlId");

ALTER TABLE "custom_control_citations" ADD CONSTRAINT "custom_control_citations_controlId_fkey" FOREIGN KEY ("controlId") REFERENCES "custom_controls"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "custom_control_actions" ADD CONSTRAINT "custom_control_actions_controlId_fkey" FOREIGN KEY ("controlId") REFERENCES "custom_controls"("id") ON DELETE CASCADE ON UPDATE CASCADE;
