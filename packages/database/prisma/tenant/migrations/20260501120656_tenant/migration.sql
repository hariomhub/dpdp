-- CreateEnum
CREATE TYPE "TenantRole" AS ENUM ('CEO', 'CO', 'IT_ADMIN', 'INTERNAL_AUDITOR', 'EXTERNAL_AUDITOR');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'PENDING_INVITE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "InviteSource" AS ENUM ('MANUAL', 'ENTRA_ID');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'UNDER_REVIEW');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "EvidenceType" AS ENUM ('FILE', 'SCREENSHOT', 'CONFIG', 'DOCUMENT', 'LINK', 'TEXT_NOTE', 'LOG');

-- CreateEnum
CREATE TYPE "AssetCompliance" AS ENUM ('FULLY_COMPLIANT', 'PARTIALLY_COMPLIANT', 'NON_COMPLIANT', 'NOT_STARTED');

-- CreateEnum
CREATE TYPE "Criticality" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('DATABASE_DATA_STORE', 'SYSTEM_APPLICATION', 'DATA_FLOW', 'THIRD_PARTY_VENDOR', 'CONSENT_MECHANISM', 'PHYSICAL_HARDWARE', 'API_INTEGRATION', 'MOBILE_APPLICATION', 'LEGACY_SYSTEM', 'SAAS_THIRD_PARTY', 'OUTSOURCED_MANAGED', 'IN_HOUSE_CLOUD', 'IN_HOUSE_ON_PREMISE', 'THIRD_PARTY_CLOUD');

-- CreateEnum
CREATE TYPE "Sensitivity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "LegalBasis" AS ENUM ('CONSENT', 'CONTRACT', 'LEGAL_OBLIGATION', 'LEGITIMATE_INTEREST', 'VITAL_INTEREST');

-- CreateEnum
CREATE TYPE "PrincipalType" AS ENUM ('CUSTOMER', 'EMPLOYEE', 'VENDOR', 'MINOR', 'OTHER');

-- CreateEnum
CREATE TYPE "AssessmentStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'EVIDENCE_SUBMITTED', 'UNDER_REVIEW', 'APPROVED_INTERNAL', 'FINAL_REVIEW', 'COMPLIANT', 'REJECTED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "ControlComplianceStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLIANT', 'NON_COMPLIANT');

-- CreateEnum
CREATE TYPE "NotificationPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('EVIDENCE_REJECTED', 'EVIDENCE_APPROVED', 'TASK_OVERDUE', 'TASK_ASSIGNED', 'EVIDENCE_SUBMITTED', 'FINAL_SIGNOFF', 'ASSET_STATUS_CHANGED', 'ASSESSMENT_DUE', 'USER_INVITED', 'ASSET_NON_COMPLIANT');

-- CreateEnum
CREATE TYPE "TenantAuditAction" AS ENUM ('USER_LOGIN', 'USER_LOGOUT', 'USER_INVITED', 'USER_ACTIVATED', 'USER_DEACTIVATED', 'ONBOARDING_COMPLETED', 'DEPARTMENT_CREATED', 'DEPARTMENT_UPDATED', 'DEPARTMENT_DELETED', 'ASSET_CREATED', 'ASSET_UPDATED', 'ASSET_DEACTIVATED', 'PII_RECORD_CREATED', 'PII_RECORD_UPDATED', 'PII_RECORD_DELETED', 'SUPPLIER_CREATED', 'SUPPLIER_UPDATED', 'SUPPLIER_DELETED', 'ASSESSMENT_CREATED', 'ASSESSMENT_UPDATED', 'ASSESSMENT_CLOSED', 'TASK_CREATED', 'TASK_ASSIGNED', 'TASK_STARTED', 'TASK_SUBMITTED', 'TASK_APPROVED', 'TASK_REJECTED', 'TASK_ESCALATED', 'TASK_REDELEGATED', 'EVIDENCE_UPLOADED', 'EVIDENCE_UPDATED', 'EVIDENCE_APPROVED', 'EVIDENCE_REJECTED', 'SETTINGS_UPDATED', 'CLASSIFICATION_CHANGED', 'ENTRA_CONNECTED', 'ENTRA_DISCONNECTED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" "TenantRole" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING_INVITE',
    "source" "InviteSource" NOT NULL DEFAULT 'MANUAL',
    "entraObjectId" TEXT,
    "invitedById" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "joinedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_invitations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "TenantRole" NOT NULL,
    "token" TEXT NOT NULL,
    "note" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "invitedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ownerId" TEXT,
    "assignedItAdminId" TEXT,
    "assignedAuditorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "department_users" (
    "userId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "department_users_pkey" PRIMARY KEY ("userId","departmentId")
);

