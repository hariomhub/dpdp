-- Directory sync lease (expand-only: one nullable column).
ALTER TABLE "entra_configs" ADD COLUMN "syncStartedAt" TIMESTAMP(3);
