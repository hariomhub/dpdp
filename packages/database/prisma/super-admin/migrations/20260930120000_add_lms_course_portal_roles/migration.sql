-- CreateTable
CREATE TABLE "lms_course_portal_roles" (
    "courseId" TEXT NOT NULL,
    "portalRole" TEXT NOT NULL,
    "isMandatory" BOOLEAN NOT NULL DEFAULT true,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lms_course_portal_roles_pkey" PRIMARY KEY ("courseId","portalRole")
);

-- AddForeignKey
ALTER TABLE "lms_course_portal_roles" ADD CONSTRAINT "lms_course_portal_roles_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "lms_courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
