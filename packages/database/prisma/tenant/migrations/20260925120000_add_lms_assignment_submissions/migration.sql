-- CreateTable
CREATE TABLE "lms_assignment_submissions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "textAnswer" TEXT,
    "fileUrl" TEXT,
    "fileName" TEXT,
    "fileSize" INTEGER,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lms_assignment_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lms_assignment_submissions_enrollmentId_lessonId_key" ON "lms_assignment_submissions"("enrollmentId", "lessonId");

-- AddForeignKey
ALTER TABLE "lms_assignment_submissions" ADD CONSTRAINT "lms_assignment_submissions_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "lms_enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms_assignment_submissions" ADD CONSTRAINT "lms_assignment_submissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
