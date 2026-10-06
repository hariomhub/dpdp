import { getTenantPrisma } from '@dpdp/database'
import { lib } from '../../library/client'
import { getOrgName } from '../../platform/tenant-profile'
import { TenantRole, TenantAuditAction } from '@prisma/tenant-client'
import { logTenantAction } from '../../utils/audit-logger'
import { HttpError } from '../../utils/http-error'

const tenantDb = getTenantPrisma()
const adminDb  = lib()   // Library content (courses, quizzes, designations, certificate templates)

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** A designation is picked from the vendor-defined list; refuse a name that does not exist or is switched off. */
async function assertDesignationExists(name: string): Promise<void> {
  const found = await adminDb.lmsDesignation.findFirst({ where: { name, isActive: true }, select: { id: true } })
  if (!found) throw HttpError.badRequest(`"${name}" is not an available designation`)
}

async function autoEnrollMandatory(tenantId: string, userId: string, designation: string) {
  const mandatoryCourses = await adminDb.lmsCourse.findMany({
    where: {
      status:       'PUBLISHED',
      designations: { some: { isMandatory: true, designation: { name: designation } } },
    },
    select: { id: true },
  })

  let enrolled = 0
  for (const course of mandatoryCourses) {
    await tenantDb.lmsEnrollment.upsert({
      where:  { tenantId_userId_courseId: { tenantId, userId, courseId: course.id } },
      update: {},
      create: { tenantId, userId, courseId: course.id },
    })
    enrolled++
  }
  return enrolled
}

// Independent targeting axis from designation — enrolls based on the
// platform's own permission role (CEO/CO/IT_ADMIN/INTERNAL_AUDITOR/
// EXTERNAL_AUDITOR), for "how do I use this portal" content.
async function autoEnrollMandatoryForRole(tenantId: string, userId: string, role: TenantRole) {
  const mandatoryCourses = await adminDb.lmsCourse.findMany({
    where: {
      status:      'PUBLISHED',
      portalRoles: { some: { isMandatory: true, portalRole: role } },
    },
    select: { id: true },
  })

  let enrolled = 0
  for (const course of mandatoryCourses) {
    await tenantDb.lmsEnrollment.upsert({
      where:  { tenantId_userId_courseId: { tenantId, userId, courseId: course.id } },
      update: {},
      create: { tenantId, userId, courseId: course.id },
    })
    enrolled++
  }
  return enrolled
}

async function getDesignationFromDefault(tenantId: string, role: TenantRole): Promise<string | null> {
  const def = await tenantDb.roleDesignationDefault.findUnique({
    where: { tenantId_portalRole: { tenantId, portalRole: role } },
  })
  return def?.designation ?? null
}

function generateCertificateCode(): string {
  const year = new Date().getFullYear()
  const rand = Math.random().toString(16).slice(2, 10).toUpperCase()
  return `CERT-${year}-${rand}`
}

// Joins a quiz's question definitions (admin schema) with a learner's saved
// per-question answers (tenant schema) into a display-ready review — used
// both right after submitting and when reopening a past attempt later.
function buildQuizReview(
  quiz: { questions: Array<{ id: string; questionText: string; type: string; marks: number; tfCorrectAnswer: boolean | null; modelAnswer: string | null; options: Array<{ id: string; optionText: string; isCorrect: boolean }> }> },
  answerRows: Array<{ questionId: string; selectedOptionId: string | null; tfAnswer: boolean | null; textAnswer: string | null; isCorrect: boolean | null; marksAwarded: number | null }>
) {
  const answerByQuestion = new Map(answerRows.map(a => [a.questionId, a]))
  return quiz.questions.map(q => {
    const a = answerByQuestion.get(q.id) ?? null
    if (q.type === 'MCQ') {
      const correctOpt  = q.options.find(o => o.isCorrect)
      const selectedOpt = q.options.find(o => o.id === a?.selectedOptionId)
      return {
        questionId: q.id, questionText: q.questionText, type: q.type, marks: q.marks,
        marksAwarded: a?.marksAwarded ?? null, isCorrect: a?.isCorrect ?? null,
        yourAnswerText:    selectedOpt?.optionText ?? null,
        correctAnswerText: correctOpt?.optionText ?? null,
        modelAnswer: null as string | null,
      }
    }
    if (q.type === 'TRUE_FALSE') {
      return {
        questionId: q.id, questionText: q.questionText, type: q.type, marks: q.marks,
        marksAwarded: a?.marksAwarded ?? null, isCorrect: a?.isCorrect ?? null,
        yourAnswerText:    a?.tfAnswer === null || a?.tfAnswer === undefined ? null : (a.tfAnswer ? 'True' : 'False'),
        correctAnswerText: q.tfCorrectAnswer === null ? null : (q.tfCorrectAnswer ? 'True' : 'False'),
        modelAnswer: null as string | null,
      }
    }
    // DESCRIPTIVE — captured for reference but never auto-graded.
    return {
      questionId: q.id, questionText: q.questionText, type: q.type, marks: q.marks,
      marksAwarded: null, isCorrect: null,
      yourAnswerText: a?.textAnswer ?? null,
      correctAnswerText: null as string | null,
      modelAnswer: q.modelAnswer,
    }
  })
}