-- CreateTable
CREATE TABLE "entra_group_mappings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "entraGroupId" TEXT NOT NULL,
    "entraGroupName" TEXT NOT NULL,
    "role" "TenantRole" NOT NULL,
    "departmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entra_group_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "assetCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "assetType" "AssetType" NOT NULL,
    "description" TEXT,
    "departmentId" TEXT NOT NULL,
    "ownerId" TEXT,
    "status" "AssetStatus" NOT NULL DEFAULT 'ACTIVE',
    "compliance" "AssetCompliance" NOT NULL DEFAULT 'NOT_STARTED',
    "criticality" "Criticality" NOT NULL DEFAULT 'MEDIUM',
    "hostingLocation" TEXT NOT NULL,
    "internetFacing" BOOLEAN NOT NULL DEFAULT false,
    "vendorName" TEXT,
    "dataCategories" TEXT[],
    "compliantControls" INTEGER NOT NULL DEFAULT 0,
    "totalControls" INTEGER NOT NULL DEFAULT 0,
    "openTasks" INTEGER NOT NULL DEFAULT 0,
    "riskScore" DOUBLE PRECISION,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pii_records" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "categories" TEXT[],
    "sensitivity" "Sensitivity" NOT NULL,
    "purpose" TEXT NOT NULL,
    "legalBasis" "LegalBasis" NOT NULL,
    "retention" TEXT NOT NULL,
    "deletionMechanism" TEXT,
    "volume" INTEGER NOT NULL,
    "crossBorderTransfer" BOOLEAN NOT NULL DEFAULT false,
    "crossBorderDest" TEXT,
    "principalType" "PrincipalType" NOT NULL,
    "sharedWithThirdParties" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pii_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "supplierType" TEXT NOT NULL,
    "contactName" TEXT,
    "contactEmail" TEXT NOT NULL,
    "countryOfOperation" TEXT NOT NULL DEFAULT 'India',
    "dpaSigned" BOOLEAN NOT NULL DEFAULT false,
    "dpaReference" TEXT,
    "criticality" "Criticality" NOT NULL DEFAULT 'MEDIUM',
    "status" "AssetStatus" NOT NULL DEFAULT 'ACTIVE',
    "departmentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_assets" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "assetType" "AssetType" NOT NULL,
    "description" TEXT,
    "criticality" "Criticality" NOT NULL DEFAULT 'MEDIUM',
    "hostingLocation" TEXT,
    "internetFacing" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_pii_records" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "supplierAssetId" TEXT NOT NULL,
    "categories" TEXT[],
    "sensitivity" "Sensitivity" NOT NULL,
    "purpose" TEXT NOT NULL,
    "legalBasis" "LegalBasis" NOT NULL,
    "retention" TEXT NOT NULL,
    "deletionMechanism" TEXT,
    "volume" INTEGER NOT NULL,
    "crossBorderTransfer" BOOLEAN NOT NULL DEFAULT false,
    "crossBorderDest" TEXT,
    "principalType" "PrincipalType" NOT NULL,
    "sharedWithThirdParties" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_pii_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "AssessmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "departmentId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "totalControls" INTEGER NOT NULL DEFAULT 0,
    "compliantControls" INTEGER NOT NULL DEFAULT 0,
    "openTasks" INTEGER NOT NULL DEFAULT 0,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_assets" (
    "assessmentId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessment_assets_pkey" PRIMARY KEY ("assessmentId","assetId")
);

-- CreateTable
CREATE TABLE "assessment_regulations" (
    "assessmentId" TEXT NOT NULL,
    "regulationId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessment_regulations_pkey" PRIMARY KEY ("assessmentId","regulationId")
);

