-- DropForeignKey
ALTER TABLE "master_evidences" DROP CONSTRAINT "master_evidences_predefinedActionId_fkey";

-- DropForeignKey
ALTER TABLE "master_evidences" DROP CONSTRAINT "master_evidences_productId_fkey";

-- AddForeignKey
ALTER TABLE "master_evidences" ADD CONSTRAINT "master_evidences_predefinedActionId_productId_fkey" FOREIGN KEY ("predefinedActionId", "productId") REFERENCES "action_products"("predefinedActionId", "productId") ON DELETE CASCADE ON UPDATE CASCADE;
