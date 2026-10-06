-- CreateEnum
CREATE TYPE "NodeApplicabilityStatus" AS ENUM ('MANDATORY', 'APPLICABLE', 'EXEMPT');

-- CreateEnum
CREATE TYPE "CustomFieldScope" AS ENUM ('CONTROL', 'ACTION');

-- CreateEnum
CREATE TYPE "CustomFieldDataType" AS ENUM ('TEXT', 'NUMBER', 'BOOLEAN', 'DATE', 'SINGLE_SELECT', 'MULTI_SELECT');

-- AlterTable
ALTER TABLE "control_predefined_actions" ADD COLUMN     "customFields" JSONB,
ADD COLUMN     "regulationId" TEXT;

-- AlterTable
ALTER TABLE "controls" ADD COLUMN     "citedRegulationIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "customFields" JSONB,
ADD COLUMN     "regulationId" TEXT;

-- AlterTable
ALTER TABLE "regulations" ADD COLUMN     "documentType" TEXT,
ADD COLUMN     "version" TEXT;

-- CreateTable
CREATE TABLE "regulation_nodes" (
    "id" TEXT NOT NULL,
    "regulationId" TEXT NOT NULL,
    "parentId" TEXT,
    "nodeType" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "depth" INTEGER NOT NULL DEFAULT 0,
    "path" TEXT NOT NULL DEFAULT '',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "regulation_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regulation_applicability_categories" (
    "id" TEXT NOT NULL,
    "regulationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "criteriaSummary" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "regulation_applicability_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "node_applicabilities" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "applicabilityCategoryId" TEXT NOT NULL,
    "status" "NodeApplicabilityStatus" NOT NULL DEFAULT 'APPLICABLE',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "node_applicabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_field_definitions" (
    "id" TEXT NOT NULL,
    "regulationId" TEXT NOT NULL,
    "scope" "CustomFieldScope" NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "dataType" "CustomFieldDataType" NOT NULL,
    "options" JSONB,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "helpText" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_field_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_regulation_classifications" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "regulationId" TEXT NOT NULL,
    "applicabilityCategoryId" TEXT NOT NULL,
    "isUncertain" BOOLEAN NOT NULL DEFAULT false,
    "classifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_regulation_classifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "control_nodes" (
    "id" TEXT NOT NULL,
    "controlId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "control_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "control_applicabilities" (
    "controlId" TEXT NOT NULL,
    "applicabilityCategoryId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "control_applicabilities_pkey" PRIMARY KEY ("controlId","applicabilityCategoryId")
);

-- CreateIndex
CREATE INDEX "regulation_nodes_regulationId_parentId_idx" ON "regulation_nodes"("regulationId", "parentId");

-- CreateIndex
CREATE UNIQUE INDEX "regulation_applicability_categories_regulationId_code_key" ON "regulation_applicability_categories"("regulationId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "node_applicabilities_nodeId_applicabilityCategoryId_key" ON "node_applicabilities"("nodeId", "applicabilityCategoryId");

-- CreateIndex
CREATE UNIQUE INDEX "custom_field_definitions_regulationId_scope_key_key" ON "custom_field_definitions"("regulationId", "scope", "key");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_regulation_classifications_tenantId_regulationId_key" ON "tenant_regulation_classifications"("tenantId", "regulationId");

-- CreateIndex
CREATE UNIQUE INDEX "control_nodes_controlId_nodeId_key" ON "control_nodes"("controlId", "nodeId");

-- AddForeignKey
ALTER TABLE "regulation_nodes" ADD CONSTRAINT "regulation_nodes_regulationId_fkey" FOREIGN KEY ("regulationId") REFERENCES "regulations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regulation_nodes" ADD CONSTRAINT "regulation_nodes_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "regulation_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regulation_applicability_categories" ADD CONSTRAINT "regulation_applicability_categories_regulationId_fkey" FOREIGN KEY ("regulationId") REFERENCES "regulations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "node_applicabilities" ADD CONSTRAINT "node_applicabilities_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "regulation_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "node_applicabilities" ADD CONSTRAINT "node_applicabilities_applicabilityCategoryId_fkey" FOREIGN KEY ("applicabilityCategoryId") REFERENCES "regulation_applicability_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_field_definitions" ADD CONSTRAINT "custom_field_definitions_regulationId_fkey" FOREIGN KEY ("regulationId") REFERENCES "regulations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_regulation_classifications" ADD CONSTRAINT "tenant_regulation_classifications_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_regulation_classifications" ADD CONSTRAINT "tenant_regulation_classifications_regulationId_fkey" FOREIGN KEY ("regulationId") REFERENCES "regulations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_regulation_classifications" ADD CONSTRAINT "tenant_regulation_classifications_applicabilityCategoryId_fkey" FOREIGN KEY ("applicabilityCategoryId") REFERENCES "regulation_applicability_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "controls" ADD CONSTRAINT "controls_regulationId_fkey" FOREIGN KEY ("regulationId") REFERENCES "regulations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_nodes" ADD CONSTRAINT "control_nodes_controlId_fkey" FOREIGN KEY ("controlId") REFERENCES "controls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_nodes" ADD CONSTRAINT "control_nodes_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "regulation_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_applicabilities" ADD CONSTRAINT "control_applicabilities_controlId_fkey" FOREIGN KEY ("controlId") REFERENCES "controls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_applicabilities" ADD CONSTRAINT "control_applicabilities_applicabilityCategoryId_fkey" FOREIGN KEY ("applicabilityCategoryId") REFERENCES "regulation_applicability_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_predefined_actions" ADD CONSTRAINT "control_predefined_actions_regulationId_fkey" FOREIGN KEY ("regulationId") REFERENCES "regulations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
