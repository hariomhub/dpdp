/*
  Warnings:

  - You are about to drop the column `chapterReference` on the `controls` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "controls" DROP COLUMN "chapterReference",
ADD COLUMN     "chapterId" TEXT;

-- CreateTable
CREATE TABLE "regulation_chapters" (
    "id" TEXT NOT NULL,
    "regulationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "regulation_chapters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "regulation_chapters_regulationId_name_key" ON "regulation_chapters"("regulationId", "name");

-- AddForeignKey
ALTER TABLE "regulation_chapters" ADD CONSTRAINT "regulation_chapters_regulationId_fkey" FOREIGN KEY ("regulationId") REFERENCES "regulations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "controls" ADD CONSTRAINT "controls_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "regulation_chapters"("id") ON DELETE SET NULL ON UPDATE CASCADE;
