// Seeds realistic, DPDP-compliance-relevant demo content into the LMS module
// so the module can be tested end-to-end without hand-building a course
// through the UI. Idempotent-ish: re-running updates rather than duplicating
// the courses/certificate template (matched by title/name), but always
// replaces their content on each run so it stays in sync with this file.
//
// Run with: npm run seed:lms-demo --workspace=@dpdp/database

import { getSuperAdminPrisma } from '../index'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const db = getSuperAdminPrisma()

async function upsertCertificateTemplate() {
  const existing = await db.certificateTemplate.findFirst({ where: { name: 'DPDP Compliance Certificate' } })
  const data = {
    name: 'DPDP Compliance Certificate',
    layout: 'CLASSIC' as const,
    titleText: 'Certificate of Completion',
    bodyText: 'This is to certify that {learner_name} has successfully completed {course_name}, a compliance training course under the Digital Personal Data Protection Act, 2023, on {completion_date}.',
    signatory: 'Ananya Krishnan',
    designation: 'Head of Compliance, NiyamSaathi',
    bgColor: '#FFFFFF',
    isDefault: true,
  }
  if (existing) {
    return db.certificateTemplate.update({ where: { id: existing.id }, data })
  }
  return db.certificateTemplate.create({ data })
}

async function upsertCourse(input: {
  title: string; description: string
  category: 'DPDP_COMPLIANCE' | 'PORTAL_USAGE' | 'ROLE_SPECIFIC' | 'GENERAL'
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
  estimatedHours: number; estimatedMinutes: number
  certificateTemplateId?: string
  mandatoryForDesignations?: string[]
  mandatoryForPortalRoles?: string[]
  sections: Array<{
    title: string; description?: string
    lessons: Array<{
      title: string; description?: string; type: 'VIDEO' | 'READING' | 'ASSIGNMENT'
      videoSource?: 'UPLOAD' | 'EMBED'; videoUrl?: string; videoDurationS?: number
      readingContentType?: 'RICH_TEXT' | 'FILE'; readingContent?: string
      assignmentInstructions?: string; assignmentSubmissionType?: 'TEXT_RESPONSE' | 'FILE_UPLOAD' | 'BOTH'
    }>
    quiz?: {
      title: string; passThreshold: number; timeLimitMins?: number
      questions: Array<{
        questionText: string; type: 'MCQ' | 'TRUE_FALSE' | 'DESCRIPTIVE'; marks: number
        difficulty: 'EASY' | 'MEDIUM' | 'HARD'; topic?: string
        options?: Array<{ optionText: string; isCorrect: boolean }>
        tfCorrectAnswer?: boolean
        modelAnswer?: string; wordLimit?: number
      }>
    }
  }>
}) {
  const existing = await db.lmsCourse.findFirst({ where: { title: input.title } })

  const course = existing
    ? await db.lmsCourse.update({
        where: { id: existing.id },
        data: {
          description: input.description, category: input.category, difficulty: input.difficulty,
          estimatedHours: input.estimatedHours, estimatedMinutes: input.estimatedMinutes,
          status: 'PUBLISHED', certificateTemplateId: input.certificateTemplateId ?? null,
        },
      })
    : await db.lmsCourse.create({
        data: {
          title: input.title, description: input.description, category: input.category, difficulty: input.difficulty,
          estimatedHours: input.estimatedHours, estimatedMinutes: input.estimatedMinutes,
          status: 'PUBLISHED', certificateTemplateId: input.certificateTemplateId ?? null,
        },
      })

  // Replace all content on each run so the seed stays authoritative.
  await db.lmsSection.deleteMany({ where: { courseId: course.id } })

  for (let si = 0; si < input.sections.length; si++) {
    const s = input.sections[si]
    const section = await db.lmsSection.create({
      data: { courseId: course.id, title: s.title, description: s.description, orderIndex: si },
    })

    for (let li = 0; li < s.lessons.length; li++) {
      const l = s.lessons[li]
      await db.lmsLesson.create({
        data: {
          sectionId: section.id, title: l.title, description: l.description, type: l.type, orderIndex: li,
          videoSource: l.videoSource, videoUrl: l.videoUrl, videoDurationS: l.videoDurationS,
          readingContentType: l.readingContentType, readingContent: l.readingContent,
          assignmentInstructions: l.assignmentInstructions, assignmentSubmissionType: l.assignmentSubmissionType,
        },
      })
    }

    if (s.quiz) {
      const totalMarks = s.quiz.questions.reduce((sum, q) => sum + q.marks, 0)
      const quiz = await db.lmsQuiz.create({
        data: {
          sectionId: section.id, title: s.quiz.title, passThreshold: s.quiz.passThreshold,
          timeLimitMins: s.quiz.timeLimitMins, totalMarks,
        },
      })
      for (let qi = 0; qi < s.quiz.questions.length; qi++) {
        const q = s.quiz.questions[qi]
        await db.quizQuestion.create({
          data: {
            quizId: quiz.id, questionText: q.questionText, type: q.type, marks: q.marks,
            difficulty: q.difficulty, topic: q.topic, orderIndex: qi,
            tfCorrectAnswer: q.tfCorrectAnswer, modelAnswer: q.modelAnswer, wordLimit: q.wordLimit,
            options: q.options ? { create: q.options.map((o, oi) => ({ ...o, orderIndex: oi })) } : undefined,
          },
        })
      }
    }
  }

  // Designation targeting (mandatory)
  await db.lmsCourseDesignation.deleteMany({ where: { courseId: course.id } })
  if (input.mandatoryForDesignations && input.mandatoryForDesignations.length > 0) {
    const designations = await db.lmsDesignation.findMany({ where: { name: { in: input.mandatoryForDesignations } } })
    if (designations.length > 0) {
      await db.lmsCourseDesignation.createMany({
        data: designations.map(d => ({ courseId: course.id, designationId: d.id, isMandatory: true })),
      })
    }
  }

  // Portal-role targeting (mandatory) — independent axis from designation,
  // for "how to use this portal" content tied to the learner's platform role.
  await db.lmsCoursePortalRole.deleteMany({ where: { courseId: course.id } })
  if (input.mandatoryForPortalRoles && input.mandatoryForPortalRoles.length > 0) {
    await db.lmsCoursePortalRole.createMany({
      data: input.mandatoryForPortalRoles.map(role => ({ courseId: course.id, portalRole: role, isMandatory: true })),
    })
  }

  return course
}

