-- CreateEnum
CREATE TYPE "OrgStatus" AS ENUM ('ONBOARDING', 'ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('STARTER', 'PROFESSIONAL', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "ControlStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "ApplicableTo" AS ENUM ('DATA_FIDUCIARY', 'SIGNIFICANT_DF', 'BOTH');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "EvidenceType" AS ENUM ('FILE', 'SCREENSHOT', 'CONFIG', 'DOCUMENT', 'LINK', 'TEXT_NOTE', 'LOG');

-- CreateEnum
CREATE TYPE "LessonType" AS ENUM ('VIDEO', 'READING', 'ASSIGNMENT');

-- CreateEnum
CREATE TYPE "VideoSource" AS ENUM ('UPLOAD', 'EMBED');

-- CreateEnum
CREATE TYPE "ReadingContentType" AS ENUM ('RICH_TEXT', 'FILE');

-- CreateEnum
CREATE TYPE "AssignmentSubmissionType" AS ENUM ('TEXT_RESPONSE', 'FILE_UPLOAD', 'BOTH');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('MCQ', 'TRUE_FALSE', 'DESCRIPTIVE');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "CourseStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CourseDifficulty" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "CourseCategory" AS ENUM ('DPDP_COMPLIANCE', 'PORTAL_USAGE', 'ROLE_SPECIFIC', 'GENERAL');

-- CreateEnum
CREATE TYPE "CertLayout" AS ENUM ('CLASSIC', 'MODERN', 'MINIMAL');

-- CreateEnum
CREATE TYPE "LicenseStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "RegulationStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('ORG_CREATED', 'ORG_UPDATED', 'ORG_SUSPENDED', 'ORG_ACTIVATED', 'ORG_DELETED', 'REGULATION_CREATED', 'REGULATION_UPDATED', 'REGULATION_ARCHIVED', 'CONTROL_CREATED', 'CONTROL_UPDATED', 'CONTROL_PUBLISHED', 'CONTROL_DEACTIVATED', 'COURSE_CREATED', 'COURSE_UPDATED', 'COURSE_PUBLISHED', 'COURSE_ARCHIVED', 'QUESTION_CREATED', 'QUESTION_UPDATED', 'QUESTION_ARCHIVED', 'CERT_TEMPLATE_CREATED', 'CERT_TEMPLATE_UPDATED', 'CERTIFICATE_REVOKED', 'LICENSE_CREATED', 'LICENSE_RENEWED', 'LICENSE_REVOKED', 'SUPER_ADMIN_LOGIN', 'SUPER_ADMIN_LOGOUT', 'SETTINGS_UPDATED');

-- CreateTable
CREATE TABLE "super_admins" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "super_admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "tenantCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "orgSize" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'India',
    "website" TEXT,
    "contactEmail" TEXT NOT NULL,
    "dpoName" TEXT NOT NULL,
    "dpoEmail" TEXT NOT NULL,
    "dpoPhone" TEXT,
    "panNumber" TEXT,
    "gstNumber" TEXT,
    "classification" TEXT NOT NULL DEFAULT 'Data Fiduciary',
    "classUncertain" BOOLEAN NOT NULL DEFAULT false,
    "ceoName" TEXT NOT NULL,
    "ceoEmail" TEXT NOT NULL,
    "plan" "Plan" NOT NULL DEFAULT 'STARTER',
    "status" "OrgStatus" NOT NULL DEFAULT 'ONBOARDING',
    "internalNotes" TEXT,
    "onboardedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "license_keys" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "plan" "Plan" NOT NULL,
    "status" "LicenseStatus" NOT NULL DEFAULT 'ACTIVE',
    "maxUsers" INTEGER NOT NULL DEFAULT 10,
    "maxAssessments" INTEGER NOT NULL DEFAULT 5,
    "storageGb" INTEGER NOT NULL DEFAULT 10,
    "activatedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "license_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regulations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortCode" TEXT NOT NULL,
    "issuingAuthority" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "jurisdiction" TEXT NOT NULL DEFAULT 'India',
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "status" "RegulationStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "regulations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "controls" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "chapterReference" TEXT,
    "sectionReference" TEXT,
    "applicableTo" "ApplicableTo" NOT NULL DEFAULT 'BOTH',
    "status" "ControlStatus" NOT NULL DEFAULT 'DRAFT',
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "tenantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "controls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "control_regulations" (
    "controlId" TEXT NOT NULL,
    "regulationId" TEXT NOT NULL,

    CONSTRAINT "control_regulations_pkey" PRIMARY KEY ("controlId","regulationId")
);

-- CreateTable
CREATE TABLE "control_predefined_actions" (
    "id" TEXT NOT NULL,
    "controlId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "evidenceTypes" "EvidenceType"[],
    "suggestedDueDays" INTEGER NOT NULL DEFAULT 30,
    "priority" "Priority" NOT NULL DEFAULT 'HIGH',
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "control_predefined_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificate_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "layout" "CertLayout" NOT NULL DEFAULT 'CLASSIC',
    "titleText" TEXT NOT NULL DEFAULT 'Certificate of Completion',
    "bodyText" TEXT NOT NULL,
    "signatory" TEXT,
    "designation" TEXT,
    "signatureUrl" TEXT,
    "logoUrl" TEXT,
    "bgColor" TEXT NOT NULL DEFAULT '#FFFFFF',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "certificate_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms_courses" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "CourseCategory" NOT NULL,
    "difficulty" "CourseDifficulty" NOT NULL,
    "estimatedHours" INTEGER NOT NULL DEFAULT 0,
    "estimatedMinutes" INTEGER NOT NULL DEFAULT 0,
    "thumbnailUrl" TEXT,
    "status" "CourseStatus" NOT NULL DEFAULT 'DRAFT',
    "certificateTemplateId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lms_courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms_sections" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lms_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms_lessons" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "LessonType" NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "videoSource" "VideoSource",
    "videoUrl" TEXT,
    "videoDurationS" INTEGER,
    "readingContentType" "ReadingContentType",
    "readingContent" TEXT,
    "assignmentInstructions" TEXT,
    "assignmentSubmissionType" "AssignmentSubmissionType",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lms_lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms_quizzes" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "passThreshold" INTEGER NOT NULL DEFAULT 70,
    "timeLimitMins" INTEGER,
    "totalMarks" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lms_quizzes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_questions" (
    "id" TEXT NOT NULL,
    "quizId" TEXT,
    "questionText" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL,
    "marks" INTEGER NOT NULL DEFAULT 1,
    "difficulty" "Difficulty" NOT NULL DEFAULT 'MEDIUM',
    "topic" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "tfCorrectAnswer" BOOLEAN,
    "modelAnswer" TEXT,
    "wordLimit" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quiz_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_options" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "optionText" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "question_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_audit_logs" (
    "id" TEXT NOT NULL,
    "superAdminId" TEXT,
    "tenantId" TEXT,
    "action" "AuditAction" NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "targetName" TEXT,
    "details" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "super_admins_email_key" ON "super_admins"("email");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_tenantCode_key" ON "tenants"("tenantCode");

-- CreateIndex
CREATE UNIQUE INDEX "license_keys_tenantId_key" ON "license_keys"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "license_keys_key_key" ON "license_keys"("key");

-- CreateIndex
CREATE UNIQUE INDEX "regulations_shortCode_key" ON "regulations"("shortCode");

-- CreateIndex
CREATE UNIQUE INDEX "lms_quizzes_sectionId_key" ON "lms_quizzes"("sectionId");

-- AddForeignKey
ALTER TABLE "license_keys" ADD CONSTRAINT "license_keys_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_regulations" ADD CONSTRAINT "control_regulations_controlId_fkey" FOREIGN KEY ("controlId") REFERENCES "controls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_regulations" ADD CONSTRAINT "control_regulations_regulationId_fkey" FOREIGN KEY ("regulationId") REFERENCES "regulations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_predefined_actions" ADD CONSTRAINT "control_predefined_actions_controlId_fkey" FOREIGN KEY ("controlId") REFERENCES "controls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms_courses" ADD CONSTRAINT "lms_courses_certificateTemplateId_fkey" FOREIGN KEY ("certificateTemplateId") REFERENCES "certificate_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms_sections" ADD CONSTRAINT "lms_sections_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "lms_courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms_lessons" ADD CONSTRAINT "lms_lessons_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "lms_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms_quizzes" ADD CONSTRAINT "lms_quizzes_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "lms_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "lms_quizzes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_options" ADD CONSTRAINT "question_options_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "quiz_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_audit_logs" ADD CONSTRAINT "platform_audit_logs_superAdminId_fkey" FOREIGN KEY ("superAdminId") REFERENCES "super_admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_audit_logs" ADD CONSTRAINT "platform_audit_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
