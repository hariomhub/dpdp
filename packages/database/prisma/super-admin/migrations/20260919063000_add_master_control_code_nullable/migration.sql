-- AlterTable
ALTER TABLE "master_controls" ADD COLUMN     "code" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "master_controls_code_key" ON "master_controls"("code");
