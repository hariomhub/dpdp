/*
  Warnings:

  - You are about to drop the column `chapterId` on the `controls` table. All the data in the column will be lost.
  - You are about to drop the column `sectionReference` on the `controls` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "controls" DROP CONSTRAINT "controls_chapterId_fkey";

-- AlterTable
ALTER TABLE "control_regulations" ADD COLUMN     "chapterId" TEXT,
ADD COLUMN     "sectionReference" TEXT;

-- AlterTable
ALTER TABLE "controls" DROP COLUMN "chapterId",
DROP COLUMN "sectionReference";

-- AddForeignKey
ALTER TABLE "control_regulations" ADD CONSTRAINT "control_regulations_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "regulation_chapters"("id") ON DELETE SET NULL ON UPDATE CASCADE;
