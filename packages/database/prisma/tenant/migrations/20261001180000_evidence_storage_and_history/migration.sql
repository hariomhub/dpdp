-- Evidence storage + history (expand-only: every change is additive or relaxes a constraint, so the
-- previous app version keeps working while this deploys).

-- AlterEnum
ALTER TYPE "TenantAuditAction" ADD VALUE IF NOT EXISTS 'EVIDENCE_VIEWED';
ALTER TYPE "TenantAuditAction" ADD VALUE IF NOT EXISTS 'EVIDENCE_DELETED';

-- AlterTable: evidence -> storage reference, integrity hash, soft delete
ALTER TABLE "evidence"
  ADD COLUMN "storageProvider" TEXT,
  ADD COLUMN "storageKey"      TEXT,
  ADD COLUMN "contentType"     TEXT,
  ADD COLUMN "sha256"          TEXT,
  ADD COLUMN "deletedAt"       TIMESTAMP(3),
  ADD COLUMN "deletedById"     TEXT;

-- CreateIndex
CREATE INDEX "evidence_taskId_deletedAt_idx" ON "evidence"("taskId", "deletedAt");

-- AlterTable: evidence_versions -> full snapshot of the previous state
ALTER TABLE "evidence_versions"
  ADD COLUMN "title"           TEXT,
  ADD COLUMN "description"     TEXT,
  ADD COLUMN "fileSize"        INTEGER,
  ADD COLUMN "storageProvider" TEXT,
  ADD COLUMN "storageKey"      TEXT,
  ADD COLUMN "contentType"     TEXT,
  ADD COLUMN "sha256"          TEXT,
  ADD COLUMN "supersededAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "supersededById"  TEXT;

-- CreateIndex
CREATE INDEX "evidence_versions_evidenceId_version_idx" ON "evidence_versions"("evidenceId", "version");

-- AlterTable: gap_finding_files -> storage reference (fileUrl becomes optional: new rows use storageKey)
ALTER TABLE "gap_finding_files"
  ALTER COLUMN "fileUrl" DROP NOT NULL,
  ADD COLUMN "storageProvider" TEXT,
  ADD COLUMN "storageKey"      TEXT,
  ADD COLUMN "contentType"     TEXT,
  ADD COLUMN "sha256"          TEXT;

-- Legacy rows (uploaded to local disk before the storage adapter existed): record where they live so the
-- authenticated download route can still serve them where the file exists. Rows whose file is not present
-- on the server simply report "file unavailable" - they are never served from a public URL.
UPDATE "evidence"
   SET "storageProvider" = 'local',
       "storageKey"      = regexp_replace("fileUrl", '^/uploads/', '')
 WHERE "fileUrl" LIKE '/uploads/%' AND "storageKey" IS NULL;

UPDATE "gap_finding_files"
   SET "storageProvider" = 'local',
       "storageKey"      = regexp_replace("fileUrl", '^/uploads/', '')
 WHERE "fileUrl" LIKE '/uploads/%' AND "storageKey" IS NULL;
