import { getSuperAdminPrisma } from '@dpdp/database'
import {
  CourseStatus, CourseDifficulty, CourseCategory,
  LessonType, VideoSource, ReadingContentType,
  AssignmentSubmissionType, QuestionType, Difficulty,
  CertLayout, AuditAction, Prisma
} from '@prisma/super-admin-client'
import { parsePagination, buildMeta } from '../../utils/pagination'
import { logAuditAction } from '../../utils/audit-logger'

const db = getSuperAdminPrisma()

export const lmsService = {
  // ─── COURSES ───────────────────────────────────────────

  async listCourses(query: Record<string, unknown>) {
    const { page, limit, skip } = parsePagination(query)

    const where: Prisma.LmsCourseWhereInput = {}
    if (query.status) where.status = query.status as CourseStatus
    if (query.category) where.category = query.category as CourseCategory
    if (query.difficulty) where.difficulty = query.difficulty as CourseDifficulty
    if (query.search) {
      where.OR = [
        { title: { contains: String(query.search), mode: 'insensitive' } },
        { description: { contains: String(query.search), mode: 'insensitive' } },
      ]
    }

    const [courses, total] = await Promise.all([
      db.lmsCourse.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          certificateTemplate: {
            select: { id: true, name: true },
          },
          _count: {
            select: { sections: true },
          },
        },
      }),
      db.lmsCourse.count({ where }),
    ])

    return { data: courses, meta: buildMeta(total, page, limit) }
  },

  async getCourseById(id: string) {
    const course = await db.lmsCourse.findUnique({
      where: { id },
      include: {
        sections: {
          orderBy: { orderIndex: 'asc' },
          include: {
            lessons: { orderBy: { orderIndex: 'asc' } },
            quiz: {
              include: {
                questions: {
                  orderBy: { orderIndex: 'asc' },
                  include: { options: { orderBy: { orderIndex: 'asc' } } },
                },
              },
            },
          },
        },
        certificateTemplate: true,
      },
    })
    if (!course) throw new Error('Course not found')
    return course
  },

  async createCourse(params: {
    title: string
    description: string
    category: CourseCategory
    difficulty: CourseDifficulty
    estimatedHours: number
    estimatedMinutes: number
    thumbnailUrl?: string
    status: CourseStatus
    certificateTemplateId?: string
    adminId: string
  }) {
    const course = await db.lmsCourse.create({
      data: {
        title: params.title,
        description: params.description,
        category: params.category,
        difficulty: params.difficulty,
        estimatedHours: params.estimatedHours,
        estimatedMinutes: params.estimatedMinutes,
        thumbnailUrl: params.thumbnailUrl,
        status: params.status,
        certificateTemplateId: params.certificateTemplateId,
      },
    })

    await logAuditAction({
      superAdminId: params.adminId,
      action: AuditAction.COURSE_CREATED,
      targetType: 'lms_course',
      targetId: course.id,
      targetName: course.title,
      details: { status: course.status } as Prisma.InputJsonValue,
    })

    return course
  },

  async updateCourse(params: {
    id: string
    data: Partial<{
      title: string
      description: string
      category: CourseCategory
      difficulty: CourseDifficulty
      estimatedHours: number
      estimatedMinutes: number
      thumbnailUrl: string
      status: CourseStatus
      certificateTemplateId: string
    }>
    adminId: string
  }) {
    const existing = await db.lmsCourse.findUnique({ where: { id: params.id } })
    if (!existing) throw new Error('Course not found')

    const updated = await db.lmsCourse.update({
      where: { id: params.id },
      data: params.data,
    })

    await logAuditAction({
      superAdminId: params.adminId,
      action: AuditAction.COURSE_UPDATED,
      targetType: 'lms_course',
      targetId: params.id,
      targetName: updated.title,
      details: { changes: params.data } as Prisma.InputJsonValue,
    })

    return updated
  },

  async syncCourseContent(courseId: string, data: any, adminId: string) {
    const existingCourse = await db.lmsCourse.findUnique({ where: { id: courseId } });
    if (!existingCourse) throw new Error('Course not found');

    return db.$transaction(async (tx) => {
      // 1. Fetch current sections and quizzes
      const existingSections = await tx.lmsSection.findMany({
        where: { courseId },
        include: { lessons: true }
      });
      
      const payloadSectionIds = (data.sections || []).map((s: any) => s.id).filter(Boolean);
      const sectionsToDelete = existingSections.filter(s => !payloadSectionIds.includes(s.id));
      
      if (sectionsToDelete.length > 0) {
        await tx.lmsSection.deleteMany({
          where: { id: { in: sectionsToDelete.map(s => s.id) } }
        });
      }

      let lastSectionId = null;

      // 2. Upsert sections & lessons
      for (let i = 0; i < (data.sections || []).length; i++) {
        const secPayload = data.sections[i];
        let sectionId = secPayload.id;

        if (sectionId && existingSections.find(s => s.id === sectionId)) {
          await tx.lmsSection.update({
            where: { id: sectionId },
            data: { title: secPayload.title, description: secPayload.desc, orderIndex: i }
          });
        } else {
          const newSec = await tx.lmsSection.create({
            data: { courseId, title: secPayload.title, description: secPayload.desc, orderIndex: i }
          });
          sectionId = newSec.id;
        }
        
        lastSectionId = sectionId;

        const existingLessons = existingSections.find(s => s.id === sectionId)?.lessons || [];
        const payloadLessonIds = (secPayload.items || []).map((l: any) => l.id).filter(Boolean);
        const lessonsToDelete = existingLessons.filter(l => !payloadLessonIds.includes(l.id));

        if (lessonsToDelete.length > 0) {
          await tx.lmsLesson.deleteMany({
            where: { id: { in: lessonsToDelete.map(l => l.id) } }
          });
        }

        for (let j = 0; j < (secPayload.items || []).length; j++) {
          const item = secPayload.items[j];
          // Ensure valid enum value
          const lessonType = item.type.toUpperCase().replace('-', '_') as LessonType;
          if (item.id && existingLessons.find(l => l.id === item.id)) {
            await tx.lmsLesson.update({
              where: { id: item.id },
              data: { title: item.title, type: lessonType, orderIndex: j }
            });
          } else {
            await tx.lmsLesson.create({
              data: { sectionId, title: item.title, type: lessonType, orderIndex: j }
            });
          }
        }
      }

      // 3. Upsert Quiz (attach to the last section, or delete if no quiz)
      const existingQuizzes = await tx.lmsQuiz.findMany({
        where: { section: { courseId } },
        include: { questions: { include: { options: true } } }
      });

      if (!data.quiz || !lastSectionId) {
        if (existingQuizzes.length > 0) {
          await tx.lmsQuiz.deleteMany({ where: { id: { in: existingQuizzes.map(q => q.id) } } });
        }
      } else {
        const quizPayload = data.quiz;
        let quizId = existingQuizzes[0]?.id;
        
        if (existingQuizzes.length > 1) {
            const toDelete = existingQuizzes.slice(1);
            await tx.lmsQuiz.deleteMany({ where: { id: { in: toDelete.map(q => q.id) } } });
        }

        if (quizId) {
          await tx.lmsQuiz.update({
            where: { id: quizId },
            data: {
              sectionId: lastSectionId,
              title: quizPayload.title,
              passThreshold: quizPayload.passThreshold,
              timeLimitMins: quizPayload.timeLimit ? parseInt(quizPayload.timeLimit) : null,
              totalMarks: quizPayload.questions.reduce((sum: number, q: any) => sum + q.marks, 0)
            }
          });
        } else {
          const newQuiz = await tx.lmsQuiz.create({
            data: {
              sectionId: lastSectionId,
              title: quizPayload.title,
              passThreshold: quizPayload.passThreshold,
              timeLimitMins: quizPayload.timeLimit ? parseInt(quizPayload.timeLimit) : null,
              totalMarks: quizPayload.questions.reduce((sum: number, q: any) => sum + q.marks, 0)
            }
          });
          quizId = newQuiz.id;
        }

        // Upsert Questions
        const existingQuestions = existingQuizzes[0]?.questions || [];
        const payloadQIds = quizPayload.questions.map((q: any) => q.id).filter(Boolean);
        const qToDelete = existingQuestions.filter(q => !payloadQIds.includes(q.id));
        
        if (qToDelete.length > 0) {
            await tx.quizQuestion.deleteMany({ where: { id: { in: qToDelete.map(q => q.id) } } });
        }
        
        for (let k = 0; k < quizPayload.questions.length; k++) {
            const qPayload = quizPayload.questions[k];
            const qType = qPayload.type === 'True-False' || qPayload.type === 'TRUE_FALSE' ? 'TRUE_FALSE' : qPayload.type.toUpperCase().replace('-', '_') as QuestionType;
            const qDiff = qPayload.difficulty.toUpperCase() as Difficulty;

            if (qPayload.id && existingQuestions.find(q => q.id === qPayload.id)) {
                await tx.quizQuestion.update({
                    where: { id: qPayload.id },
                    data: {
                        questionText: qPayload.text,
                        type: qType,
                        marks: qPayload.marks,
                        difficulty: qDiff,
                        orderIndex: k
                    }
                });
            } else {
                await tx.quizQuestion.create({
                    data: {
                        quizId,
                        questionText: qPayload.text,
                        type: qType,
                        marks: qPayload.marks,
                        difficulty: qDiff,
                        orderIndex: k
                    }
                });
            }
        }
      }
      
      await logAuditAction({
        superAdminId: adminId,
        action: AuditAction.COURSE_UPDATED,
        targetType: 'lms_course',
        targetId: courseId,
        targetName: existingCourse.title,
        details: { action: 'content_synced' } as Prisma.InputJsonValue,
      });

      return { success: true };
    });
  },

  async publishCourse(id: string, adminId: string) {
    const existing = await db.lmsCourse.findUnique({ where: { id } })
    if (!existing) throw new Error('Course not found')

    const updated = await db.lmsCourse.update({
      where: { id },
      data: { status: CourseStatus.PUBLISHED },
    })

    await logAuditAction({
      superAdminId: adminId,
      action: AuditAction.COURSE_PUBLISHED,
      targetType: 'lms_course',
      targetId: id,
      targetName: existing.title,
    })

    return updated
  },

  async archiveCourse(id: string, adminId: string) {
    const existing = await db.lmsCourse.findUnique({ where: { id } })
    if (!existing) throw new Error('Course not found')

    const updated = await db.lmsCourse.update({
      where: { id },
      data: { status: CourseStatus.ARCHIVED },
    })

    await logAuditAction({
      superAdminId: adminId,
      action: AuditAction.COURSE_ARCHIVED,
      targetType: 'lms_course',
      targetId: id,
      targetName: existing.title,
    })

    return updated
  },

  // ─── SECTIONS ──────────────────────────────────────────

  async createSection(params: {
    courseId: string
    title: string
    description?: string
    orderIndex: number
  }) {
    const course = await db.lmsCourse.findUnique({
      where: { id: params.courseId },
    })
    if (!course) throw new Error('Course not found')

    return db.lmsSection.create({
      data: {
        courseId: params.courseId,
        title: params.title,
        description: params.description,
        orderIndex: params.orderIndex,
      },
    })
  },

  async updateSection(id: string, data: Partial<{
    title: string
    description: string
    orderIndex: number
  }>) {
    const existing = await db.lmsSection.findUnique({ where: { id } })
    if (!existing) throw new Error('Section not found')
    return db.lmsSection.update({ where: { id }, data })
  },

  async deleteSection(id: string) {
    const existing = await db.lmsSection.findUnique({ where: { id } })
    if (!existing) throw new Error('Section not found')
    await db.lmsSection.delete({ where: { id } })
    return { message: 'Section deleted' }
  },

  // ─── LESSONS ───────────────────────────────────────────

  async createLesson(params: {
    sectionId: string
    title: string
    description?: string
    type: LessonType
    orderIndex: number
    videoSource?: VideoSource
    videoUrl?: string
    videoDurationS?: number
    readingContentType?: ReadingContentType
    readingContent?: string
    assignmentInstructions?: string
    assignmentSubmissionType?: AssignmentSubmissionType
  }) {
    const section = await db.lmsSection.findUnique({
      where: { id: params.sectionId },
    })
    if (!section) throw new Error('Section not found')

    return db.lmsLesson.create({ data: params })
  },

  async updateLesson(id: string, data: Partial<{
    title: string
    description: string
    orderIndex: number
    videoSource: VideoSource
    videoUrl: string
    videoDurationS: number
    readingContentType: ReadingContentType
    readingContent: string
    assignmentInstructions: string
    assignmentSubmissionType: AssignmentSubmissionType
  }>) {
    const existing = await db.lmsLesson.findUnique({ where: { id } })
    if (!existing) throw new Error('Lesson not found')
    return db.lmsLesson.update({ where: { id }, data })
  },

  async deleteLesson(id: string) {
    const existing = await db.lmsLesson.findUnique({ where: { id } })
    if (!existing) throw new Error('Lesson not found')
    await db.lmsLesson.delete({ where: { id } })
    return { message: 'Lesson deleted' }
  },

  // ─── QUIZ ──────────────────────────────────────────────

  async createQuiz(params: {
    sectionId: string
    title: string
    passThreshold: number
    timeLimitMins?: number
  }) {
    const section = await db.lmsSection.findUnique({
      where: { id: params.sectionId },
    })
    if (!section) throw new Error('Section not found')

    const existing = await db.lmsQuiz.findUnique({
      where: { sectionId: params.sectionId },
    })
    if (existing) throw new Error('Section already has a quiz')

    return db.lmsQuiz.create({
      data: {
        sectionId: params.sectionId,
        title: params.title,
        passThreshold: params.passThreshold,
        timeLimitMins: params.timeLimitMins,
      },
    })
  },

  async updateQuiz(id: string, data: Partial<{
    title: string
    passThreshold: number
    timeLimitMins: number
  }>) {
    const existing = await db.lmsQuiz.findUnique({ where: { id } })
    if (!existing) throw new Error('Quiz not found')
    return db.lmsQuiz.update({ where: { id }, data })
  },

  // ─── QUESTIONS ─────────────────────────────────────────

  async listQuestions(query: Record<string, unknown>) {
    const { page, limit, skip } = parsePagination(query)

    const where: Prisma.QuizQuestionWhereInput = {}
    if (query.type) where.type = query.type as QuestionType
    if (query.difficulty) where.difficulty = query.difficulty as Difficulty
    if (query.topic) where.topic = { contains: String(query.topic), mode: 'insensitive' }
    if (query.quizId) where.quizId = String(query.quizId)
    if (query.bankOnly === 'true') where.quizId = null
    if (query.search) {
      where.questionText = { contains: String(query.search), mode: 'insensitive' }
    }

    const [questions, total] = await Promise.all([
      db.quizQuestion.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          options: { orderBy: { orderIndex: 'asc' } },
          _count: { select: { options: true } },
        },
      }),
      db.quizQuestion.count({ where }),
    ])

    return { data: questions, meta: buildMeta(total, page, limit) }
  },

  async createQuestion(params: {
    quizId?: string
    questionText: string
    type: QuestionType
    marks: number
    difficulty: Difficulty
    topic?: string
    orderIndex?: number
    tfCorrectAnswer?: boolean
    modelAnswer?: string
    wordLimit?: number
    options?: { optionText: string; isCorrect: boolean; orderIndex: number }[]
    adminId: string
  }) {
    if (params.type === QuestionType.MCQ) {
      if (!params.options || params.options.length < 2) {
        throw new Error('MCQ questions require at least 2 options')
      }
      const hasCorrect = params.options.some(o => o.isCorrect)
      if (!hasCorrect) {
        throw new Error('MCQ questions must have one correct answer')
      }
    }

    if (params.type === QuestionType.TRUE_FALSE &&
      params.tfCorrectAnswer === undefined) {
      throw new Error('True/False questions require a correct answer')
    }

    if (params.type === QuestionType.DESCRIPTIVE && !params.modelAnswer) {
      throw new Error('Descriptive questions require a model answer')
    }

    const question = await db.quizQuestion.create({
      data: {
        quizId: params.quizId,
        questionText: params.questionText,
        type: params.type,
        marks: params.marks,
        difficulty: params.difficulty,
        topic: params.topic,
        orderIndex: params.orderIndex ?? 0,
        tfCorrectAnswer: params.tfCorrectAnswer,
        modelAnswer: params.modelAnswer,
        wordLimit: params.wordLimit,
        options: params.options
          ? { create: params.options }
          : undefined,
      },
      include: {
        options: { orderBy: { orderIndex: 'asc' } },
      },
    })

    if (params.quizId) {
      const totalMarks = await db.quizQuestion.aggregate({
        where: { quizId: params.quizId },
        _sum: { marks: true },
      })
      await db.lmsQuiz.update({
        where: { id: params.quizId },
        data: { totalMarks: totalMarks._sum.marks ?? 0 },
      })
    }

    await logAuditAction({
      superAdminId: params.adminId,
      action: AuditAction.QUESTION_CREATED,
      targetType: 'quiz_question',
      targetId: question.id,
      targetName: question.questionText.slice(0, 50),
      details: { type: params.type } as Prisma.InputJsonValue,
    })

    return question
  },

  async updateQuestion(params: {
    id: string
    data: Partial<{
      questionText: string
      marks: number
      difficulty: Difficulty
      topic: string
      tfCorrectAnswer: boolean
      modelAnswer: string
      wordLimit: number
    }>
    adminId: string
  }) {
    const existing = await db.quizQuestion.findUnique({
      where: { id: params.id },
    })
    if (!existing) throw new Error('Question not found')

    const updated = await db.quizQuestion.update({
      where: { id: params.id },
      data: params.data,
      include: { options: { orderBy: { orderIndex: 'asc' } } },
    })

    await logAuditAction({
      superAdminId: params.adminId,
      action: AuditAction.QUESTION_UPDATED,
      targetType: 'quiz_question',
      targetId: params.id,
      targetName: existing.questionText.slice(0, 50),
      details: { changes: params.data } as Prisma.InputJsonValue,
    })

    return updated
  },

  async addQuestionToQuiz(quizId: string, questionId: string) {
    const quiz = await db.lmsQuiz.findUnique({ where: { id: quizId } })
    if (!quiz) throw new Error('Quiz not found')

    const question = await db.quizQuestion.findUnique({
      where: { id: questionId },
    })
    if (!question) throw new Error('Question not found')

    const orderIndex = await db.quizQuestion.count({ where: { quizId } })

    const updated = await db.quizQuestion.update({
      where: { id: questionId },
      data: { quizId, orderIndex },
    })

    const totalMarks = await db.quizQuestion.aggregate({
      where: { quizId },
      _sum: { marks: true },
    })
    await db.lmsQuiz.update({
      where: { id: quizId },
      data: { totalMarks: totalMarks._sum.marks ?? 0 },
    })

    return updated
  },

  // ─── CERTIFICATE TEMPLATES ─────────────────────────────

  async listCertificateTemplates() {
    return db.certificateTemplate.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { courses: true } },
      },
    })
  },

  async createCertificateTemplate(params: {
    name: string
    layout: CertLayout
    titleText: string
    bodyText: string
    signatory?: string
    designation?: string
    bgColor: string
    isDefault: boolean
    adminId: string
  }) {
    if (params.isDefault) {
      await db.certificateTemplate.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      })
    }

    const template = await db.certificateTemplate.create({
      data: {
        name: params.name,
        layout: params.layout,
        titleText: params.titleText,
        bodyText: params.bodyText,
        signatory: params.signatory,
        designation: params.designation,
        bgColor: params.bgColor,
        isDefault: params.isDefault,
      },
    })

    await logAuditAction({
      superAdminId: params.adminId,
      action: AuditAction.CERT_TEMPLATE_CREATED,
      targetType: 'certificate_template',
      targetId: template.id,
      targetName: template.name,
    })

    return template
  },

  async updateCertificateTemplate(params: {
    id: string
    data: Partial<{
      name: string
      layout: CertLayout
      titleText: string
      bodyText: string
      signatory: string
      designation: string
      bgColor: string
      isDefault: boolean
    }>
    adminId: string
  }) {
    const existing = await db.certificateTemplate.findUnique({
      where: { id: params.id },
    })
    if (!existing) throw new Error('Certificate template not found')

    if (params.data.isDefault) {
      await db.certificateTemplate.updateMany({
        where: { isDefault: true, id: { not: params.id } },
        data: { isDefault: false },
      })
    }

    const updated = await db.certificateTemplate.update({
      where: { id: params.id },
      data: params.data,
    })

    await logAuditAction({
      superAdminId: params.adminId,
      action: AuditAction.CERT_TEMPLATE_UPDATED,
      targetType: 'certificate_template',
      targetId: params.id,
      targetName: existing.name,
      details: { changes: params.data } as Prisma.InputJsonValue,
    })

    return updated
  },
}
// ─── LMS Designation methods (appended) ──────────────────────────────────────

