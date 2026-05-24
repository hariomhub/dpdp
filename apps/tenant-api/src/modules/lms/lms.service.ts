import { getTenantPrisma, getSuperAdminPrisma } from '@dpdp/database'
import { TenantRole, TenantAuditAction } from '@prisma/tenant-client'
import { logTenantAction } from '../../utils/audit-logger'

const tenantDb = getTenantPrisma()
const adminDb  = getSuperAdminPrisma()

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

async function getDesignationFromDefault(tenantId: string, role: TenantRole): Promise<string | null> {
  const def = await tenantDb.roleDesignationDefault.findUnique({
    where: { tenantId_portalRole: { tenantId, portalRole: role } },
  })
  return def?.designation ?? null
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
            lessons: { orderBy: { orderIndex: 'asc' }, select: { id: true, title: true, type: true, videoDurationS: true } },
          },
        },
        designations: {
          include: { designation: { select: { id: true, name: true } } },
        },
        certificateTemplate: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
    })

    const enrollments = await tenantDb.lmsEnrollment.findMany({
      where: { tenantId, userId },
      include: {
        lessonProgress: true,
        quizAttempts:   { orderBy: { startedAt: 'desc' } },
      },
    })
    const enrollmentMap = new Map(enrollments.map(e => [e.courseId, e]))

    const mandatory: any[] = []
    const recommended: any[] = []
    const optional: any[] = []

    for (const course of allCourses) {
      const enrollment = enrollmentMap.get(course.id) ?? null
      const totalLessons = course.sections.reduce((sum, s) => sum + s.lessons.length, 0)
      const completedLessons = enrollment
        ? enrollment.lessonProgress.filter(p => p.isCompleted).length
        : 0

      const enriched = {
        ...course,
        enrollment:       enrollment ? { id: enrollment.id, enrolledAt: enrollment.enrolledAt, isCompleted: enrollment.isCompleted, completedAt: enrollment.completedAt } : null,
        isEnrolled:       !!enrollment,
        progress:         totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
        completedLessons,
        totalLessons,
      }

      const designationLink = designation
        ? course.designations.find(d => d.designation.name === designation)
        : null

      if (designationLink?.isMandatory)  mandatory.push(enriched)
      else if (designationLink)          recommended.push(enriched)
      else                               optional.push(enriched)
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

    await logTenantAction({ tenantId, userId, action: TenantAuditAction.USER_ACTIVATED, targetType: 'lms_enrollment', targetId: courseId })
    return enrollment
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

    // Check if all lessons complete → mark enrollment complete
    const course = await adminDb.lmsCourse.findUnique({
      where:   { id: enrollment.courseId },
      include: { sections: { include: { lessons: { select: { id: true } } } } },
    })
    if (course) {
      const allLessonIds = course.sections.flatMap(s => s.lessons.map(l => l.id))
      const completedIds = new Set([...(enrollment.lessonProgress.map(p => p.lessonId)), lessonId])
      if (allLessonIds.every(id => completedIds.has(id))) {
        await tenantDb.lmsEnrollment.update({
          where: { id: enrollmentId },
          data:  { isCompleted: true, completedAt: new Date() },
        })
      }
    }
    return { success: true }
  },

  // ── Submit quiz attempt ─────────────────────────────────────────────────────
  async submitQuiz(tenantId: string, userId: string, enrollmentId: string, quizId: string, answers: Record<string, string>) {
    const enrollment = await tenantDb.lmsEnrollment.findFirst({ where: { id: enrollmentId, tenantId, userId } })
    if (!enrollment) throw new Error('Enrollment not found')

    const quiz = await adminDb.lmsQuiz.findUnique({
      where:   { id: quizId },
      include: { questions: { include: { options: true } } },
    })
    if (!quiz) throw new Error('Quiz not found')

    let correct = 0
    for (const question of quiz.questions) {
      const correctOpt = question.options.find(o => o.isCorrect)
      if (correctOpt && answers[question.id] === correctOpt.id) correct++
    }

    const total        = quiz.questions.length
    const score        = total > 0 ? Math.round((correct / total) * 100) : 0
    const passed       = score >= (quiz.passThreshold ?? 70)
    const completedAt  = new Date()
    const attemptCount = await tenantDb.quizAttempt.count({ where: { enrollmentId } })

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
        totalMarks:    quiz.questions.reduce((s, q) => s + q.marks, 0),
        earnedMarks:   Math.round((correct / Math.max(total, 1)) * quiz.questions.reduce((s, q) => s + q.marks, 0)),
      },
    })

    return { score, passed, correct, total, attempt }
  },

  // ── Get user certificates ────────────────────────────────────────────────────
  async getCertificates(tenantId: string, userId: string) {
    const completedEnrollments = await tenantDb.lmsEnrollment.findMany({
      where: { tenantId, userId, isCompleted: true },
    })

    if (completedEnrollments.length === 0) return []

    const courses = await adminDb.lmsCourse.findMany({
      where:   { id: { in: completedEnrollments.map(e => e.courseId) } },
      include: { certificateTemplate: true },
    })

    return completedEnrollments.map(e => {
      const course = courses.find(c => c.id === e.courseId)
      return {
        enrollmentId: e.id,
        courseId:     e.courseId,
        courseTitle:  course?.title,
        completedAt:  e.completedAt,
        certificate:  course?.certificateTemplate ?? null,
      }
    }).filter(c => c.certificate)
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

    await tenantDb.user.update({ where: { id: targetUserId }, data: { lmsDesignation: designation } })

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
      details:    { lmsDesignation: designation, autoEnrolled } as any,
    })

    return { designation, autoEnrolled }
  },

  async bulkSetDesignation(tenantId: string, actorId: string, userIds: string[], designation: string) {
    let totalEnrolled = 0
    for (const userId of userIds) {
      await tenantDb.user.update({ where: { id: userId }, data: { lmsDesignation: designation } })
      totalEnrolled += await autoEnrollMandatory(tenantId, userId, designation)
    }
    return { updated: userIds.length, totalEnrolled }
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

    await tenantDb.user.update({ where: { id: userId }, data: { lmsDesignation: designation } })
    const enrolled = await autoEnrollMandatory(tenantId, userId, designation)
    return { designation, enrolled }
  },
}