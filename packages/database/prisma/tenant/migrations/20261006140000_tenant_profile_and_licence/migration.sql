-- The organisation record and its licence move into the organisation's own database (expand-only: three new tables).

CREATE TABLE "tenant_profiles" (
    "id"               TEXT NOT NULL,
    "tenantCode"       TEXT NOT NULL,
    "name"             TEXT NOT NULL,
    "industry"         TEXT NOT NULL DEFAULT '',
    "orgSize"          TEXT NOT NULL DEFAULT '',
    "address"          TEXT NOT NULL DEFAULT '',
    "country"          TEXT NOT NULL DEFAULT 'India',
    "website"          TEXT,
    "contactEmail"     TEXT NOT NULL,
    "dpoName"          TEXT NOT NULL DEFAULT '',
    "dpoEmail"         TEXT NOT NULL DEFAULT '',
    "dpoPhone"         TEXT,
    "panNumber"        TEXT,
    "gstNumber"        TEXT,
    "classification"   TEXT NOT NULL DEFAULT 'Data Fiduciary',
    "classUncertain"   BOOLEAN NOT NULL DEFAULT false,
    "ceoName"          TEXT NOT NULL,
    "ceoEmail"         TEXT NOT NULL,
    "plan"             TEXT NOT NULL DEFAULT 'STARTER',
    "status"           TEXT NOT NULL DEFAULT 'ONBOARDING',
    "inviteToken"      TEXT,
    "inviteExpiresAt"  TIMESTAMP(3),
    "inviteAcceptedAt" TIMESTAMP(3),
    "onboardedAt"      TIMESTAMP(3),
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tenant_profiles_tenantCode_key" ON "tenant_profiles"("tenantCode");
CREATE UNIQUE INDEX "tenant_profiles_inviteToken_key" ON "tenant_profiles"("inviteToken");

CREATE TABLE "tenant_regulation_classifications" (
    "id"                      TEXT NOT NULL,
    "tenantId"                TEXT NOT NULL,
    "regulationId"            TEXT NOT NULL,
    "applicabilityCategoryId" TEXT NOT NULL,
    "isUncertain"             BOOLEAN NOT NULL DEFAULT false,
    "classifiedAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"               TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_regulation_classifications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tenant_regulation_classifications_tenantId_regulationId_key" ON "tenant_regulation_classifications"("tenantId", "regulationId");

CREATE TABLE "platform_licences" (
    "tenantId"     TEXT NOT NULL,
    "licenceId"    TEXT NOT NULL,
    "token"        TEXT NOT NULL,
    "keyId"        TEXT NOT NULL,
    "plan"         TEXT NOT NULL,
    "issuedAt"     TIMESTAMP(3) NOT NULL,
    "validFrom"    TIMESTAMP(3) NOT NULL,
    "validUntil"   TIMESTAMP(3) NOT NULL,
    "updatesUntil" TIMESTAMP(3) NOT NULL,
    "graceDays"    INTEGER NOT NULL,
    "airGapped"    BOOLEAN NOT NULL DEFAULT false,
    "limits"       JSONB NOT NULL,
    "entitlements" JSONB NOT NULL,
    "activatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt"    TIMESTAMP(3),
    "updatedAt"    TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_licences_pkey" PRIMARY KEY ("tenantId")
);