async function main() {
  console.log('Seeding LMS demo content...')

  const certTemplate = await upsertCertificateTemplate()
  console.log(`Certificate template: ${certTemplate.name}`)

  const allDesignations = (await db.lmsDesignation.findMany()).map(d => d.name)
  console.log(`Targeting all existing designations for the foundations course: ${allDesignations.join(', ')}`)

  // ══════════════════════════════════════════════════════════════════════════
  // CERTIFICATIONS (carry a certificate template)
  // ══════════════════════════════════════════════════════════════════════════

  const course1 = await upsertCourse({
    title: 'DPDP Act 2023: Foundations for Every Employee',
    description: 'A foundational course covering the Digital Personal Data Protection Act, 2023 — what personal data is, the rights of Data Principals, consent, security safeguards, and the obligations every employee has when handling personal data in the course of their work.',
    category: 'DPDP_COMPLIANCE',
    difficulty: 'BEGINNER',
    estimatedHours: 2,
    estimatedMinutes: 30,
    certificateTemplateId: certTemplate.id,
    mandatoryForDesignations: allDesignations,
    sections: [
      {
        title: 'Understanding the DPDP Act, 2023',
        description: 'The core concepts every employee needs to know before handling personal data.',
        lessons: [
          {
            title: 'Introduction to the DPDP Act, 2023',
            description: 'An overview of why India’s Digital Personal Data Protection Act exists and who it applies to.',
            type: 'VIDEO', videoSource: 'EMBED', videoUrl: 'https://www.youtube.com/embed/jNQXAC9IVRw', videoDurationS: 480,
          },
          {
            title: 'What Counts as Personal Data',
            type: 'READING', readingContentType: 'RICH_TEXT',
            readingContent:
              'Personal data under the DPDP Act, 2023 is any data about an individual (the "Data Principal") who is identifiable by or in relation to that data.\n\n' +
              'Common examples you may encounter in your daily work include:\n' +
              '- Names, phone numbers, and email addresses of customers or employees\n' +
              '- Government ID numbers such as Aadhaar or PAN\n' +
              '- Financial details like bank account or card numbers\n' +
              '- Health records and biometric data\n' +
              '- Location data and device identifiers\n\n' +
              'The Act applies whenever personal data is processed digitally, or collected in non-digital form and later digitized. Every employee who accesses, stores, or shares personal data as part of their role is expected to understand and follow the organization’s data protection obligations under this Act.\n\n' +
              'Key roles defined by the Act:\n' +
              '- Data Principal: the individual the personal data is about\n' +
              '- Data Fiduciary: the organization that determines the purpose and means of processing (that’s us)\n' +
              '- Data Processor: any entity processing data on behalf of a Data Fiduciary\n\n' +
              'As a Data Fiduciary, our organization is responsible for obtaining valid consent, implementing reasonable security safeguards, and honoring Data Principal rights such as access, correction, and erasure.',
          },
          {
            title: 'Data Handling Self-Assessment',
            type: 'ASSIGNMENT',
            assignmentInstructions:
              'List three types of personal data you handle in your day-to-day role (for example: customer contact details, employee records, vendor payment information), and for each one, briefly describe one safeguard you currently use — or should start using — to protect it.',
            assignmentSubmissionType: 'TEXT_RESPONSE',
          },
        ],
        quiz: {
          title: 'DPDP Act Fundamentals Quiz',
          passThreshold: 70,
          timeLimitMins: 15,
          questions: [
            {
              questionText: 'Under the DPDP Act, 2023, who is referred to as the "Data Principal"?',
              type: 'MCQ', marks: 2, difficulty: 'EASY', topic: 'Key Definitions',
              options: [
                { optionText: 'The individual to whom the personal data relates', isCorrect: true },
                { optionText: 'The organization collecting the data', isCorrect: false },
                { optionText: 'The IT department managing the systems', isCorrect: false },
                { optionText: 'The government regulator overseeing compliance', isCorrect: false },
              ],
            },
            {
              questionText: 'Consent under the DPDP Act must be free, specific, informed, unconditional, and unambiguous.',
              type: 'TRUE_FALSE', marks: 1, difficulty: 'EASY', topic: 'Consent',
              tfCorrectAnswer: true,
            },
            {
              questionText: 'Which of the following is an obligation of a Data Fiduciary under the DPDP Act?',
              type: 'MCQ', marks: 2, difficulty: 'MEDIUM', topic: 'Obligations',
              options: [
                { optionText: 'Implementing reasonable security safeguards to prevent personal data breaches', isCorrect: true },
                { optionText: 'Sharing personal data with third parties without consent when convenient', isCorrect: false },
                { optionText: 'Retaining personal data indefinitely regardless of purpose', isCorrect: false },
                { optionText: 'Ignoring personal data breach notifications if the breach is minor', isCorrect: false },
              ],
            },
            {
              questionText: 'Briefly describe what a Data Principal’s "right to correction and erasure" means in practice, and give one example of when an employee might need to act on such a request.',
              type: 'DESCRIPTIVE', marks: 3, difficulty: 'MEDIUM', topic: 'Data Principal Rights',
              modelAnswer:
                'The right to correction and erasure lets a Data Principal ask the organization to correct inaccurate or outdated personal data, or delete it once it is no longer needed for the purpose it was collected. For example, if a former customer asks for their contact details to be removed after closing their account, the employee handling that request should route it through the organization’s data subject request process rather than deleting or ignoring it informally.',
              wordLimit: 150,
            },
          ],
        },
      },
      {
        title: 'Consent, Notice & Data Principal Rights',
        description: 'How valid consent works, and the rights every Data Principal can exercise.',
        lessons: [
          {
            title: 'How Valid Consent Works Under the DPDP Act',
            description: 'What makes a consent request valid — and what makes it invalid.',
            type: 'VIDEO', videoSource: 'EMBED', videoUrl: 'https://www.youtube.com/embed/jNQXAC9IVRw', videoDurationS: 420,
          },
          {
            title: 'Data Principal Rights You Must Honor',
            type: 'READING', readingContentType: 'RICH_TEXT',
            readingContent:
              'The DPDP Act gives every Data Principal a set of enforceable rights. Understanding them helps you recognize a rights request when one lands on your desk, even informally.\n\n' +
              '- Right to Access Information: a Data Principal can ask for a summary of their personal data being processed, the processing activities involved, and the identities of any Data Processors it has been shared with.\n' +
              '- Right to Correction and Erasure: covered earlier — the right to have inaccurate data fixed or data no longer needed deleted.\n' +
              '- Right to Grievance Redressal: a Data Principal can raise a complaint about how their data is being handled, and the organization must respond within a defined timeline.\n' +
              '- Right to Nominate: a Data Principal can nominate another individual to exercise their rights on their behalf in the event of death or incapacity.\n\n' +
              'Every notice we send when collecting personal data — a signup form, a consent banner, a contract clause — must clearly explain what data is collected, why, and how the Data Principal can exercise these rights. Vague or bundled consent ("I agree to the terms and privacy policy") does not meet this bar on its own; the notice itself must be clear and specific.',
          },
          {
            title: 'Consent Touchpoint Reflection',
            type: 'ASSIGNMENT',
            assignmentInstructions:
              'Think of one moment in your role where a customer, employee, or vendor gives you their personal data (a form, a call, an onboarding step). Describe what consent notice they currently see — or should see — at that moment.',
            assignmentSubmissionType: 'TEXT_RESPONSE',
          },
        ],
        quiz: {
          title: 'Consent & Rights Quiz',
          passThreshold: 70,
          timeLimitMins: 10,
          questions: [
            {
              questionText: 'A consent request bundled into general "terms and conditions" text, without a clear standalone notice, meets the DPDP Act\'s consent requirements.',
              type: 'TRUE_FALSE', marks: 1, difficulty: 'MEDIUM', topic: 'Consent',
              tfCorrectAnswer: false,
            },
            {
              questionText: 'Which right allows a Data Principal to designate someone else to act on their behalf if they pass away or become incapacitated?',
              type: 'MCQ', marks: 2, difficulty: 'MEDIUM', topic: 'Data Principal Rights',
              options: [
                { optionText: 'Right to Nominate', isCorrect: true },
                { optionText: 'Right to Access Information', isCorrect: false },
                { optionText: 'Right to Grievance Redressal', isCorrect: false },
                { optionText: 'Right to Data Portability', isCorrect: false },
              ],
            },
            {
              questionText: 'What must a valid consent notice clearly explain to the Data Principal?',
              type: 'MCQ', marks: 2, difficulty: 'EASY', topic: 'Consent',
              options: [
                { optionText: 'What data is collected, why, and how their rights can be exercised', isCorrect: true },
                { optionText: 'Only the name of the organization collecting the data', isCorrect: false },
                { optionText: 'The organization\'s annual revenue', isCorrect: false },
                { optionText: 'Nothing — consent is implied once a form is submitted', isCorrect: false },
              ],
            },
          ],
        },
      },
      {
        title: 'Data Security, Breach Response & Retention',
        description: 'What "reasonable security safeguards" means in practice, and what to do if something goes wrong.',
        lessons: [
          {
            title: 'What to Do If You Suspect a Data Breach',
            description: 'The first steps every employee should take the moment they suspect personal data has been exposed.',
            type: 'VIDEO', videoSource: 'EMBED', videoUrl: 'https://www.youtube.com/embed/jNQXAC9IVRw', videoDurationS: 360,
          },
          {
            title: 'Reasonable Security Safeguards & Data Retention',
            type: 'READING', readingContentType: 'RICH_TEXT',
            readingContent:
              'The DPDP Act requires every Data Fiduciary to implement "reasonable security safeguards" to prevent personal data breaches. In practice, this covers technical measures (access controls, encryption, secure storage) and organizational measures (training like this course, clear internal policies, vendor due diligence).\n\n' +
              'Two practical habits matter most for most employees:\n' +
              '1. Access only the personal data you need for your specific task — not everything you\'re technically able to see.\n' +
              '2. Don\'t retain personal data longer than the purpose for which it was collected requires. If a purpose has been fulfilled and there\'s no other legal reason to keep the data, it should be deleted or anonymized.\n\n' +
              'If you ever suspect personal data has been lost, exposed, or accessed without authorization — even if you\'re not sure — report it immediately to your Compliance Officer or IT Admin rather than waiting to confirm it yourself. The DPDP Act has strict breach-notification timelines, and early reporting is what makes meeting them possible.',
          },
          {
            title: 'Breach Response Reflection',
            type: 'ASSIGNMENT',
            assignmentInstructions:
              'If you noticed a spreadsheet with customer personal data had been accidentally emailed to the wrong external recipient, what would you do in the first hour? Walk through your first three actions.',
            assignmentSubmissionType: 'TEXT_RESPONSE',
          },
        ],
        quiz: {
          title: 'Security & Retention Quiz',
          passThreshold: 70,
          timeLimitMins: 10,
          questions: [
            {
              questionText: 'If you suspect a data breach but aren\'t fully sure, the right move is to wait until you\'ve confirmed it yourself before reporting it.',
              type: 'TRUE_FALSE', marks: 1, difficulty: 'EASY', topic: 'Breach Response',
              tfCorrectAnswer: false,
            },
            {
              questionText: 'Which of these is a practical way an employee applies "reasonable security safeguards" day to day?',
              type: 'MCQ', marks: 2, difficulty: 'EASY', topic: 'Security Safeguards',
              options: [
                { optionText: 'Only accessing the personal data needed for the task at hand', isCorrect: true },
                { optionText: 'Downloading full customer databases for convenience', isCorrect: false },
                { optionText: 'Keeping all data indefinitely in case it\'s useful later', isCorrect: false },
                { optionText: 'Sharing login credentials with teammates to save time', isCorrect: false },
              ],
            },
            {
              questionText: 'Personal data should generally be retained only as long as the purpose it was collected for requires.',
              type: 'TRUE_FALSE', marks: 1, difficulty: 'EASY', topic: 'Data Retention',
              tfCorrectAnswer: true,
            },
          ],
        },
      },
    ],
  })
  console.log(`Course: ${course1.title} (mandatory for: ${allDesignations.join(', ') || 'none'})`)

  const course2 = await upsertCourse({
    title: 'Data Protection Officer Essentials: DPDP Act Deep Dive',
    description: 'An in-depth course for Data Protection Officers and privacy leads, covering breach response, Data Protection Impact Assessments, Significant Data Fiduciary duties, and how to engage with the Data Protection Board of India.',
    category: 'DPDP_COMPLIANCE',
    difficulty: 'INTERMEDIATE',
    estimatedHours: 3,
    estimatedMinutes: 30,
    certificateTemplateId: certTemplate.id,
    mandatoryForDesignations: ['DPO', 'CISO', 'CPO'],
    sections: [
      {
        title: 'Breach Response & Notification',
        description: 'What to do when personal data is compromised, from detection to notification.',
        lessons: [
          {
            title: 'Personal Data Breach Notification Requirements',
            description: 'Timelines and content requirements for notifying the Data Protection Board and affected Data Principals.',
            type: 'VIDEO', videoSource: 'EMBED', videoUrl: 'https://www.youtube.com/embed/jNQXAC9IVRw', videoDurationS: 600,
          },
          {
            title: 'Breach Response Playbook: The First 72 Hours',
            type: 'READING', readingContentType: 'RICH_TEXT',
            readingContent:
              'The first 72 hours after a suspected breach shape everything that follows — both the regulatory outcome and how well affected Data Principals are protected.\n\n' +
              'A practical playbook:\n' +
              '1. Contain: work with IT Admin to stop ongoing exposure (revoke access, isolate systems, rotate credentials) before anything else.\n' +
              '2. Assess: determine what personal data was involved, how many Data Principals are affected, and whether the exposure is ongoing or contained.\n' +
              '3. Document: keep a timestamped log of what was discovered, when, and every action taken — this record is what regulators and auditors will expect to see.\n' +
              '4. Notify: prepare the Data Protection Board notification and, where required, direct notification to affected Data Principals, within the Act\'s prescribed timelines.\n' +
              '5. Remediate: once contained, address the root cause so the same exposure can\'t recur.\n\n' +
              'As DPO, you typically own steps 3 and 4 directly, and coordinate steps 1, 2, and 5 with IT Admin and the relevant department.',
          },
        ],
        quiz: {
          title: 'Breach Response Quiz',
          passThreshold: 75,
          timeLimitMins: 15,
          questions: [
            {
              questionText: 'Which of the following best describes the purpose of a personal data breach notification?',
              type: 'MCQ', marks: 2, difficulty: 'MEDIUM', topic: 'Breach Response',
              options: [
                { optionText: 'To inform the Data Protection Board and affected Data Principals so they can take protective action', isCorrect: true },
                { optionText: 'To satisfy an internal marketing requirement', isCorrect: false },
                { optionText: 'To transfer legal liability entirely to the Data Processor', isCorrect: false },
                { optionText: 'To avoid having to fix the underlying security issue', isCorrect: false },
              ],
            },
            {
              questionText: 'Containing the breach should happen before detailed documentation begins, since ongoing exposure is the most urgent risk.',
              type: 'TRUE_FALSE', marks: 1, difficulty: 'MEDIUM', topic: 'Breach Response',
              tfCorrectAnswer: true,
            },
            {
              questionText: 'As DPO, describe why a timestamped incident log matters even if the breach turns out to be minor.',
              type: 'DESCRIPTIVE', marks: 3, difficulty: 'MEDIUM', topic: 'Breach Response',
              modelAnswer: 'A timestamped log creates an auditable record showing the organization detected, assessed, and responded diligently — which matters for regulatory defensibility even if the breach itself was minor, and is often the first thing the Data Protection Board or an auditor will ask to see.',
              wordLimit: 120,
            },
          ],
        },
      },
      {
        title: 'Data Protection Impact Assessments & Significant Data Fiduciary Duties',
        description: 'When a DPIA is required, what it must cover, and the extra obligations that apply to Significant Data Fiduciaries.',
        lessons: [
          {
            title: 'Conducting a Data Protection Impact Assessment (DPIA)',
            type: 'READING', readingContentType: 'RICH_TEXT',
            readingContent:
              'Significant Data Fiduciaries are expected to conduct a Data Protection Impact Assessment (DPIA) before undertaking high-risk processing activities.\n\n' +
              'A thorough DPIA should cover:\n' +
              '1. A description of the processing activity and its purpose\n' +
              '2. An assessment of necessity and proportionality relative to that purpose\n' +
              '3. Identification of risks to the rights of Data Principals\n' +
              '4. Measures proposed to mitigate identified risks\n\n' +
              'DPIAs should be reviewed periodically and whenever the nature, scope, or purpose of a processing activity changes materially. As DPO, you are responsible for ensuring DPIAs are completed before new high-risk data processing systems go live, and for maintaining an auditable record of each assessment.',
          },
          {
            title: 'What Makes an Organization a "Significant Data Fiduciary"',
            type: 'READING', readingContentType: 'RICH_TEXT',
            readingContent:
              'The Data Protection Board can notify certain Data Fiduciaries as "Significant," based on factors like the volume and sensitivity of personal data processed, risk to Data Principal rights, and potential impact on India\'s sovereignty or electoral integrity.\n\n' +
              'Significant Data Fiduciaries carry extra obligations beyond the baseline every Data Fiduciary must meet:\n' +
              '- Appointing a Data Protection Officer based in India, who reports to the highest levels of leadership\n' +
              '- Appointing an independent data auditor to evaluate compliance\n' +
              '- Conducting periodic DPIAs and independent audits\n' +
              '- Additional obligations around algorithmic and data processing transparency\n\n' +
              'Part of your role as DPO is tracking whether the organization\'s processing activities are approaching a scale or sensitivity where this classification becomes likely, so leadership isn\'t caught off guard.',
          },
          {
            title: 'Draft a Mini DPIA',
            type: 'ASSIGNMENT',
            assignmentInstructions:
              'Pick one processing activity in your organization that feels higher-risk (e.g., biometric attendance, customer behavioral tracking, health data). In 3-4 sentences, sketch a mini DPIA: purpose, key risk to Data Principals, and one mitigation.',
            assignmentSubmissionType: 'TEXT_RESPONSE',
          },
        ],
        quiz: {
          title: 'DPIA & Significant Data Fiduciary Duties Quiz',
          passThreshold: 75,
          timeLimitMins: 15,
          questions: [
            {
              questionText: 'A Significant Data Fiduciary should conduct a DPIA before undertaking high-risk personal data processing.',
              type: 'TRUE_FALSE', marks: 1, difficulty: 'EASY', topic: 'DPIA',
              tfCorrectAnswer: true,
            },
            {
              questionText: 'Which of these is an extra obligation that applies specifically to Significant Data Fiduciaries?',
              type: 'MCQ', marks: 2, difficulty: 'MEDIUM', topic: 'Significant Data Fiduciary',
              options: [
                { optionText: 'Appointing an independent data auditor', isCorrect: true },
                { optionText: 'Collecting personal data without consent', isCorrect: false },
                { optionText: 'Skipping breach notifications for minor incidents', isCorrect: false },
                { optionText: 'Avoiding DPIAs to save time', isCorrect: false },
              ],
            },
            {
              questionText: 'A DPIA only needs to be done once, at the time a processing system first launches, and never revisited.',
              type: 'TRUE_FALSE', marks: 1, difficulty: 'MEDIUM', topic: 'DPIA',
              tfCorrectAnswer: false,
            },
          ],
        },
      },
      {
        title: 'Working with the Data Protection Board & Cross-Border Transfers',
        description: 'Regulatory engagement and how the Act treats personal data leaving India.',
        lessons: [
          {
            title: 'Engaging with the Data Protection Board of India',
            type: 'READING', readingContentType: 'RICH_TEXT',
            readingContent:
              'The Data Protection Board of India is the regulatory body established under the Act to enforce compliance, receive breach notifications, and adjudicate Data Principal grievances that aren\'t resolved by the organization directly.\n\n' +
              'As DPO, your points of contact with the Board typically include:\n' +
              '- Filing breach notifications within the required timelines\n' +
              '- Responding to Board inquiries about processing activities or complaints escalated to it\n' +
              '- Providing records (DPIAs, audit reports, consent logs) if requested during an inquiry\n\n' +
              'The Board can impose significant financial penalties for non-compliance, so timely, complete, and well-documented responses are far better than delayed or defensive ones. Treat every Board interaction as an opportunity to demonstrate the organization takes its obligations seriously.',
          },
          {
            title: 'Cross-Border Data Transfers Under the DPDP Act',
            type: 'READING', readingContentType: 'RICH_TEXT',
            readingContent:
              'The DPDP Act allows personal data to be transferred outside India by default, except to countries the Central Government specifically restricts. This is a notably more permissive approach than many other privacy laws, but it doesn\'t remove your due-diligence responsibility.\n\n' +
              'Practical considerations before any cross-border transfer:\n' +
              '- Confirm the destination country isn\'t on a government-restricted list (this can change, so it\'s worth checking periodically, not just once).\n' +
              '- Ensure a Data Processing Agreement is in place with any overseas vendor or processor, with clear obligations mirroring what the Act requires domestically.\n' +
              '- Sector-specific laws (e.g., certain financial or health data rules) may impose stricter localization requirements than the DPDP Act itself — those still apply.\n\n' +
              'When in doubt about a new vendor or system that involves data leaving India, flag it for legal review before onboarding rather than after.',
          },
          {
            title: 'Regulatory Engagement Checklist',
            type: 'ASSIGNMENT',
            assignmentInstructions:
              'Draft a short checklist (4-5 items) of what you would gather before responding to a Data Protection Board inquiry about one of your organization\'s processing activities.',
            assignmentSubmissionType: 'TEXT_RESPONSE',
          },
        ],
        quiz: {
          title: 'Governance & Transfers Quiz',
          passThreshold: 75,
          timeLimitMins: 15,
          questions: [
            {
              questionText: 'Under the DPDP Act, cross-border data transfer is restricted by default and only allowed to a specific approved list of countries.',
              type: 'TRUE_FALSE', marks: 1, difficulty: 'MEDIUM', topic: 'Cross-Border Transfers',
              tfCorrectAnswer: false,
            },
            {
              questionText: 'What is generally the best approach when responding to a Data Protection Board inquiry?',
              type: 'MCQ', marks: 2, difficulty: 'EASY', topic: 'Regulatory Engagement',
              options: [
                { optionText: 'Respond promptly with complete, well-documented information', isCorrect: true },
                { optionText: 'Delay the response as long as possible', isCorrect: false },
                { optionText: 'Provide only the minimum information legally required, without context', isCorrect: false },
                { optionText: 'Ignore the inquiry unless it is escalated further', isCorrect: false },
              ],
            },
            {
              questionText: 'A Data Processing Agreement with an overseas vendor is unnecessary as long as the destination country isn\'t on a restricted list.',
              type: 'TRUE_FALSE', marks: 1, difficulty: 'MEDIUM', topic: 'Cross-Border Transfers',
              tfCorrectAnswer: false,
            },
          ],
        },
      },
    ],
  })
  console.log(`Course: ${course2.title} (mandatory for: DPO, CISO, CPO)`)

  const course3 = await upsertCourse({
    title: 'Data Principal Rights & Grievance Redressal Under DPDP',
    description: 'A practical course on handling real-world Data Principal requests — access, correction, erasure, and grievances — plus special protections for children\'s data and data belonging to persons with disabilities.',
    category: 'DPDP_COMPLIANCE',
    difficulty: 'INTERMEDIATE',
    estimatedHours: 1,
    estimatedMinutes: 45,
    certificateTemplateId: certTemplate.id,
    mandatoryForDesignations: ['CPO', 'MANAGER'],
    sections: [
      {
        title: 'Handling Data Principal Requests',
        description: 'Turning a rights request into a properly handled, documented response.',
        lessons: [
          {
            title: 'Responding to Data Principal Requests',
            type: 'VIDEO', videoSource: 'EMBED', videoUrl: 'https://www.youtube.com/embed/jNQXAC9IVRw', videoDurationS: 420,
          },
          {
            title: 'The Grievance Redressal Process',
            type: 'READING', readingContentType: 'RICH_TEXT',
            readingContent:
              'A "grievance" under the DPDP Act is any complaint a Data Principal raises about how their personal data is being processed — it can arrive as an email, a support ticket, or even a verbal complaint that someone writes down.\n\n' +
              'A defensible grievance process looks like this:\n' +
              '1. Log it immediately, even if it seems minor — undocumented complaints are the ones that turn into escalations later.\n' +
              '2. Acknowledge receipt to the Data Principal within a short, clearly communicated timeframe.\n' +
              '3. Investigate: identify what data is involved, confirm the request type (access, correction, erasure, or a general complaint), and route it to the right owner.\n' +
              '4. Resolve and respond within the Act\'s required timeline, explaining what was done.\n' +
              '5. If unresolved to the Data Principal\'s satisfaction, they have the right to escalate to the Data Protection Board — so a clear internal record of steps 1-4 matters even after the fact.\n\n' +
              'Treat every grievance as a compliance event worth tracking, not just a customer service ticket.',
          },
          {
            title: 'Mock Grievance Response',
            type: 'ASSIGNMENT',
            assignmentInstructions:
              'A customer emails asking why your organization still has their phone number two years after they closed their account, and asks for it to be deleted. Draft a short response (3-4 sentences) you would send, and note one internal action you\'d take alongside it.',
            assignmentSubmissionType: 'TEXT_RESPONSE',
          },
        ],
        quiz: {
          title: 'Data Principal Rights Quiz',
          passThreshold: 70,
          timeLimitMins: 12,
          questions: [
            {
              questionText: 'A verbal complaint about data handling, even if never put in writing by the Data Principal, should still be logged by the employee who receives it.',
              type: 'TRUE_FALSE', marks: 1, difficulty: 'EASY', topic: 'Grievance Redressal',
              tfCorrectAnswer: true,
            },
            {
              questionText: 'If a Data Principal is unsatisfied with how their grievance was resolved internally, what can they do next?',
              type: 'MCQ', marks: 2, difficulty: 'MEDIUM', topic: 'Grievance Redressal',
              options: [
                { optionText: 'Escalate the complaint to the Data Protection Board', isCorrect: true },
                { optionText: 'Nothing — internal resolution is final', isCorrect: false },
                { optionText: 'They must resubmit through a different organization', isCorrect: false },
                { optionText: 'The Act provides no further recourse', isCorrect: false },
              ],
            },
            {
              questionText: 'Why does keeping a clear internal record of every grievance-handling step matter, even for requests resolved quickly?',
              type: 'DESCRIPTIVE', marks: 3, difficulty: 'MEDIUM', topic: 'Grievance Redressal',
              modelAnswer: 'A clear record demonstrates the organization responded diligently and within required timelines, which matters if the Data Principal later escalates to the Data Protection Board — without documentation, a quick and correct resolution is much harder to prove after the fact.',
              wordLimit: 120,
            },
          ],
        },
      },
      {
        title: 'Special Categories: Children\'s Data & Persons with Disabilities',
        description: 'Extra protections the DPDP Act requires for particularly vulnerable Data Principals.',
        lessons: [
          {
            title: 'Processing Children\'s Personal Data',
            type: 'READING', readingContentType: 'RICH_TEXT',
            readingContent:
              'The DPDP Act treats data belonging to children (under 18) as a special category requiring extra protection.\n\n' +
              'Key obligations when processing a child\'s personal data:\n' +
              '- Verifiable parental or lawful guardian consent is required before processing.\n' +
              '- Behavioral tracking, targeted advertising, and monitoring of children is generally prohibited.\n' +
              '- Processing that could cause detrimental effect to a child\'s wellbeing is not permitted, even with consent.\n\n' +
              'In practice, this means any product, form, or system that might reasonably be used by someone under 18 needs an age-verification step and a clear parental-consent flow before it collects personal data — not an afterthought bolted on later.',
          },
          {
            title: 'Data of Persons with Disabilities',
            type: 'READING', readingContentType: 'RICH_TEXT',
            readingContent:
              'Where a Data Principal has a disability that requires a lawful guardian to act on their behalf, the DPDP Act allows that guardian to exercise consent and rights on the Data Principal\'s behalf — similar in spirit to parental consent for children, but tied to the specific guardianship arrangement rather than an age threshold.\n\n' +
              'If your role involves onboarding or serving customers through a guardian or authorized representative, confirm the guardianship is properly documented before treating their consent as valid on the Data Principal\'s behalf, and keep that documentation with the consent record.',
          },
          {
            title: 'Identify Special-Category Data in Your Systems',
            type: 'ASSIGNMENT',
            assignmentInstructions:
              'Does any system or process you work with knowingly or potentially collect data belonging to children, or process data on behalf of a Data Principal through a guardian? Describe it briefly, or note "none that I\'m aware of" if that\'s the case.',
            assignmentSubmissionType: 'TEXT_RESPONSE',
          },
        ],
        quiz: {
          title: 'Special Categories Quiz',
          passThreshold: 70,
          timeLimitMins: 10,
          questions: [
            {
              questionText: 'Targeted advertising directed at children is permitted under the DPDP Act as long as parental consent was obtained for the underlying data collection.',
              type: 'TRUE_FALSE', marks: 1, difficulty: 'MEDIUM', topic: 'Children\'s Data',
              tfCorrectAnswer: false,
            },
            {
              questionText: 'Who can validly provide consent for processing a child\'s personal data?',
              type: 'MCQ', marks: 2, difficulty: 'EASY', topic: 'Children\'s Data',
              options: [
                { optionText: 'A parent or lawful guardian', isCorrect: true },
                { optionText: 'The child themselves, regardless of age', isCorrect: false },
                { optionText: 'Any adult present at the time', isCorrect: false },
                { optionText: 'No consent is required for children\'s data', isCorrect: false },
              ],
            },
            {
              questionText: 'When a lawful guardian acts on behalf of a Data Principal with a disability, their guardianship status should be documented alongside the consent record.',
              type: 'TRUE_FALSE', marks: 1, difficulty: 'EASY', topic: 'Persons with Disabilities',
              tfCorrectAnswer: true,
            },
          ],
        },
      },
    ],
  })
  console.log(`Course: ${course3.title} (mandatory for: CPO, MANAGER)`)

  // ══════════════════════════════════════════════════════════════════════════
  // GUIDES (portal-usage — no certificate template, targeted by portal role)
  // ══════════════════════════════════════════════════════════════════════════

  const course4 = await upsertCourse({
    title: 'Getting Started with NiyamSaathi',
    description: 'A quick-start guide to navigating your NiyamSaathi compliance portal — the Dashboard, your role-based access, every module at a glance, and where to go for help.',
    category: 'PORTAL_USAGE',
    difficulty: 'BEGINNER',
    estimatedHours: 0,
    estimatedMinutes: 40,
    mandatoryForPortalRoles: ['CEO', 'CO', 'IT_ADMIN', 'INTERNAL_AUDITOR', 'EXTERNAL_AUDITOR'],
    sections: [
      {
        title: 'Finding Your Way Around',
        description: 'A tour of the portal and what each part of your access covers.',
        lessons: [
          {
            title: 'A Tour of Your Compliance Dashboard',
            type: 'READING', readingContentType: 'RICH_TEXT',
            readingContent:
              'When you log in, the Dashboard is your home base — a single view of where your organization stands on DPDP compliance right now.\n\n' +
              'Here is what each part of the Dashboard tells you:\n' +
              '- Compliance Score: a rolled-up percentage of how compliant your organization is against the regulations you track, with a 7-day trend so you can see whether it is improving or slipping.\n' +
              '- Risk Gauge: your current overall risk level, calculated from open risks in the Risk Analysis module.\n' +
              '- Regulation Compliance: a breakdown, per regulation, of how many controls are Compliant, In Progress, Non-Compliant, or Not Started.\n' +
              '- Department Compliance Overview: which departments are pulling their weight and which need attention — useful for knowing where to focus first.\n' +
              '- LMS Training Completion: how your organization is doing on mandatory certifications and portal onboarding guides like this one.\n' +
              '- Alerts & Recent Activity: anything that needs your attention — overdue tasks, expiring evidence, new assessments assigned to you.\n\n' +
              'Whenever you are not sure where to start on a given day, the Dashboard is the right place to check first.',
          },
          {
            title: 'Understanding Your Role-Based Access',
            type: 'READING', readingContentType: 'RICH_TEXT',
            readingContent:
              'NiyamSaathi gives every user a portal role that determines what you can see and do. Your role is independent of your real-world job title — for example, you might be the Head of IT but hold the "IT Admin" portal role, or be a privacy consultant holding the "External Auditor" role.\n\n' +
              'The five portal roles:\n' +
              '- CEO: full visibility across every module, including Users and organization Settings. Typically the account owner.\n' +
              '- Compliance Officer (CO): manages Controls, Assessments, Risk Analysis, Compliance Tasks, and the LMS — the primary day-to-day compliance driver.\n' +
              '- IT Admin: manages the Assets inventory and uploads Evidence against controls — the technical execution arm of compliance.\n' +
              '- Internal Auditor: reviews Assessments and Evidence from inside the organization, typically ahead of an external audit.\n' +
              '- External Auditor: a restricted, mostly read-only role for an outside auditor reviewing your evidence and assessment history.\n\n' +
              'If a menu item you expect to see is missing, it usually means it is outside your role\'s scope — ask your Compliance Officer if you believe you need broader access.',
          },
          {
            title: 'Explore Your Dashboard',
            type: 'ASSIGNMENT',
            assignmentInstructions:
              'Log into your Dashboard and note: (1) your organization\'s current compliance score, and (2) the department with the lowest compliance percentage. Write one sentence on what action you\'d take first if that department reported to you.',
            assignmentSubmissionType: 'TEXT_RESPONSE',
          },
        ],
        quiz: {
          title: 'Portal Basics Quiz',
          passThreshold: 70,
          timeLimitMins: 10,
          questions: [
            {
              questionText: 'Which module gives you a single rolled-up view of your organization\'s compliance score, risk level, and department performance?',
              type: 'MCQ', marks: 2, difficulty: 'EASY', topic: 'Navigation',
              options: [
                { optionText: 'The Dashboard', isCorrect: true },
                { optionText: 'The Alerts page', isCorrect: false },
                { optionText: 'The Settings page', isCorrect: false },
                { optionText: 'The LMS module', isCorrect: false },
              ],
            },
            {
              questionText: 'A user\'s portal role is always the same as their real-world job title.',
              type: 'TRUE_FALSE', marks: 1, difficulty: 'EASY', topic: 'Roles',
              tfCorrectAnswer: false,
            },
            {
              questionText: 'Which portal role is primarily responsible for managing Controls, Assessments, and the LMS?',
              type: 'MCQ', marks: 2, difficulty: 'EASY', topic: 'Roles',
              options: [
                { optionText: 'Compliance Officer', isCorrect: true },
                { optionText: 'IT Admin', isCorrect: false },
                { optionText: 'External Auditor', isCorrect: false },
                { optionText: 'CEO', isCorrect: false },
              ],
            },
          ],
        },
      },
      {
        title: 'Where to Go Next',
        description: 'A module-by-module map of the portal, and how to get help.',
        lessons: [
          {
            title: 'A Guide to Every Module',
            type: 'READING', readingContentType: 'RICH_TEXT',
            readingContent:
              'Once you\'re comfortable with the Dashboard, here\'s what the rest of the portal is for:\n\n' +
              '- Assets: your inventory of systems, applications, and devices that store or process personal data.\n' +
              '- Controls: the library of compliance controls your organization tracks, each scored and backed by evidence.\n' +
              '- Assessments: structured reviews of your compliance against a specific regulation, control by control.\n' +
              '- Compliance Tasks: action items generated from assessment gaps, assigned to the right owner with a due date.\n' +
              '- Risk Analysis & Risk Reports: your organization\'s tracked risks, their severity, and mitigation status.\n' +
              '- Reports: exportable summaries of compliance status, useful for leadership updates and audits.\n' +
              '- Alerts: time-sensitive notifications — overdue items, expiring evidence, new assignments.\n' +
              '- LMS: this training module — your certifications and portal guides, plus (for COs) team coverage.\n' +
              '- Users & Settings: managing who has access and how your organization\'s account is configured (visible based on your role).\n\n' +
              'You don\'t need to memorize all of this — just knowing it exists makes it much faster to find the right place when you need it.',
          },
          {
            title: 'Getting Help & Escalation Paths',
            type: 'READING', readingContentType: 'RICH_TEXT',
            readingContent:
              'If something in the portal isn\'t working as expected, or you\'re unsure whether you have the right access:\n\n' +
              '- For access or permission questions: contact your organization\'s Compliance Officer or CEO — they manage user roles and designations.\n' +
              '- For a specific compliance question (is this control satisfied? does this count as a breach?): route it to your Compliance Officer rather than guessing.\n' +
              '- For a technical issue with the portal itself: contact your IT Admin first, who can escalate further if needed.\n\n' +
              'When in doubt, it\'s always better to ask than to guess on a compliance matter — the cost of a clarifying question is far lower than the cost of a mishandled data request.',
          },
        ],
        quiz: {
          title: 'Portal Navigation Quiz',
          passThreshold: 70,
          timeLimitMins: 8,
          questions: [
            {
              questionText: 'Which module would you check to see action items generated from gaps found during a compliance assessment?',
              type: 'MCQ', marks: 2, difficulty: 'EASY', topic: 'Navigation',
              options: [
                { optionText: 'Compliance Tasks', isCorrect: true },
                { optionText: 'Users', isCorrect: false },
                { optionText: 'Settings', isCorrect: false },
                { optionText: 'Certificates', isCorrect: false },
              ],
            },
            {
              questionText: 'If you\'re unsure whether something counts as a reportable data breach, the right move is to guess and move on rather than ask.',
              type: 'TRUE_FALSE', marks: 1, difficulty: 'EASY', topic: 'Escalation',
              tfCorrectAnswer: false,
            },
          ],
        },
      },
    ],
  })
  console.log(`Course: ${course4.title} (mandatory for: all portal roles)`)

  const course5 = await upsertCourse({
    title: 'IT Admin Playbook: Managing Assets & Evidence',
    description: 'A practical guide for IT Admins on maintaining the asset inventory, uploading evidence against controls, and keeping third-party suppliers on record in NiyamSaathi.',
    category: 'ROLE_SPECIFIC',
    difficulty: 'BEGINNER',
    estimatedHours: 1,
    estimatedMinutes: 5,
    mandatoryForPortalRoles: ['IT_ADMIN'],
    sections: [
      {
        title: 'Asset Inventory & Evidence Management',
        lessons: [
          {
            title: 'Adding and Classifying Assets',
            type: 'READING', readingContentType: 'RICH_TEXT',
            readingContent:
              'The Assets module is your organization\'s inventory of every system, application, and device that stores or processes personal data — the starting point for almost every compliance obligation under the DPDP Act.\n\n' +
              'When adding a new asset:\n' +
              '1. Record its name, type (database, application, third-party SaaS tool, or physical device), and the department that owns it.\n' +
              '2. Classify what kind of personal data it handles — for example, customer PII, employee records, or financial data. This classification drives which controls apply to it.\n' +
              '3. Assign an owner — the person accountable for that asset\'s compliance status, usually the department head or a designated custodian.\n' +
              '4. Note any third parties involved (e.g., a cloud host or SaaS vendor) so supplier due-diligence obligations are tracked alongside the asset.\n\n' +
              'Keep the inventory current — an asset that is decommissioned but left active in the system will keep showing up in compliance gaps and skew your organization\'s compliance score.',
          },
          {
            title: 'Uploading Evidence Against Controls',
            type: 'READING', readingContentType: 'RICH_TEXT',
            readingContent:
              'Evidence is what turns a claimed control into a verified one. Each control in the Controls Library can have one or more pieces of evidence attached to it — a screenshot, a policy document, a system configuration export, or a signed attestation.\n\n' +
              'Good evidence practice:\n' +
              '- Upload evidence that is specific to the control, not a generic company-wide document — a reviewer should be able to see exactly how it satisfies that control.\n' +
              '- Keep evidence current. Controls that rely on point-in-time evidence (like a configuration screenshot) should be refreshed on the review cycle your Compliance Officer sets.\n' +
              '- Add a short note explaining what the evidence shows if it isn\'t self-explanatory from the file alone.\n' +
              '- If a control cannot be satisfied yet, don\'t upload placeholder evidence — instead flag it so it shows up honestly as Non-Compliant or In Progress until real evidence exists.\n\n' +
              'Auditors — internal or external — will lean on this evidence trail first, so treating it carefully saves everyone time later.',
          },
          {
            title: 'Add a Sample Asset',
            type: 'ASSIGNMENT',
            assignmentInstructions:
              'In the Assets module, add one real asset from your environment (or a representative example) and tag it with its data classification. Note the asset name and the classification you assigned.',
            assignmentSubmissionType: 'TEXT_RESPONSE',
          },
        ],
        quiz: {
          title: 'IT Admin Fundamentals Quiz',
          passThreshold: 70,
          timeLimitMins: 10,
          questions: [
            {
              questionText: 'What should drive which controls apply to a given asset?',
              type: 'MCQ', marks: 2, difficulty: 'EASY', topic: 'Asset Classification',
              options: [
                { optionText: 'The type of personal data it handles', isCorrect: true },
                { optionText: 'The alphabetical order of its name', isCorrect: false },
                { optionText: 'How recently it was added to the inventory', isCorrect: false },
                { optionText: 'The department\'s office location', isCorrect: false },
              ],
            },
            {
              questionText: 'It is acceptable to upload a generic company-wide policy document as evidence for a control-specific requirement, as long as some evidence is attached.',
              type: 'TRUE_FALSE', marks: 1, difficulty: 'MEDIUM', topic: 'Evidence Quality',
              tfCorrectAnswer: false,
            },
            {
              questionText: 'A decommissioned asset left active in the inventory has no effect on your organization\'s compliance score.',
              type: 'TRUE_FALSE', marks: 1, difficulty: 'EASY', topic: 'Asset Hygiene',
              tfCorrectAnswer: false,
            },
          ],
        },
      },
      {
        title: 'Third-Party Suppliers & Ongoing Maintenance',
        description: 'Keeping vendors on record and your inventory audit-ready year-round, not just before an assessment.',
        lessons: [
          {
            title: 'Managing Third-Party Suppliers & Data Processing Agreements',
            type: 'READING', readingContentType: 'RICH_TEXT',
            readingContent:
              'Any vendor that stores or processes personal data on your organization\'s behalf is a Data Processor under the DPDP Act, and needs a Data Processing Agreement (DPA) in place — a contract that sets out their obligations to protect that data.\n\n' +
              'As IT Admin, your part in this usually involves:\n' +
              '- Recording which suppliers are linked to which assets (e.g., which cloud host stores a given database).\n' +
              '- Flagging any supplier without a signed DPA on file — this is a common compliance gap auditors look for first.\n' +
              '- Noting contract renewal or review dates so DPAs don\'t silently lapse.\n\n' +
              'A supplier without a DPA isn\'t just an administrative gap — it means the organization has no contractual assurance the vendor is protecting personal data the way the DPDP Act requires.',
          },
          {
            title: 'Keeping Your Asset Inventory Audit-Ready',
            description: 'A short walkthrough on habits that keep the inventory accurate between formal reviews.',
            type: 'VIDEO', videoSource: 'EMBED', videoUrl: 'https://www.youtube.com/embed/jNQXAC9IVRw', videoDurationS: 300,
          },
          {
            title: 'Supplier Risk Spot-Check',
            type: 'ASSIGNMENT',
            assignmentInstructions:
              'Pick one third-party supplier your organization uses that touches personal data (a cloud host, payroll provider, analytics tool, etc.). Do you know if a DPA is on file for them? Note what you\'d check to confirm.',
            assignmentSubmissionType: 'TEXT_RESPONSE',
          },
        ],
        quiz: {
          title: 'Supplier & Maintenance Quiz',
          passThreshold: 70,
          timeLimitMins: 10,
          questions: [
            {
              questionText: 'A vendor that processes personal data on your organization\'s behalf is considered a Data Processor and needs a Data Processing Agreement.',
              type: 'TRUE_FALSE', marks: 1, difficulty: 'EASY', topic: 'Suppliers',
              tfCorrectAnswer: true,
            },
            {
              questionText: 'What is a common compliance gap auditors specifically look for regarding third-party suppliers?',
              type: 'MCQ', marks: 2, difficulty: 'MEDIUM', topic: 'Suppliers',
              options: [
                { optionText: 'A supplier linked to an asset with no signed DPA on file', isCorrect: true },
                { optionText: 'A supplier with too many contact emails on record', isCorrect: false },
                { optionText: 'A supplier whose name is spelled inconsistently', isCorrect: false },
                { optionText: 'A supplier that has more than one linked asset', isCorrect: false },
              ],
            },
          ],
        },
      },
    ],
  })
  console.log(`Course: ${course5.title} (mandatory for: IT Admin)`)

  const course6 = await upsertCourse({
    title: "Auditor's Guide: Reviewing Assessments & Evidence",
    description: 'A guide for internal and external auditors on how NiyamSaathi structures compliance assessments, how to evaluate evidence quality, and how to pull reports as audit-ready evidence.',
    category: 'ROLE_SPECIFIC',
    difficulty: 'BEGINNER',
    estimatedHours: 1,
    estimatedMinutes: 5,
    mandatoryForPortalRoles: ['INTERNAL_AUDITOR', 'EXTERNAL_AUDITOR'],
    sections: [
      {
        title: 'Conducting Compliance Assessments',
        lessons: [
          {
            title: 'Understanding the Assessment Workflow',
            type: 'READING', readingContentType: 'RICH_TEXT',
            readingContent:
              'An Assessment in NiyamSaathi is a structured review of how well the organization meets a specific regulation — typically the DPDP Act, but the framework supports others too.\n\n' +
              'The workflow you\'ll typically see:\n' +
              '1. An assessment is created against a regulation and scoped to the controls that apply.\n' +
              '2. Each control is scored — Compliant, In Progress, Non-Compliant, or Not Started — based on the evidence attached to it.\n' +
              '3. Gaps identified during scoring generate Compliance Tasks, assigned to the relevant owner, to close out before the assessment can be finalized.\n' +
              '4. Once outstanding tasks are resolved (or formally accepted as residual risk), the assessment is closed and becomes part of the audit trail.\n\n' +
              'As an auditor, you will typically review Assessments after they reach the scoring stage, checking that the score assigned to each control is actually supported by its evidence.',
          },
          {
            title: 'Evaluating Evidence Quality',
            type: 'READING', readingContentType: 'RICH_TEXT',
            readingContent:
              'Not all evidence is equal. When reviewing a control marked Compliant, look for:\n\n' +
              '- Relevance: does the evidence actually demonstrate this specific control, or is it a generic document attached out of convenience?\n' +
              '- Currency: is the evidence recent enough to still be trustworthy, given how often the underlying system or process changes?\n' +
              '- Sufficiency: would a reasonable third party, looking only at this evidence, agree the control is actually in place?\n\n' +
              'Red flags to escalate to the Compliance Officer:\n' +
              '- A control marked Compliant with no evidence attached at all.\n' +
              '- Evidence that is clearly stale (e.g., a configuration screenshot from over a year ago for a control that should be reviewed quarterly).\n' +
              '- The same piece of evidence reused across many unrelated controls.\n\n' +
              'Your job is not to fix these gaps yourself — it\'s to flag them clearly so the accountable owner can close them before the assessment is finalized.',
          },
          {
            title: 'Review an Open Assessment',
            type: 'ASSIGNMENT',
            assignmentInstructions:
              'Open one assessment in your portal (or review a representative example) and note one control where the evidence attached does not fully support its current score. Briefly describe what additional evidence would be needed.',
            assignmentSubmissionType: 'TEXT_RESPONSE',
          },
        ],
        quiz: {
          title: 'Audit Fundamentals Quiz',
          passThreshold: 70,
          timeLimitMins: 10,
          questions: [
            {
              questionText: 'What typically happens when a gap is identified while scoring a control during an assessment?',
              type: 'MCQ', marks: 2, difficulty: 'EASY', topic: 'Assessment Workflow',
              options: [
                { optionText: 'A Compliance Task is generated and assigned to the relevant owner', isCorrect: true },
                { optionText: 'The assessment is deleted', isCorrect: false },
                { optionText: 'The control is automatically marked Compliant', isCorrect: false },
                { optionText: 'Nothing — gaps are only reviewed after closure', isCorrect: false },
              ],
            },
            {
              questionText: 'A control marked Compliant with no evidence attached at all is a red flag worth escalating.',
              type: 'TRUE_FALSE', marks: 1, difficulty: 'EASY', topic: 'Evidence Quality',
              tfCorrectAnswer: true,
            },
            {
              questionText: 'As an auditor, your role when you find an unsupported control score is to fix the gap yourself before continuing your review.',
              type: 'TRUE_FALSE', marks: 1, difficulty: 'MEDIUM', topic: 'Audit Role',
              tfCorrectAnswer: false,
            },
          ],
        },
      },
      {
        title: 'Using Reports for Audit Evidence',
        description: 'Turning the portal\'s own data into audit-ready documentation.',
        lessons: [
          {
            title: 'Generating and Reading Compliance Reports',
            type: 'READING', readingContentType: 'RICH_TEXT',
            readingContent:
              'The Reports module lets you export point-in-time summaries of compliance status — by regulation, by department, or organization-wide — without having to manually reconstruct them from individual assessments.\n\n' +
              'As an auditor, reports are useful for:\n' +
              '- Establishing a baseline compliance snapshot at the start of an audit period.\n' +
              '- Cross-checking that a regulation\'s reported compliance percentage is consistent with what you find when you drill into individual control evidence.\n' +
              '- Providing leadership or external stakeholders a summary view without needing portal access themselves.\n\n' +
              'A report is a summary, not a substitute for evidence review — always be ready to drill down from a reported percentage into the underlying controls and evidence if something looks inconsistent.',
          },
          {
            title: 'Walkthrough: Exporting an Audit Trail',
            description: 'A short walkthrough of pulling a report and reading what it shows.',
            type: 'VIDEO', videoSource: 'EMBED', videoUrl: 'https://www.youtube.com/embed/jNQXAC9IVRw', videoDurationS: 300,
          },
          {
            title: 'Pull a Sample Report',
            type: 'ASSIGNMENT',
            assignmentInstructions:
              'Generate one report from the Reports module (any regulation or scope). Note what it showed you, and one thing you\'d want to drill into further to confirm the numbers hold up.',
            assignmentSubmissionType: 'TEXT_RESPONSE',
          },
        ],
        quiz: {
          title: 'Reporting & Audit Trail Quiz',
          passThreshold: 70,
          timeLimitMins: 8,
          questions: [
            {
              questionText: 'A compliance report\'s summary percentage is a substitute for reviewing the underlying control evidence.',
              type: 'TRUE_FALSE', marks: 1, difficulty: 'MEDIUM', topic: 'Reporting',
              tfCorrectAnswer: false,
            },
            {
              questionText: 'What is one practical use of the Reports module for an auditor?',
              type: 'MCQ', marks: 2, difficulty: 'EASY', topic: 'Reporting',
              options: [
                { optionText: 'Establishing a baseline compliance snapshot at the start of an audit period', isCorrect: true },
                { optionText: 'Automatically fixing non-compliant controls', isCorrect: false },
                { optionText: 'Deleting outdated evidence', isCorrect: false },
                { optionText: 'Replacing the need for any assessment review', isCorrect: false },
              ],
            },
          ],
        },
      },
    ],
  })
  console.log(`Course: ${course6.title} (mandatory for: Internal Auditor, External Auditor)`)

  const course7 = await upsertCourse({
    title: 'Compliance Officer Playbook: Controls, Risk & Reporting',
    description: 'A role-focused guide for Compliance Officers on running the Controls Library and Risk Analysis day to day, and turning that work into training assignments and reporting leadership can act on.',
    category: 'ROLE_SPECIFIC',
    difficulty: 'BEGINNER',
    estimatedHours: 1,
    estimatedMinutes: 10,
    mandatoryForPortalRoles: ['CO'],
    sections: [
      {
        title: 'Running the Controls Library & Risk Analysis',
        lessons: [
          {
            title: 'A Walkthrough of the Controls Library',
            description: 'How controls are structured, scored, and linked to evidence.',
            type: 'VIDEO', videoSource: 'EMBED', videoUrl: 'https://www.youtube.com/embed/jNQXAC9IVRw', videoDurationS: 360,
          },
          {
            title: 'Managing Controls & Risk Analysis in NiyamSaathi',
            type: 'READING', readingContentType: 'RICH_TEXT',
            readingContent:
              'As Compliance Officer, the Controls Library and Risk Analysis module are where most of your day-to-day work happens.\n\n' +
              'A few habits that keep both useful rather than stale:\n' +
              '- Review control status regularly, not just before an assessment — a control that quietly drifted from Compliant to Non-Compliant is far cheaper to catch early.\n' +
              '- When a risk is logged in Risk Analysis, link it back to the controls that mitigate it, so the connection between "what could go wrong" and "what we\'re doing about it" stays visible.\n' +
              '- Chase down controls sitting in Non-Compliant or In Progress for longer than expected — these are your highest-value place to spend time, since Compliant controls with solid evidence need little attention.\n\n' +
              'Treat the Controls Library and Risk Analysis as living systems you maintain continuously, not paperwork you complete once before an audit.',
          },
          {
            title: 'Review Your Top 3 Risks',
            type: 'ASSIGNMENT',
            assignmentInstructions:
              'Open Risk Analysis and identify your organization\'s top 3 risks by severity. For the highest one, note whether it\'s linked to a mitigating control, and if not, what control should exist.',
            assignmentSubmissionType: 'TEXT_RESPONSE',
          },
        ],
        quiz: {
          title: 'Controls & Risk Quiz',
          passThreshold: 70,
          timeLimitMins: 10,
          questions: [
            {
              questionText: 'Controls should only be reviewed right before a formal assessment, not on an ongoing basis.',
              type: 'TRUE_FALSE', marks: 1, difficulty: 'EASY', topic: 'Controls Management',
              tfCorrectAnswer: false,
            },
            {
              questionText: 'Where should a Compliance Officer spend the most attention in the Controls Library?',
              type: 'MCQ', marks: 2, difficulty: 'MEDIUM', topic: 'Controls Management',
              options: [
                { optionText: 'Controls stuck in Non-Compliant or In Progress longer than expected', isCorrect: true },
                { optionText: 'Controls already marked Compliant with solid evidence', isCorrect: false },
                { optionText: 'Controls that are alphabetically first', isCorrect: false },
                { optionText: 'Controls with the shortest descriptions', isCorrect: false },
              ],
            },
          ],
        },
      },
      {
        title: 'Assigning Training & Reporting to Leadership',
        description: 'Closing the loop between compliance gaps, training assignments, and what leadership sees.',
        lessons: [
          {
            title: 'Using the LMS to Assign & Track Mandatory Training',
            type: 'READING', readingContentType: 'RICH_TEXT',
            readingContent:
              'The LMS module gives you two independent ways to assign training, and knowing which to use matters:\n\n' +
              '- LMS Designation: an org job-function label (like DPO, IT Lead, Manager) you assign per user, which determines which certification courses are mandatory for them. Use this for role-specific compliance certification requirements.\n' +
              '- Portal Role targeting: courses (like this one) that are mandatory based on someone\'s platform permission role (CEO, CO, IT Admin, etc.) rather than their job title — used for "how to use this portal" guides.\n\n' +
              'Team Coverage (in the LMS module) shows you both axes separately — Compliance Certification Coverage and Portal Onboarding Coverage — so you can see at a glance who\'s behind on real compliance certifications versus who just hasn\'t finished their portal onboarding yet. Chase the certification gaps first; they\'re the ones with actual regulatory weight.',
          },
          {
            title: 'Building Reports for Leadership',
            type: 'READING', readingContentType: 'RICH_TEXT',
            readingContent:
              'Leadership rarely wants raw control-by-control detail — they want a short, honest answer to "are we in good shape, and if not, what\'s being done."\n\n' +
              'A useful leadership update typically includes:\n' +
              '- The current compliance score and its trend over the last reporting period.\n' +
              '- The top 2-3 risks or gaps, in plain language, with an owner and expected resolution date.\n' +
              '- Training/certification coverage, especially for any mandatory certification that\'s materially behind.\n' +
              '- Anything that needs a decision from leadership (budget, headcount, a policy call) rather than something you can resolve yourself.\n\n' +
              'The Reports module gives you the underlying numbers — your job is turning them into a narrative leadership can act on in under two minutes of reading.',
          },
          {
            title: 'Draft a One-Page Compliance Update',
            type: 'ASSIGNMENT',
            assignmentInstructions:
              'Draft a short leadership update (4-6 sentences): current compliance score and trend, top risk with an owner, and one training/certification gap worth flagging.',
            assignmentSubmissionType: 'TEXT_RESPONSE',
          },
        ],
        quiz: {
          title: 'CO Playbook Quiz',
          passThreshold: 70,
          timeLimitMins: 10,
          questions: [
            {
              questionText: 'LMS Designation and Portal Role targeting are the same thing and always assign the exact same courses to a user.',
              type: 'TRUE_FALSE', marks: 1, difficulty: 'MEDIUM', topic: 'LMS Management',
              tfCorrectAnswer: false,
            },
            {
              questionText: 'When two coverage gaps compete for attention, which should generally be prioritized?',
              type: 'MCQ', marks: 2, difficulty: 'MEDIUM', topic: 'LMS Management',
              options: [
                { optionText: 'A gap in mandatory certification coverage', isCorrect: true },
                { optionText: 'A gap in optional portal guide completion', isCorrect: false },
                { optionText: 'Whichever course has the longer title', isCorrect: false },
                { optionText: 'Neither — both are equally low priority', isCorrect: false },
              ],
            },
            {
              questionText: 'A good leadership compliance update focuses on raw control-by-control detail rather than a short, actionable summary.',
              type: 'TRUE_FALSE', marks: 1, difficulty: 'EASY', topic: 'Reporting',
              tfCorrectAnswer: false,
            },
          ],
        },
      },
    ],
  })
  console.log(`Course: ${course7.title} (mandatory for: CO)`)

  console.log('\nDone. Seven courses are PUBLISHED and ready to test (3 certifications, 4 guides).')
  await db.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
