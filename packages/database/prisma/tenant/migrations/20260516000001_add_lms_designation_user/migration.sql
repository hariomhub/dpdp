-- Add lmsDesignation to users
ALTER TABLE "users" ADD COLUMN "lmsDesignation" TEXT;

-- CreateTable: RoleDesignationDefault
CREATE TABLE "role_designation_defaults" (
    "id"          TEXT NOT NULL,
    "tenantId"    TEXT NOT NULL,
    "portalRole"  TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,
    CONSTRAINT "role_designation_defaults_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "role_designation_defaults_tenantId_portalRole_key"
    ON "role_designation_defaults"("tenantId", "portalRole");