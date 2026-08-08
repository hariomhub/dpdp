-- CreateTable
CREATE TABLE "task_actions" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "predefinedActionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_actions" (
    "id" TEXT NOT NULL,
    "evidenceId" TEXT NOT NULL,
    "taskActionId" TEXT NOT NULL,
    "productId" TEXT,
    "otherLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_actions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "task_actions_taskId_predefinedActionId_key" ON "task_actions"("taskId", "predefinedActionId");

-- CreateIndex
CREATE UNIQUE INDEX "evidence_actions_evidenceId_taskActionId_key" ON "evidence_actions"("evidenceId", "taskActionId");

-- AddForeignKey
ALTER TABLE "task_actions" ADD CONSTRAINT "task_actions_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "compliance_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_actions" ADD CONSTRAINT "evidence_actions_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "evidence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_actions" ADD CONSTRAINT "evidence_actions_taskActionId_fkey" FOREIGN KEY ("taskActionId") REFERENCES "task_actions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