export const lmsDesignationService = {

  async listDesignations() {
    return getSuperAdminPrisma().lmsDesignation.findMany({
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      include: {
        _count: { select: { courses: true } },
        courses: {
          include: {
            course: { select: { id: true, title: true, status: true } },
          },
        },
      },
    })
  },

  async createDesignation(data: {
    name: string; description?: string; displayOrder?: number
  }) {
    const existing = await getSuperAdminPrisma().lmsDesignation.findFirst({
      where: { name: data.name.trim() },
    })
    if (existing) throw new Error(`Designation "${data.name}" already exists`)
    return getSuperAdminPrisma().lmsDesignation.create({
      data: {
        name:         data.name.trim().toUpperCase(),
        description:  data.description?.trim() ?? null,
        displayOrder: data.displayOrder ?? 0,
      },
    })
  },

  async updateDesignation(id: string, data: {
    name?: string; description?: string; displayOrder?: number; isActive?: boolean
  }) {
    const existing = await getSuperAdminPrisma().lmsDesignation.findUnique({ where: { id } })
    if (!existing) throw new Error('Designation not found')
    return getSuperAdminPrisma().lmsDesignation.update({ where: { id }, data })
  },

  async deleteDesignation(id: string) {
    const db = getSuperAdminPrisma()
    const existing = await db.lmsDesignation.findUnique({
      where:   { id },
      include: { _count: { select: { courses: true } } },
    })
    if (!existing) throw new Error('Designation not found')
    if (existing._count.courses > 0) {
      throw new Error(`Cannot delete: designation is assigned to ${existing._count.courses} course(s)`)
    }
    await db.lmsDesignation.delete({ where: { id } })
    return { success: true }
  },

  // ── Course ↔ Designation targeting ─────────────────────────────────────────

  async setCourseDesignations(courseId: string, targets: Array<{
    designationId: string; isMandatory: boolean
  }>) {
    const db = getSuperAdminPrisma()
    const course = await db.lmsCourse.findUnique({ where: { id: courseId } })
    if (!course) throw new Error('Course not found')

    // Replace strategy
    await db.lmsCourseDesignation.deleteMany({ where: { courseId } })
    if (targets.length > 0) {
      await db.lmsCourseDesignation.createMany({
        data: targets.map(t => ({
          courseId,
          designationId: t.designationId,
          isMandatory:   t.isMandatory,
        })),
      })
    }
    return { courseId, targets: targets.length }
  },

  async getCourseDesignations(courseId: string) {
    return getSuperAdminPrisma().lmsCourseDesignation.findMany({
      where: { courseId },
      include: {
        designation: { select: { id: true, name: true, description: true } },
      },
    })
  },
}