-- CreateTable
CREATE TABLE "assessment_controls" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "controlId" TEXT NOT NULL,
    "isExcluded" BOOLEAN NOT NULL DEFAULT false,
    "exclusionReason" TEXT,
    "complianceStatus" "ControlComplianceStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessment_controls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_tasks" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "taskCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "instructions" TEXT,
    "evidenceRequired" TEXT,
    "assessmentId" TEXT NOT NULL,
    "controlId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "assignedToId" TEXT,
    "createdById" TEXT,
    "reviewedById" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "priority" "Priority" NOT NULL DEFAULT 'HIGH',
    "dueDate" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "signedOffAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "autoAssigned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compliance_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_status_history" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "fromStatus" "TaskStatus",
    "toStatus" "TaskStatus" NOT NULL,
    "changedById" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_review_notes" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "authorId" TEXT,
    "role" "TenantRole" NOT NULL,
    "note" TEXT NOT NULL,
    "decisionType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_review_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "EvidenceType" NOT NULL,
    "description" TEXT,
    "fileUrl" TEXT,
    "fileName" TEXT,
    "fileSize" INTEGER,
    "linkUrl" TEXT,
    "textContent" TEXT,
    "submittedById" TEXT,
    "reviewStatus" "TaskStatus",
    "version" INTEGER NOT NULL DEFAULT 1,
    "parentId" TEXT,
    "isLatest" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_versions" (
    "id" TEXT NOT NULL,
    "evidenceId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "fileUrl" TEXT,
    "fileName" TEXT,
    "linkUrl" TEXT,
    "textContent" TEXT,
    "uploadedById" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_snapshots" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "snapshotDate" DATE NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityName" TEXT NOT NULL,
    "riskScore" DOUBLE PRECISION NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "factors" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "risk_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_risk_snapshots" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "snapshotDate" DATE NOT NULL,
    "riskScore" DOUBLE PRECISION NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "factors" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_risk_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "priority" "NotificationPriority" NOT NULL DEFAULT 'MEDIUM',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "linkType" TEXT,
    "linkId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_audit_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "role" "TenantRole",
    "action" "TenantAuditAction" NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "targetName" TEXT,
    "details" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms_enrollments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "lms_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms_lesson_progress" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "watchedSeconds" INTEGER,

    CONSTRAINT "lms_lesson_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_attempts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "totalMarks" INTEGER NOT NULL,
    "earnedMarks" INTEGER NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "timeTakenS" INTEGER,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "quiz_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_attempt_answers" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "selectedOptionId" TEXT,
    "tfAnswer" BOOLEAN,
    "textAnswer" TEXT,
    "isCorrect" BOOLEAN,
    "marksAwarded" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quiz_attempt_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "issued_certificates" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "certificateTemplateId" TEXT,
    "certificateCode" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "revokedAt" TIMESTAMP(3),
    "revocationReason" TEXT,
    "pdfUrl" TEXT,

    CONSTRAINT "issued_certificates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_tenantId_email_key" ON "users"("tenantId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "user_invitations_token_key" ON "user_invitations"("token");

-- CreateIndex
CREATE UNIQUE INDEX "departments_tenantId_name_key" ON "departments"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "entra_group_mappings_tenantId_entraGroupId_key" ON "entra_group_mappings"("tenantId", "entraGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "assets_tenantId_assetCode_key" ON "assets"("tenantId", "assetCode");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_controls_assessmentId_controlId_key" ON "assessment_controls"("assessmentId", "controlId");

-- CreateIndex
CREATE UNIQUE INDEX "compliance_tasks_tenantId_taskCode_key" ON "compliance_tasks"("tenantId", "taskCode");

-- CreateIndex
CREATE UNIQUE INDEX "risk_snapshots_tenantId_entityType_entityId_snapshotDate_key" ON "risk_snapshots"("tenantId", "entityType", "entityId", "snapshotDate");

-- CreateIndex
CREATE UNIQUE INDEX "asset_risk_snapshots_tenantId_assetId_snapshotDate_key" ON "asset_risk_snapshots"("tenantId", "assetId", "snapshotDate");

-- CreateIndex
CREATE UNIQUE INDEX "lms_enrollments_tenantId_userId_courseId_key" ON "lms_enrollments"("tenantId", "userId", "courseId");

-- CreateIndex
CREATE UNIQUE INDEX "lms_lesson_progress_enrollmentId_lessonId_key" ON "lms_lesson_progress"("enrollmentId", "lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "issued_certificates_certificateCode_key" ON "issued_certificates"("certificateCode");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_invitations" ADD CONSTRAINT "user_invitations_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "department_users" ADD CONSTRAINT "department_users_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "department_users" ADD CONSTRAINT "department_users_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entra_group_mappings" ADD CONSTRAINT "entra_group_mappings_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pii_records" ADD CONSTRAINT "pii_records_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_assets" ADD CONSTRAINT "supplier_assets_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_pii_records" ADD CONSTRAINT "supplier_pii_records_supplierAssetId_fkey" FOREIGN KEY ("supplierAssetId") REFERENCES "supplier_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_assets" ADD CONSTRAINT "assessment_assets_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_assets" ADD CONSTRAINT "assessment_assets_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_regulations" ADD CONSTRAINT "assessment_regulations_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_controls" ADD CONSTRAINT "assessment_controls_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_tasks" ADD CONSTRAINT "compliance_tasks_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_tasks" ADD CONSTRAINT "compliance_tasks_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_tasks" ADD CONSTRAINT "compliance_tasks_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_tasks" ADD CONSTRAINT "compliance_tasks_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_tasks" ADD CONSTRAINT "compliance_tasks_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_status_history" ADD CONSTRAINT "task_status_history_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "compliance_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_review_notes" ADD CONSTRAINT "task_review_notes_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "compliance_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "compliance_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_versions" ADD CONSTRAINT "evidence_versions_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "evidence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_risk_snapshots" ADD CONSTRAINT "asset_risk_snapshots_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_audit_logs" ADD CONSTRAINT "tenant_audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms_lesson_progress" ADD CONSTRAINT "lms_lesson_progress_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "lms_enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms_lesson_progress" ADD CONSTRAINT "lms_lesson_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "lms_enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_attempt_answers" ADD CONSTRAINT "quiz_attempt_answers_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "quiz_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issued_certificates" ADD CONSTRAINT "issued_certificates_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
