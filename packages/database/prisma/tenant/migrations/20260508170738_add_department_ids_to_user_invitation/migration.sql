-- packages/database/prisma/tenant/migrations/20260508170738_add_department_ids_to_user_invitation/migration.sql

ALTER TABLE "user_invitations" ADD COLUMN "departmentIds" TEXT[] NOT NULL DEFAULT '{}';