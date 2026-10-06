import { getSuperAdminPrisma, getTenantPrisma } from '@dpdp/database'
import {
  CourseStatus, CourseDifficulty, CourseCategory,
  LessonType, VideoSource, ReadingContentType,
  AssignmentSubmissionType, QuestionType, Difficulty,
  CertLayout, AuditAction, Prisma
} from '@prisma/super-admin-client'
import { parsePagination, buildMeta } from '../../utils/pagination'
import { logAuditAction } from '../../utils/audit-logger'

const db = getSuperAdminPrisma()
// The tenant DB is a single shared Postgres instance (multi-tenancy is by
// tenantId column, not per-tenant databases), so this is a normal query, not
// a cross-database fan-out. Used only for read-only LMS analytics/certificate
// reporting — never for writing tenant operational data from admin-api.
const tenantDb = getTenantPrisma()

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

    // thumbnailUrl stays the stable, persistable URL (the course list card
    // feeds straight into "Edit"); thumbnailPreviewUrl is a signed, display-
    // only counterpart for rendering the <img> — never submit that one back.
    const { getSignedUrl } = await import('../../utils/storage')
    const data = courses.map(c => ({ ...c, thumbnailPreviewUrl: getSignedUrl(c.thumbnailUrl) }))

    return { data, meta: buildMeta(total, page, limit) }
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

    // Same stable-vs-preview split as listCourses, extended to each lesson's
    // uploaded file. CourseForm reads the stable fields into editable state
    // and resubmits them on save — signing those in place would eventually
    // persist an expiring SAS URL into the database.
    const { getSignedUrl } = await import('../../utils/storage')
    return {
      ...course,
      thumbnailPreviewUrl: getSignedUrl(course.thumbnailUrl),
      sections: course.sections.map(section => ({
        ...section,
        lessons: section.lessons.map(lesson => ({
          ...lesson,
          videoPreviewUrl: lesson.type === 'VIDEO' ? getSignedUrl(lesson.videoUrl) : null,
          readingPreviewUrl: lesson.type === 'READING' && lesson.readingContentType === 'FILE' ? getSignedUrl(lesson.readingContent) : null,
        })),
      })),
    }
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
          const lessonData = {
            title: item.title,
            description: item.desc || item.description || null,
            type: lessonType,
            orderIndex: j,
            videoSource: lessonType === 'VIDEO' ? (item.videoSource as VideoSource ?? null) : null,
            videoUrl: lessonType === 'VIDEO' ? (item.videoUrl ?? null) : null,
            videoDurationS: lessonType === 'VIDEO' ? (item.videoDurationS ?? null) : null,
            readingContentType: lessonType === 'READING' ? (item.readingContentType as ReadingContentType ?? null) : null,
            readingContent: lessonType === 'READING' ? (item.readingContent ?? null) : null,
            assignmentInstructions: lessonType === 'ASSIGNMENT' ? (item.assignmentInstructions ?? null) : null,
            assignmentSubmissionType: lessonType === 'ASSIGNMENT' ? (item.assignmentSubmissionType as AssignmentSubmissionType ?? null) : null,
          };
          if (item.id && existingLessons.find(l => l.id === item.id)) {
            await tx.lmsLesson.update({
              where: { id: item.id },
              data: lessonData
            });
          } else {
            await tx.lmsLesson.create({
              data: { sectionId, ...lessonData }
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
        
        const isUuid = (id: unknown): id is string =>
          typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

        for (let k = 0; k < quizPayload.questions.length; k++) {
            const qPayload = quizPayload.questions[k];
            const qType = qPayload.type === 'True-False' || qPayload.type === 'TRUE_FALSE' ? 'TRUE_FALSE' : qPayload.type.toUpperCase().replace('-', '_') as QuestionType;
            const qDiff = qPayload.difficulty.toUpperCase() as Difficulty;

            const baseData = {
                questionText: qPayload.text,
                type: qType,
                marks: qPayload.marks,
                difficulty: qDiff,
                topic: qPayload.topic || null,
                orderIndex: k,
                tfCorrectAnswer: qType === QuestionType.TRUE_FALSE ? (qPayload.tfCorrectAnswer ?? null) : null,
                modelAnswer: qType === QuestionType.DESCRIPTIVE ? (qPayload.modelAnswer ?? null) : null,
                wordLimit: qType === QuestionType.DESCRIPTIVE ? (qPayload.wordLimit ?? null) : null,
            };

            // Question may already exist either attached to this quiz, or elsewhere
            // (reused from the question bank via "Add from Question Bank") — only
            // look it up globally when the id is a real UUID, never a client-side
            // temp id for a not-yet-persisted question.
            const existingInQuiz = qPayload.id ? existingQuestions.find(q => q.id === qPayload.id) : undefined;
            const existingAnywhere = existingInQuiz
              ?? (isUuid(qPayload.id) ? await tx.quizQuestion.findUnique({ where: { id: qPayload.id } }) : null);

            if (existingAnywhere) {
                await tx.quizQuestion.update({
                    where: { id: existingAnywhere.id },
                    data: { ...baseData, quizId }
                });
                if (qType === QuestionType.MCQ && qPayload.options) {
                    await tx.questionOption.deleteMany({ where: { questionId: existingAnywhere.id } });
                    await tx.questionOption.createMany({
                        data: qPayload.options.map((o: any, i: number) => ({
                            questionId: existingAnywhere.id,
                            optionText: o.optionText,
                            isCorrect:  !!o.isCorrect,
                            orderIndex: o.orderIndex ?? i,
                        })),
                    });
                }
            } else {
                await tx.quizQuestion.create({
                    data: {
                        quizId,
                        ...baseData,
                        options: qType === QuestionType.MCQ && qPayload.options
                          ? { create: qPayload.options.map((o: any, i: number) => ({
                              optionText: o.optionText, isCorrect: !!o.isCorrect, orderIndex: o.orderIndex ?? i,
                            })) }
                          : undefined,
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

  // Hard delete — only ever safe for a DRAFT course nobody has enrolled in
  // yet. Anything PUBLISHED (or with even one enrollment) must be archived
  // instead: tenants may already hold enrollments, progress, quiz attempts,
  // or issued certificates that reference this course, and hard-deleting it
  // would orphan that history. Cascading FKs (sections → lessons → quiz →
  // questions → options, course designations) handle the actual cleanup.
  async deleteCourse(id: string, adminId: string) {
    const existing = await db.lmsCourse.findUnique({ where: { id } })
    if (!existing) throw new Error('Course not found')

    if (existing.status !== CourseStatus.DRAFT) {
      throw new Error('Only draft courses can be deleted — archive this course instead to remove it from catalogs while keeping its history.')
    }

    const enrollmentCount = await tenantDb.lmsEnrollment.count({ where: { courseId: id } })
    if (enrollmentCount > 0) {
      throw new Error(`Cannot delete: ${enrollmentCount} tenant enrollment(s) already reference this course. Archive it instead.`)
    }

    await db.lmsCourse.delete({ where: { id } })

    await logAuditAction({
      superAdminId: adminId,
      action: AuditAction.COURSE_ARCHIVED,
      targetType: 'lms_course',
      targetId: id,
      targetName: existing.title,
      details: { hardDeleted: true } as Prisma.InputJsonValue,
    })

    return { message: 'Course deleted' }
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

  async deleteQuestion(id: string, adminId: string) {
    const existing = await db.quizQuestion.findUnique({ where: { id } })
    if (!existing) throw new Error('Question not found')

    await db.quizQuestion.delete({ where: { id } })

    if (existing.quizId) {
      const totalMarks = await db.quizQuestion.aggregate({
        where: { quizId: existing.quizId },
        _sum: { marks: true },
      })
      await db.lmsQuiz.update({
        where: { id: existing.quizId },
        data: { totalMarks: totalMarks._sum.marks ?? 0 },
      })
    }

    await logAuditAction({
      superAdminId: adminId,
      action: AuditAction.QUESTION_ARCHIVED,
      targetType: 'quiz_question',
      targetId: id,
      targetName: existing.questionText.slice(0, 50),
    })

    return { message: 'Question deleted' }
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

// ─── LMS Course ↔ Portal Role targeting ──────────────────────────────────────
// Independent axis from designations — targets a course at the platform's own
// permission role (CEO/CO/IT_ADMIN/INTERNAL_AUDITOR/EXTERNAL_AUDITOR), for
// "how do I use this portal" content where relevance follows the tenant role
// a learner holds in this software, not their real-world job title.

export const lmsCoursePortalRoleService = {
  async getCoursePortalRoles(courseId: string) {
    return getSuperAdminPrisma().lmsCoursePortalRole.findMany({
      where: { courseId },
      orderBy: { portalRole: 'asc' },
    })
  },

  async setCoursePortalRoles(courseId: string, targets: Array<{
    portalRole: string; isMandatory: boolean
  }>) {
    const db = getSuperAdminPrisma()
    const course = await db.lmsCourse.findUnique({ where: { id: courseId } })
    if (!course) throw new Error('Course not found')

    // Replace strategy, same as setCourseDesignations
    await db.lmsCoursePortalRole.deleteMany({ where: { courseId } })
    if (targets.length > 0) {
      await db.lmsCoursePortalRole.createMany({
        data: targets.map(t => ({
          courseId,
          portalRole:  t.portalRole,
          isMandatory: t.isMandatory,
        })),
      })
    }
    return { courseId, targets: targets.length }
  },
}

// ─── LMS Analytics & Certificate Log (reads the shared tenant DB) ────────────

export const lmsAnalyticsService = {

  async getAnalytics() {
    const [publishedCourses, allEnrollments, allAttempts] = await Promise.all([
      db.lmsCourse.findMany({
        where:  { status: CourseStatus.PUBLISHED },
        select: { id: true, title: true, estimatedHours: true, estimatedMinutes: true },
      }),
      tenantDb.lmsEnrollment.findMany({ select: { id: true, courseId: true, isCompleted: true, enrolledAt: true } }),
      tenantDb.quizAttempt.findMany({ where: { completedAt: { not: null } }, select: { score: true } }),
    ])

    const totalEnrollments = allEnrollments.length
    const totalCompletions = allEnrollments.filter(e => e.isCompleted).length
    const avgQuizScore = allAttempts.length > 0
      ? Math.round(allAttempts.reduce((s, a) => s + a.score, 0) / allAttempts.length)
      : 0

    const now = new Date()
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
      return { key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleString('en-US', { month: 'short' }) }
    })
    const trend = months.map(m => ({
      month: m.label,
      enrollments: allEnrollments.filter(e => {
        const d = e.enrolledAt
        return `${d.getFullYear()}-${d.getMonth()}` === m.key
      }).length,
    }))

    const perCourse = publishedCourses.map(c => {
      const courseEnrollments = allEnrollments.filter(e => e.courseId === c.id)
      const completions = courseEnrollments.filter(e => e.isCompleted).length
      return {
        courseId:    c.id,
        title:       c.title,
        duration:    `${c.estimatedHours}h ${c.estimatedMinutes}m`,
        enrollments: courseEnrollments.length,
        completions,
      }
    })

    return {
      totals: { enrollments: totalEnrollments, completions: totalCompletions, avgQuizScore },
      trend,
      perCourse,
    }
  },

  async getIssuedCertificates() {
    const issued = await tenantDb.issuedCertificate.findMany({ orderBy: { issuedAt: 'desc' }, take: 200 })
    if (issued.length === 0) return []

    const [users, tenants, courses] = await Promise.all([
      tenantDb.user.findMany({
        where:  { id: { in: [...new Set(issued.map(i => i.userId))] } },
        select: { id: true, name: true },
      }),
      db.tenant.findMany({
        where:  { id: { in: [...new Set(issued.map(i => i.tenantId))] } },
        select: { id: true, name: true },
      }),
      db.lmsCourse.findMany({
        where:  { id: { in: [...new Set(issued.map(i => i.courseId))] } },
        select: { id: true, title: true },
      }),
    ])
    const userMap   = new Map(users.map(u => [u.id, u]))
    const tenantMap = new Map(tenants.map(t => [t.id, t]))
    const courseMap = new Map(courses.map(c => [c.id, c]))

    return issued.map(cert => ({
      id:               cert.id,
      certificateCode:  cert.certificateCode,
      learnerName:      userMap.get(cert.userId)?.name ?? 'Unknown',
      organizationName: tenantMap.get(cert.tenantId)?.name ?? 'Unknown',
      courseTitle:      courseMap.get(cert.courseId)?.title ?? 'Unknown',
      issuedAt:         cert.issuedAt,
      isRevoked:        cert.isRevoked,
    }))
  },

  async revokeCertificate(id: string, reason: string, adminId: string) {
    const existing = await tenantDb.issuedCertificate.findUnique({ where: { id } })
    if (!existing) throw new Error('Certificate not found')
    if (existing.isRevoked) throw new Error('Certificate already revoked')

    const updated = await tenantDb.issuedCertificate.update({
      where: { id },
      data:  { isRevoked: true, revokedAt: new Date(), revocationReason: reason },
    })

    await logAuditAction({
      superAdminId: adminId,
      action: AuditAction.CERT_TEMPLATE_UPDATED,
      targetType: 'issued_certificate',
      targetId: id,
      targetName: existing.certificateCode,
      details: { revoked: true, reason } as Prisma.InputJsonValue,
    })

    return updated
  },
}