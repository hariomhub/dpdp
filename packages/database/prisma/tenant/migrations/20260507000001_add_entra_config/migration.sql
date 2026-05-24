-- CreateTable
CREATE TABLE "entra_configs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tenantDomain" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientSecretEncrypted" TEXT NOT NULL,
    "azureTenantId" TEXT NOT NULL,
    "isConnected" BOOLEAN NOT NULL DEFAULT true,
    "connectedById" TEXT,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entra_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "entra_configs_tenantId_key" ON "entra_configs"("tenantId");