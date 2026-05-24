-- CreateTable: LmsDesignation
CREATE TABLE "lms_designations" (
    "id"           TEXT NOT NULL,
    "name"         TEXT NOT NULL,
    "description"  TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive"     BOOLEAN NOT NULL DEFAULT true,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,
    CONSTRAINT "lms_designations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "lms_designations_name_key" ON "lms_designations"("name");

-- CreateTable: LmsCourseDesignation
CREATE TABLE "lms_course_designations" (
    "courseId"      TEXT NOT NULL,
    "designationId" TEXT NOT NULL,
    "isMandatory"   BOOLEAN NOT NULL DEFAULT true,
    "addedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "lms_course_designations_pkey" PRIMARY KEY ("courseId","designationId")
);

-- AddForeignKey
ALTER TABLE "lms_course_designations"
    ADD CONSTRAINT "lms_course_designations_courseId_fkey"
    FOREIGN KEY ("courseId") REFERENCES "lms_courses"("id") ON DELETE CASCADE;

ALTER TABLE "lms_course_designations"
    ADD CONSTRAINT "lms_course_designations_designationId_fkey"
    FOREIGN KEY ("designationId") REFERENCES "lms_designations"("id") ON DELETE CASCADE;