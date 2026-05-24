-- DropForeignKey
ALTER TABLE "lms_course_designations" DROP CONSTRAINT "lms_course_designations_courseId_fkey";

-- DropForeignKey
ALTER TABLE "lms_course_designations" DROP CONSTRAINT "lms_course_designations_designationId_fkey";

-- AddForeignKey
ALTER TABLE "lms_course_designations" ADD CONSTRAINT "lms_course_designations_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "lms_courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms_course_designations" ADD CONSTRAINT "lms_course_designations_designationId_fkey" FOREIGN KEY ("designationId") REFERENCES "lms_designations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
