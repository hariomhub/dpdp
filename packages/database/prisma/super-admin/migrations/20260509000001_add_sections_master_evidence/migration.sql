-- CreateTable: RegulationSection
CREATE TABLE "regulation_sections" (
    "id"         TEXT NOT NULL,
    "chapterId"  TEXT NOT NULL,
    "name"       TEXT NOT NULL,
    "title"      TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) NOT NULL,
    CONSTRAINT "regulation_sections_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "regulation_sections_chapterId_name_key" ON "regulation_sections"("chapterId", "name");

-- CreateTable: MasterEvidence
CREATE TABLE "master_evidences" (
    "id"                TEXT NOT NULL,
    "predefinedActionId" TEXT NOT NULL,
    "productId"          TEXT NOT NULL,
    "title"             TEXT NOT NULL,
    "description"       TEXT,
    "fileName"          TEXT,
    "fileSize"          INTEGER,
    "mimeType"          TEXT,
    "fileUrl"           TEXT,
    "storageProvider"   TEXT NOT NULL DEFAULT 'local',
    "uploadedById"      TEXT,
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3) NOT NULL,
    CONSTRAINT "master_evidences_pkey" PRIMARY KEY ("id")
);

-- AlterTable: ControlRegulation — replace sectionReference with sectionId
ALTER TABLE "control_regulations" ADD COLUMN "sectionId" TEXT;
ALTER TABLE "control_regulations" DROP COLUMN IF EXISTS "sectionReference";

-- AddForeignKeys
ALTER TABLE "regulation_sections" ADD CONSTRAINT "regulation_sections_chapterId_fkey"
    FOREIGN KEY ("chapterId") REFERENCES "regulation_chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "control_regulations" ADD CONSTRAINT "control_regulations_sectionId_fkey"
    FOREIGN KEY ("sectionId") REFERENCES "regulation_sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "master_evidences" ADD CONSTRAINT "master_evidences_predefinedActionId_productId_fkey"
    FOREIGN KEY ("predefinedActionId") REFERENCES "control_predefined_actions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "master_evidences" ADD CONSTRAINT "master_evidences_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;