// A course is complete once every lesson is marked done AND every section
// quiz (if any) has a passing attempt. Called after both lesson completion
// and quiz submission, since either could be the last outstanding requirement.
// Also issues the certificate (once) the first time completion is reached.
async function checkAndCompleteEnrollment(tenantId: string, userId: string, enrollmentId: string) {
  const enrollment = await tenantDb.lmsEnrollment.findFirst({
    where: { id: enrollmentId, tenantId, userId },
    include: { lessonProgress: true, quizAttempts: true },
  })
  if (!enrollment || enrollment.isCompleted) return

  const course = await adminDb.lmsCourse.findUnique({
    where:   { id: enrollment.courseId },
    include: { sections: { include: { lessons: { select: { id: true } }, quiz: { select: { id: true } } } } },
  })
  if (!course) return

  const allLessonIds = course.sections.flatMap(s => s.lessons.map(l => l.id))
  const completedLessonIds = new Set(enrollment.lessonProgress.filter(p => p.isCompleted).map(p => p.lessonId))
  const allLessonsDone = allLessonIds.every(id => completedLessonIds.has(id))

  const quizIds = course.sections.filter(s => s.quiz).map(s => s.quiz!.id)
  const passedQuizIds = new Set(enrollment.quizAttempts.filter(a => a.passed).map(a => a.quizId))
  const allQuizzesPassed = quizIds.every(id => passedQuizIds.has(id))

  if (!allLessonsDone || !allQuizzesPassed) return

  await tenantDb.lmsEnrollment.update({
    where: { id: enrollmentId },
    data:  { isCompleted: true, completedAt: new Date() },
  })

  if (course.certificateTemplateId) {
    const existing = await tenantDb.issuedCertificate.findFirst({
      where: { tenantId, userId, courseId: course.id },
    })
    if (!existing) {
      // Extremely low collision odds on the random suffix; retry once if it happens.
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          await tenantDb.issuedCertificate.create({
            data: {
              tenantId, userId, courseId: course.id,
              certificateTemplateId: course.certificateTemplateId,
              certificateCode: generateCertificateCode(),
            },
          })
          break
        } catch (err: any) {
          if (err?.code !== 'P2002' || attempt === 2) throw err
        }
      }
    }
  }
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const lmsService = {

  // ── Courses visible to a user based on their designation ───────────────────
  async getCourses(tenantId: string, userId: string) {
    const user = await tenantDb.user.findUnique({ where: { id: userId } })
    const designation = user?.lmsDesignation ?? null

    const allCourses = await adminDb.lmsCourse.findMany({
      where: { status: 'PUBLISHED' },
      include: {
        sections: {
          orderBy: { orderIndex: 'asc' },
          include: {
            lessons: {
              orderBy: { orderIndex: 'asc' },
              select: {
                id: true, title: true, description: true, type: true, orderIndex: true,
                videoSource: true, videoUrl: true, videoDurationS: true,
                readingContentType: true, readingContent: true,
                assignmentInstructions: true, assignmentSubmissionType: true,
              },
            },
            // Quiz payload is intentionally stripped of answer keys (isCorrect,
            // tfCorrectAnswer, modelAnswer) — this response goes straight to the
            // learner's browser.
            quiz: {
              select: {
                id: true, title: true, passThreshold: true, timeLimitMins: true, totalMarks: true,
                questions: {
                  orderBy: { orderIndex: 'asc' },
                  select: {
                    id: true, questionText: true, type: true, marks: true, difficulty: true, topic: true, wordLimit: true,
                    options: { orderBy: { orderIndex: 'asc' }, select: { id: true, optionText: true, orderIndex: true } },
                  },
                },
              },
            },
          },
        },
        designations: {
          include: { designation: { select: { id: true, name: true } } },
        },
        portalRoles: true,
        certificateTemplate: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
    })

    // Course content lives in private Azure Blob containers — sign each
    // reference fresh on the way out. This response is display-only (the
    // learner never resubmits it), so signing in place is safe here, unlike
    // the admin-api course-authoring endpoints.
    const { getSignedUrl } = await import('../../utils/storage')
    const signedCourses = allCourses.map(course => ({
      ...course,
      thumbnailUrl: getSignedUrl(course.thumbnailUrl),
      sections: course.sections.map(section => ({
        ...section,
        lessons: section.lessons.map(lesson => ({
          ...lesson,
          videoUrl: lesson.type === 'VIDEO' ? getSignedUrl(lesson.videoUrl) : lesson.videoUrl,
          readingContent: lesson.type === 'READING' && lesson.readingContentType === 'FILE'
            ? getSignedUrl(lesson.readingContent) : lesson.readingContent,
        })),
      })),
    }))

    const enrollments = await tenantDb.lmsEnrollment.findMany({
      where: { tenantId, userId },
      include: {
        lessonProgress:        true,
        quizAttempts:          { orderBy: { startedAt: 'desc' } },
        assignmentSubmissions: true,
      },
    })
    for (const e of enrollments) {
      e.assignmentSubmissions = e.assignmentSubmissions.map(s => ({ ...s, fileUrl: getSignedUrl(s.fileUrl) }))
    }
    const enrollmentMap = new Map(enrollments.map(e => [e.courseId, e]))

    const mandatory: any[] = []
    const recommended: any[] = []
    const optional: any[] = []

    for (const course of signedCourses) {
      const enrollment = enrollmentMap.get(course.id) ?? null
      const totalLessons = course.sections.reduce((sum, s) => sum + s.lessons.length, 0)
      const completedLessons = enrollment
        ? enrollment.lessonProgress.filter(p => p.isCompleted).length
        : 0

      const enriched = {
        ...course,
        enrollment: enrollment ? {
          id: enrollment.id, enrolledAt: enrollment.enrolledAt,
          isCompleted: enrollment.isCompleted, completedAt: enrollment.completedAt,
          lessonProgress: enrollment.lessonProgress,
          quizAttempts: enrollment.quizAttempts,
          assignmentSubmissions: enrollment.assignmentSubmissions,
        } : null,
        isEnrolled:       !!enrollment,
        progress:         totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
        completedLessons,
        totalLessons,
      }

      const designationLink = designation
        ? course.designations.find(d => d.designation.name === designation)
        : null
      // Independent targeting axis: matches the platform role the learner
      // holds in this software, regardless of their org job-function designation.
      const portalRoleLink = course.portalRoles.find(r => r.portalRole === user?.role)

      const isMandatory = !!(designationLink?.isMandatory || portalRoleLink?.isMandatory)
      const isTargeted  = !!designationLink || !!portalRoleLink

      if (isMandatory)      mandatory.push(enriched)
      else if (isTargeted)  recommended.push(enriched)
      else                  optional.push(enriched)
    }

    return { designation, mandatory, recommended, optional }
  },

  // ── Enroll user in a course (self-enroll for optional) ──────────────────────
  async enroll(tenantId: string, userId: string, courseId: string) {
    const course = await adminDb.lmsCourse.findFirst({ where: { id: courseId, status: 'PUBLISHED' } })
    if (!course) throw new Error('Course not found or not published')

    const enrollment = await tenantDb.lmsEnrollment.upsert({
      where:  { tenantId_userId_courseId: { tenantId, userId, courseId } },
      update: {},
      create: { tenantId, userId, courseId },
    })

    await logTenantAction({ tenantId, userId, action: TenantAuditAction.LMS_ENROLLED, targetType: 'lms_enrollment', targetId: courseId, targetName: course.title })
    return enrollment
  },

  // ── Unenroll (self-service, non-mandatory courses only) ─────────────────────
  async unenroll(tenantId: string, userId: string, courseId: string) {
    const enrollment = await tenantDb.lmsEnrollment.findFirst({ where: { tenantId, userId, courseId } })
    if (!enrollment) throw new Error('You are not enrolled in this course')

    const user = await tenantDb.user.findUnique({ where: { id: userId }, select: { role: true, lmsDesignation: true } })
    const course = await adminDb.lmsCourse.findUnique({
      where:   { id: courseId },
      include: { designations: { include: { designation: { select: { name: true } } } }, portalRoles: true },
    })
    const isMandatory = !!course && (
      course.designations.some(d => d.isMandatory && d.designation.name === user?.lmsDesignation) ||
      course.portalRoles.some(r => r.isMandatory && r.portalRole === user?.role)
    )
    if (isMandatory) throw new Error('This course is mandatory for your role and cannot be unenrolled from')

    await tenantDb.lmsEnrollment.delete({ where: { id: enrollment.id } })
    await logTenantAction({ tenantId, userId, action: TenantAuditAction.LMS_UNENROLLED, targetType: 'lms_enrollment', targetId: courseId, targetName: course?.title })
    return { success: true }
  },

  // ── Mark lesson progress ────────────────────────────────────────────────────
  async markLessonComplete(tenantId: string, userId: string, enrollmentId: string, lessonId: string) {
    const enrollment = await tenantDb.lmsEnrollment.findFirst({
      where: { id: enrollmentId, tenantId, userId },
      include: { lessonProgress: true },
    })
    if (!enrollment) throw new Error('Enrollment not found')

    await tenantDb.lmsLessonProgress.upsert({
      where:  { enrollmentId_lessonId: { enrollmentId, lessonId } },
      update: { isCompleted: true, completedAt: new Date() },
      create: { enrollmentId, lessonId, isCompleted: true, completedAt: new Date(), tenantId, userId },
    })

    await checkAndCompleteEnrollment(tenantId, userId, enrollmentId)
    return { success: true }
  },

  // ── Submit an assignment (text and/or file) ─────────────────────────────────
  async submitAssignment(tenantId: string, userId: string, enrollmentId: string, lessonId: string, data: {
    textAnswer?: string
    file?: { fileUrl: string; fileName: string; fileSize: number }
  }) {
    const enrollment = await tenantDb.lmsEnrollment.findFirst({ where: { id: enrollmentId, tenantId, userId } })
    if (!enrollment) throw new Error('Enrollment not found')
    if (!data.textAnswer && !data.file) throw new Error('Submission must include text or a file')

    const submission = await tenantDb.lmsAssignmentSubmission.upsert({
      where:  { enrollmentId_lessonId: { enrollmentId, lessonId } },
      update: {
        textAnswer: data.textAnswer ?? null,
        fileUrl: data.file?.fileUrl ?? null, fileName: data.file?.fileName ?? null, fileSize: data.file?.fileSize ?? null,
        submittedAt: new Date(),
      },
      create: {
        tenantId, enrollmentId, userId, lessonId,
        textAnswer: data.textAnswer ?? null,
        fileUrl: data.file?.fileUrl ?? null, fileName: data.file?.fileName ?? null, fileSize: data.file?.fileSize ?? null,
      },
    })

    await tenantDb.lmsLessonProgress.upsert({
      where:  { enrollmentId_lessonId: { enrollmentId, lessonId } },
      update: { isCompleted: true, completedAt: new Date() },
      create: { enrollmentId, lessonId, isCompleted: true, completedAt: new Date(), tenantId, userId },
    })

    await checkAndCompleteEnrollment(tenantId, userId, enrollmentId)
    return submission
  },

  // ── Submit quiz attempt ─────────────────────────────────────────────────────
  async submitQuiz(tenantId: string, userId: string, enrollmentId: string, quizId: string, answers: Record<string, string>) {
    const enrollment = await tenantDb.lmsEnrollment.findFirst({ where: { id: enrollmentId, tenantId, userId } })
    if (!enrollment) throw new Error('Enrollment not found')

    const quiz = await adminDb.lmsQuiz.findUnique({
      where:   { id: quizId },
      include: { questions: { include: { options: true }, orderBy: { orderIndex: 'asc' } } },
    })
    if (!quiz) throw new Error('Quiz not found')

    // Descriptive questions require manual grading and aren't auto-scored —
    // they're excluded from the pass/fail calculation, but still captured
    // below so the learner's answer isn't silently discarded.
    const autoGradable = quiz.questions.filter(q => q.type !== 'DESCRIPTIVE')

    let correct = 0
    const answerRows: Array<{
      questionId: string; selectedOptionId: string | null; tfAnswer: boolean | null
      textAnswer: string | null; isCorrect: boolean | null; marksAwarded: number | null
    }> = []

    for (const question of quiz.questions) {
      const raw = answers[question.id]
      if (question.type === 'MCQ') {
        const correctOpt = question.options.find(o => o.isCorrect)
        const isCorrect  = !!correctOpt && raw === correctOpt.id
        if (isCorrect) correct++
        answerRows.push({
          questionId: question.id, selectedOptionId: raw ?? null, tfAnswer: null, textAnswer: null,
          isCorrect, marksAwarded: isCorrect ? question.marks : 0,
        })
      } else if (question.type === 'TRUE_FALSE') {
        const submittedBool = raw === undefined ? null : (raw === 'true' || raw === true as any)
        const isCorrect = question.tfCorrectAnswer !== null && submittedBool === question.tfCorrectAnswer
        if (isCorrect) correct++
        answerRows.push({
          questionId: question.id, selectedOptionId: null, tfAnswer: submittedBool, textAnswer: null,
          isCorrect, marksAwarded: isCorrect ? question.marks : 0,
        })
      } else {
        answerRows.push({
          questionId: question.id, selectedOptionId: null, tfAnswer: null, textAnswer: raw ?? null,
          isCorrect: null, marksAwarded: null,
        })
      }
    }

    const total        = autoGradable.length
    const score        = total > 0 ? Math.round((correct / total) * 100) : 0
    const passed        = score >= (quiz.passThreshold ?? 70)
    const completedAt  = new Date()
    const attemptCount = await tenantDb.quizAttempt.count({ where: { enrollmentId, quizId } })

    const attempt = await tenantDb.quizAttempt.create({
      data: {
        enrollmentId,
        quizId,
        userId,
        tenantId,
        score,
        passed,
        completedAt,
        attemptNumber: attemptCount + 1,
        totalMarks:    autoGradable.reduce((s, q) => s + q.marks, 0),
        earnedMarks:   Math.round((correct / Math.max(total, 1)) * autoGradable.reduce((s, q) => s + q.marks, 0)),
        answers:       { create: answerRows },
      },
      include: { answers: true },
    })

    if (passed) await checkAndCompleteEnrollment(tenantId, userId, enrollmentId)

    return { score, passed, correct, total, attempt, review: buildQuizReview(quiz, attempt.answers) }
  },

  // ── Review a past quiz attempt (latest one) ──────────────────────────────────
  async getQuizReview(tenantId: string, userId: string, enrollmentId: string, quizId: string) {
    const enrollment = await tenantDb.lmsEnrollment.findFirst({ where: { id: enrollmentId, tenantId, userId } })
    if (!enrollment) throw new Error('Enrollment not found')

    const attempt = await tenantDb.quizAttempt.findFirst({
      where:   { enrollmentId, quizId },
      orderBy: { attemptNumber: 'desc' },
      include: { answers: true },
    })
    if (!attempt) throw new Error('No attempt found for this quiz yet')

    const quiz = await adminDb.lmsQuiz.findUnique({
      where:   { id: quizId },
      include: { questions: { include: { options: true }, orderBy: { orderIndex: 'asc' } } },
    })
    if (!quiz) throw new Error('Quiz not found')

    return {
      score: attempt.score, passed: attempt.passed, attemptNumber: attempt.attemptNumber,
      completedAt: attempt.completedAt,
      review: buildQuizReview(quiz, attempt.answers),
    }
  },

  // ── Get user certificates ────────────────────────────────────────────────────
  async getCertificates(tenantId: string, userId: string) {
    // Revoked certificates stay visible (badged) rather than silently
    // disappearing — the learner should be able to see that a certificate
    // they earned was later revoked, not just lose track of it.
    const issued = await tenantDb.issuedCertificate.findMany({
      where:   { tenantId, userId },
      orderBy: { issuedAt: 'desc' },
    })
    if (issued.length === 0) return []

    const [courses, templates] = await Promise.all([
      adminDb.lmsCourse.findMany({ where: { id: { in: issued.map(i => i.courseId) } } }),
      adminDb.certificateTemplate.findMany({ where: { id: { in: issued.map(i => i.certificateTemplateId).filter((id): id is string => !!id) } } }),
    ])

    return issued.map(cert => ({
      certificateCode: cert.certificateCode,
      courseId:        cert.courseId,
      courseTitle:     courses.find(c => c.id === cert.courseId)?.title,
      issuedAt:        cert.issuedAt,
      isRevoked:       cert.isRevoked,
      certificate:     templates.find(t => t.id === cert.certificateTemplateId) ?? null,
    }))
  },

  // ── Personal performance summary (category breakdown, quiz score trend,
  // certificates, recent activity) — built entirely from data already
  // captured elsewhere; nothing new is tracked here.
  async getMyPerformance(tenantId: string, userId: string) {
    const user = await tenantDb.user.findUnique({ where: { id: userId }, select: { role: true, lmsDesignation: true } })
    const designation = user?.lmsDesignation ?? null

    const courses = await adminDb.lmsCourse.findMany({
      where:  { status: 'PUBLISHED' },
      select: {
        id: true, certificateTemplateId: true,
        designations: { select: { isMandatory: true, designation: { select: { name: true } } } },
        portalRoles:  { select: { isMandatory: true, portalRole: true } },
      },
    })
    const enrollments = await tenantDb.lmsEnrollment.findMany({
      where:  { tenantId, userId },
      select: { courseId: true, isCompleted: true },
    })
    const enrollmentByCourse = new Map(enrollments.map(e => [e.courseId, e]))

    const required      = { completed: 0, total: 0 }
    const recommended   = { completed: 0, total: 0 }
    const optional       = { completed: 0, total: 0 }
    const certification  = { completed: 0, total: 0 }
    const guide           = { completed: 0, total: 0 }

    for (const course of courses) {
      const enrollment = enrollmentByCourse.get(course.id)
      if (!enrollment) continue
      const designationLink = designation ? course.designations.find(d => d.designation.name === designation) : undefined
      const portalRoleLink  = course.portalRoles.find(r => r.portalRole === user?.role)
      const isMandatory = !!(designationLink?.isMandatory || portalRoleLink?.isMandatory)
      const isTargeted  = !!designationLink || !!portalRoleLink
      const bucket = isMandatory ? required : isTargeted ? recommended : optional
      bucket.total++
      if (enrollment.isCompleted) bucket.completed++

      const typeBucket = course.certificateTemplateId ? certification : guide
      typeBucket.total++
      if (enrollment.isCompleted) typeBucket.completed++
    }

    const attempts = await tenantDb.quizAttempt.findMany({
      where:   { tenantId, userId, completedAt: { not: null } },
      orderBy: { completedAt: 'asc' },
      select:  { quizId: true, score: true, passed: true, completedAt: true },
    })

    const quizIds     = [...new Set(attempts.map(a => a.quizId))]
    const quizzes      = await adminDb.lmsQuiz.findMany({ where: { id: { in: quizIds } }, select: { id: true, title: true, sectionId: true } })
    const sectionIds  = [...new Set(quizzes.map(q => q.sectionId))]
    const sections     = await adminDb.lmsSection.findMany({ where: { id: { in: sectionIds } }, select: { id: true, courseId: true } })

    const certs = await tenantDb.issuedCertificate.findMany({
      where:   { tenantId, userId, isRevoked: false },
      orderBy: { issuedAt: 'desc' },
      select:  { courseId: true, issuedAt: true },
    })

    const allCourseIds  = [...new Set([...sections.map(s => s.courseId), ...certs.map(c => c.courseId)])]
    const courseTitles  = await adminDb.lmsCourse.findMany({ where: { id: { in: allCourseIds } }, select: { id: true, title: true } })
    const courseTitleById  = new Map(courseTitles.map(c => [c.id, c.title]))
    const courseIdByQuizId = new Map(quizzes.map(q => [q.id, sections.find(s => s.id === q.sectionId)?.courseId]))
    const quizTitleById    = new Map(quizzes.map(q => [q.id, q.title]))

    const quizScoreHistory = attempts.map(a => ({
      date: a.completedAt as Date, score: a.score, passed: a.passed,
      quizTitle:   quizTitleById.get(a.quizId) ?? 'Quiz',
      courseTitle: courseTitleById.get(courseIdByQuizId.get(a.quizId) ?? '') ?? '',
    }))

    const recentActivity = [
      ...attempts.map(a => ({
        type: 'quiz' as const, date: a.completedAt as Date,
        title:       a.passed ? `Passed ${quizTitleById.get(a.quizId) ?? 'a quiz'}` : `Attempted ${quizTitleById.get(a.quizId) ?? 'a quiz'}`,
        courseTitle: courseTitleById.get(courseIdByQuizId.get(a.quizId) ?? '') ?? '',
      })),
      ...certs.map(c => ({
        type: 'certificate' as const, date: c.issuedAt,
        title: 'Certificate earned',
        courseTitle: courseTitleById.get(c.courseId) ?? '',
      })),
    ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 10)

    return {
      required, recommended, optional, certification, guide,
      certificatesEarned: certs.length,
      avgQuizScore: attempts.length > 0 ? Math.round(attempts.reduce((s, a) => s + a.score, 0) / attempts.length) : 0,
      totalQuizAttempts: attempts.length,
      quizScoreHistory,
      recentActivity,
    }
  },

  // ── Single certificate, for the printable download view ─────────────────────
  async getCertificateByCode(tenantId: string, userId: string, certificateCode: string) {
    const cert = await tenantDb.issuedCertificate.findFirst({ where: { tenantId, userId, certificateCode } })
    if (!cert) throw new Error('Certificate not found')

    const [user, tenant, course, template] = await Promise.all([
      tenantDb.user.findUnique({ where: { id: userId }, select: { name: true } }),
      getOrgName(tenantId),
      adminDb.lmsCourse.findUnique({ where: { id: cert.courseId }, select: { title: true } }),
      cert.certificateTemplateId ? adminDb.certificateTemplate.findUnique({ where: { id: cert.certificateTemplateId } }) : null,
    ])

    return {
      certificateCode: cert.certificateCode,
      issuedAt:        cert.issuedAt,
      isRevoked:       cert.isRevoked,
      learnerName:     user?.name ?? '',
      organizationName: tenant ?? '',
      courseTitle:     course?.title ?? '',
      template,
    }
  },

  // ── Designation management ──────────────────────────────────────────────────

  async getDesignations() {
    return adminDb.lmsDesignation.findMany({
      where: { isActive: true },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, description: true, displayOrder: true },
    })
  },

  async setUserDesignation(tenantId: string, actorId: string, targetUserId: string, designation: string | null) {
    const user = await tenantDb.user.findFirst({ where: { tenantId, id: targetUserId } })
    if (!user) throw new Error('User not found')
    if (designation) await assertDesignationExists(designation)

    await tenantDb.user.updateMany({ where: { id: targetUserId, tenantId }, data: { lmsDesignation: designation } })

    let autoEnrolled = 0
    if (designation) {
      autoEnrolled = await autoEnrollMandatory(tenantId, targetUserId, designation)
    }

    await logTenantAction({
      tenantId, userId: actorId,
      action:     TenantAuditAction.USER_UPDATED,
      targetType: 'user',
      targetId:   targetUserId,
      targetName: user.name,
      details:    { lmsDesignation: designation, autoEnrolled, triggeredBy: 'designation', matchedValue: designation } as any,
    })

    return { designation, autoEnrolled }
  },

  async bulkSetDesignation(tenantId: string, actorId: string, userIds: string[], designation: string) {
    await assertDesignationExists(designation)

    // Only people of this organisation may be changed. An id that is not found is reported, not silently skipped,
    // so a stale selection cannot half-apply.
    const ids = [...new Set(userIds)]
    const users = await tenantDb.user.findMany({ where: { tenantId, id: { in: ids } }, select: { id: true } })
    if (users.length !== ids.length) throw HttpError.badRequest('One or more selected users were not found in your organization')

    let totalEnrolled = 0
    for (const u of users) {
      await tenantDb.user.updateMany({ where: { id: u.id, tenantId }, data: { lmsDesignation: designation } })
      totalEnrolled += await autoEnrollMandatory(tenantId, u.id, designation)
    }

    await logTenantAction({
      tenantId, userId: actorId,
      action:     TenantAuditAction.USER_UPDATED,
      targetType: 'lms_designation',
      targetName: designation,
      details:    { users: users.length, autoEnrolled: totalEnrolled, triggeredBy: 'designation', matchedValue: designation, bulk: true } as any,
    })

    return { updated: users.length, totalEnrolled }
  },

  // ── Role → Designation defaults ─────────────────────────────────────────────

  async getRoleDefaults(tenantId: string) {
    return tenantDb.roleDesignationDefault.findMany({ where: { tenantId } })
  },

  async setRoleDefaults(tenantId: string, actorId: string, mappings: Array<{ portalRole: TenantRole; designation: string }>) {
    for (const m of mappings) {
      if (!m.designation) {
        await tenantDb.roleDesignationDefault.deleteMany({
          where: { tenantId, portalRole: m.portalRole },
        })
      } else {
        await tenantDb.roleDesignationDefault.upsert({
          where:  { tenantId_portalRole: { tenantId, portalRole: m.portalRole } },
          update: { designation: m.designation },
          create: { tenantId, portalRole: m.portalRole, designation: m.designation },
        })
      }
    }
    return { updated: mappings.length }
  },

  // ── Apply default designation to new user ────────────────────────────────────
  async applyDefaultDesignation(tenantId: string, userId: string, role: TenantRole) {
    const designation = await getDesignationFromDefault(tenantId, role)
    if (!designation) return null

    await tenantDb.user.updateMany({ where: { id: userId, tenantId }, data: { lmsDesignation: designation } })
    const enrolled = await autoEnrollMandatory(tenantId, userId, designation)
    return { designation, enrolled }
  },

  // ── Apply portal-role-targeted mandatory courses ────────────────────────────
  // Call this wherever a user's platform role is established or changes
  // (invite acceptance, role change) — independent of the designation flow
  // above, since portal-role targeting is a separate axis (see
  // LmsCoursePortalRole). Logs its own audit entry so it's clear which
  // mechanism triggered the enrollment.
  async applyPortalRoleEnrollment(tenantId: string, userId: string, role: TenantRole) {
    const enrolled = await autoEnrollMandatoryForRole(tenantId, userId, role)
    if (enrolled > 0) {
      const user = await tenantDb.user.findUnique({ where: { id: userId }, select: { name: true } })
      await logTenantAction({
        tenantId, userId,
        action:     TenantAuditAction.LMS_ENROLLED,
        targetType: 'lms_enrollment',
        targetId:   userId,
        targetName: user?.name,
        details:    { autoEnrolled: enrolled, triggeredBy: 'portalRole', matchedValue: role } as any,
      })
    }
    return { role, enrolled }
  },

  // ── Retroactively apply a role's default designation to its existing users ──
  // (Role Mapping in Settings only applies to new users going forward — this
  // is the explicit bridge action for backfilling users who already exist.)
  async applyRoleDefaultToExisting(tenantId: string, actorId: string, role: TenantRole) {
    const designation = await getDesignationFromDefault(tenantId, role)
    if (!designation) throw new Error('No default designation configured for this role')

    const users = await tenantDb.user.findMany({
      where: { tenantId, role, status: 'ACTIVE' },
      select: { id: true, name: true },
    })

    let totalEnrolled = 0
    for (const u of users) {
      await tenantDb.user.updateMany({ where: { id: u.id, tenantId }, data: { lmsDesignation: designation } })
      totalEnrolled += await autoEnrollMandatory(tenantId, u.id, designation)
    }

    await logTenantAction({
      tenantId, userId: actorId,
      action:     TenantAuditAction.USER_UPDATED,
      targetType: 'lms_role_default',
      targetId:   role,
      targetName: `${role} → ${designation}`,
      details:    { appliedToExistingUsers: users.length, designation, autoEnrolled: totalEnrolled, triggeredBy: 'designation', matchedValue: designation } as any,
    })

    return { designation, usersUpdated: users.length, totalEnrolled }
  },

  // ── Org-wide training coverage (for CO/CEO) ─────────────────────────────────
  async getCoverage(tenantId: string) {
    const users = await tenantDb.user.findMany({
      where:  { tenantId, status: 'ACTIVE' },
      select: { id: true, name: true, role: true, lmsDesignation: true },
    })

    const designations = [...new Set(users.map(u => u.lmsDesignation).filter((d): d is string => !!d))]
    const roles = [...new Set(users.map(u => u.role))]

    const [designationLinks, portalRoleLinks] = await Promise.all([
      adminDb.lmsCourseDesignation.findMany({
        where:   { isMandatory: true, designation: { name: { in: designations } }, course: { status: 'PUBLISHED' } },
        include: { designation: { select: { name: true } }, course: { select: { id: true, title: true, certificateTemplateId: true } } },
      }),
      adminDb.lmsCoursePortalRole.findMany({
        where:   { isMandatory: true, portalRole: { in: roles }, course: { status: 'PUBLISHED' } },
        include: { course: { select: { id: true, title: true, certificateTemplateId: true } } },
      }),
    ])

    type MandatoryCourse = { id: string; title: string; certificateTemplateId: string | null }
    const mandatoryByDesignation = new Map<string, MandatoryCourse[]>()
    for (const link of designationLinks) {
      const list = mandatoryByDesignation.get(link.designation.name) ?? []
      list.push(link.course)
      mandatoryByDesignation.set(link.designation.name, list)
    }
    const mandatoryByRole = new Map<string, MandatoryCourse[]>()
    for (const link of portalRoleLinks) {
      const list = mandatoryByRole.get(link.portalRole) ?? []
      list.push(link.course)
      mandatoryByRole.set(link.portalRole, list)
    }

    const enrollments = await tenantDb.lmsEnrollment.findMany({
      where:  { tenantId, userId: { in: users.map(u => u.id) } },
      select: { userId: true, courseId: true, isCompleted: true },
    })

    const perUserMandatory = users.map(u => {
      const byDesignation = u.lmsDesignation ? (mandatoryByDesignation.get(u.lmsDesignation) ?? []) : []
      const byRole = mandatoryByRole.get(u.role) ?? []
      const merged = new Map<string, MandatoryCourse>()
      for (const c of [...byDesignation, ...byRole]) merged.set(c.id, c)
      return { user: u, mandatoryCourses: [...merged.values()] }
    })

    function summarize(courseFilter: (c: MandatoryCourse) => boolean) {
      const perUser = perUserMandatory.map(({ user: u, mandatoryCourses: all }) => {
        const mandatoryCourses = all.filter(courseFilter)
        const userEnrollments = enrollments.filter(e => e.userId === u.id)
        const completedIds = new Set(userEnrollments.filter(e => e.isCompleted).map(e => e.courseId))
        const missing = mandatoryCourses.filter(c => !completedIds.has(c.id))
        return {
          userId: u.id, name: u.name, role: u.role, designation: u.lmsDesignation,
          mandatoryCount: mandatoryCourses.length,
          completedCount: mandatoryCourses.length - missing.length,
          missingCourses: missing.map(c => c.title),
          completionRate: mandatoryCourses.length > 0
            ? Math.round(((mandatoryCourses.length - missing.length) / mandatoryCourses.length) * 100)
            : 100,
        }
      })

      const perDesignation = designations.map(d => {
        const usersInGroup = perUser.filter(u => u.designation === d)
        const avg = usersInGroup.length > 0
          ? Math.round(usersInGroup.reduce((s, u) => s + u.completionRate, 0) / usersInGroup.length)
          : 100
        const mandatoryCourseCount = perUserMandatory
          .find(({ user: u }) => u.lmsDesignation === d)?.mandatoryCourses.filter(courseFilter).length ?? 0
        return { designation: d, userCount: usersInGroup.length, mandatoryCourseCount, avgCompletionRate: avg }
      })

      const relevantUsers = perUser.filter(u => u.mandatoryCount > 0)
      const orgAvg = relevantUsers.length > 0
        ? Math.round(relevantUsers.reduce((s, u) => s + u.completionRate, 0) / relevantUsers.length)
        : 0

      return {
        totalUsers: users.length,
        usersWithMandatory: relevantUsers.length,
        orgCompletionRate: orgAvg,
        perDesignation,
        behindUsers: perUser.filter(u => u.mandatoryCount > 0 && u.completionRate < 100)
          .sort((a, b) => a.completionRate - b.completionRate),
      }
    }

    return {
      certification: summarize(c => !!c.certificateTemplateId),
      guides:        summarize(c => !c.certificateTemplateId),
    }
  },
}