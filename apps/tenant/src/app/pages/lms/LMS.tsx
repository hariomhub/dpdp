import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';
import {
  BookOpen, Award, Play, CheckCircle2, Clock, ChevronRight, ArrowLeft,
  Loader2, Trophy, Star, AlertCircle, BookMarked, FileText, Video as VideoIcon, X, GraduationCap, Users, Globe
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  useLmsCourses, useEnrollCourse, useUnenrollCourse, useLmsCertificates, useLmsCoverage,
  useMarkLessonComplete, useSubmitQuiz, useSubmitAssignment, useQuizReview, useMyPerformance,
  type LmsCourse, type LmsCoverageSection, type QuizReviewQuestion
} from '../../../hooks/useLms';
import {
  TabNav, Card, StatusChip, Btn,
  TextareaField, EmptyState,
} from '../../components/shared/DesignSystem';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DIFFICULTY_COLORS: Record<string, string> = {
  BEGINNER:     'bg-green-50 text-green-700',
  INTERMEDIATE: 'bg-amber-50 text-amber-700',
  ADVANCED:     'bg-red-50 text-red-700',
};

const CATEGORY_LABELS: Record<string, string> = {
  DPDP_COMPLIANCE: 'DPDP Compliance',
  PORTAL_USAGE:    'Portal Usage',
  ROLE_SPECIFIC:   'Role-Specific',
  GENERAL:         'General',
};

const PORTAL_ROLE_LABELS: Record<string, string> = {
  CEO: 'CEO', CO: 'Compliance Officer', IT_ADMIN: 'IT Admin',
  INTERNAL_AUDITOR: 'Internal Auditor', EXTERNAL_AUDITOR: 'External Auditor',
};

// Who a course is actually targeted at (by designation and/or portal role),
// regardless of whether that's the viewer. Lets a learner see "this isn't
// mine, it's assigned to X" instead of it looking like generic optional
// content dumped alongside genuinely open-to-anyone courses.
function getAssignedTo(course: LmsCourse): string[] {
  const designationNames = ((course as any).designations ?? []).map((d: any) => d.designation?.name).filter(Boolean);
  const roleNames = ((course as any).portalRoles ?? []).map((r: any) => PORTAL_ROLE_LABELS[r.portalRole] ?? r.portalRole);
  return [...new Set([...designationNames, ...roleNames])];
}

function isEmbeddableUrl(url: string) {
  return /youtube\.com|youtu\.be|vimeo\.com/.test(url || '');
}

function courseStatus(course: LmsCourse): string {
  if (course.enrollment?.isCompleted) return 'Completed';
  if (course.isEnrolled) return 'In Progress';
  return 'Not Started';
}

// A course is a "Certification" whenever a certificate template is attached to
// it — no separate flag to keep in sync; everything else is a "Guide".
function isCertification(course: LmsCourse): boolean {
  return !!course.certificateTemplate;
}

// A course's curriculum flattened to lesson/quiz "items" in learning order,
// keyed so the player sidebar and "next item" navigation can address either
// kind uniformly.
const keyForLesson = (id: string) => `lesson:${id}`;
const keyForQuiz = (sectionId: string) => `quiz:${sectionId}`;

function flattenCurriculum(course: LmsCourse) {
  const completedLessonIds = new Set((course.enrollment?.lessonProgress ?? []).filter((p: any) => p.isCompleted).map((p: any) => p.lessonId));
  const passedQuizIds = new Set((course.enrollment?.quizAttempts ?? []).filter((a: any) => a.passed).map((a: any) => a.quizId));
  const items: Array<{ key: string; section: any; lesson?: any; quiz?: any; isDone: boolean }> = [];
  for (const section of (course as any).sections ?? []) {
    for (const lesson of section.lessons ?? []) {
      items.push({ key: keyForLesson(lesson.id), section, lesson, isDone: completedLessonIds.has(lesson.id) });
    }
    if (section.quiz) {
      items.push({ key: keyForQuiz(section.id), section, quiz: section.quiz, isDone: passedQuizIds.has(section.quiz.id) });
    }
  }
  return items;
}

function getNextIncompleteKey(course: LmsCourse): string | null {
  const items = flattenCurriculum(course);
  return items.find(it => !it.isDone)?.key ?? null;
}

// ─── Circular progress ring (no charting dependency needed) ───────────────────

function ProgressRing({ progress, size = 56, stroke = 5, color = '#D4AF37', trackColor = 'rgba(255,255,255,0.2)', textColor = '#ffffff' }: {
  progress: number; size?: number; stroke?: number; color?: string; trackColor?: string; textColor?: string
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, progress)) / 100) * circumference;
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={trackColor} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.4s ease' }} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[13px] font-bold" style={{ color: textColor }}>{Math.round(progress)}%</span>
    </div>
  );
}

// ─── Course Card ──────────────────────────────────────────────────────────────

function CourseCard({ course, badge, assignedToOthers, onOpen }: {
  course: LmsCourse
  badge?: 'mandatory' | 'recommended'
  assignedToOthers?: string[]
  onOpen: () => void
}) {
  const enrollMut = useEnrollCourse();
  const unenrollMut = useUnenrollCourse();
  const canUnenroll = course.isEnrolled && badge !== 'mandatory';
  const duration = course.estimatedHours > 0
    ? `${course.estimatedHours}h ${course.estimatedMinutes}m`
    : `${course.estimatedMinutes}m`;

  const handleUnenroll = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Unenroll from "${course.title}"? Your progress on this course will be lost.`)) {
      unenrollMut.mutate(course.id);
    }
  };

  return (
    <Card onClick={onOpen} className="!p-0 overflow-hidden flex flex-col group hover:-translate-y-1 transition-transform duration-200">
      {/* Thumbnail */}
      <div className="h-40 bg-gradient-to-br from-[#1A3E5C] to-[#15324a] relative flex items-center justify-center overflow-hidden flex-shrink-0">
        {course.thumbnailUrl ? (
          <img src={course.thumbnailUrl} alt="" className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
        ) : (
          <BookOpen className="w-12 h-12 text-white/30" />
        )}
        {/* Purely a depth/vignette touch, not for text legibility — nothing sits on the image itself */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
        {/* Hover affordance — signals "this is playable content" */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-11 h-11 rounded-full bg-white/95 flex items-center justify-center shadow-lg">
            <Play className="w-4.5 h-4.5 text-[#1A3E5C] fill-current ml-0.5" />
          </div>
        </div>
        {badge && (
          <span className={`absolute top-2 left-2 text-[11.5px] font-bold px-2 py-0.5 rounded-full z-10 ${
            badge === 'mandatory' ? 'bg-red-500 text-white' : 'bg-[#D4AF37] text-white'
          }`}>
            {badge === 'mandatory' ? 'Required' : 'Recommended'}
          </span>
        )}
      </div>

      <div className="p-3.5 flex flex-col flex-1 gap-2">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[15.5px] font-semibold text-slate-900 leading-snug line-clamp-2 flex-1"
            style={{ fontFamily: 'Cinzel, serif' }}>{course.title}</p>
          <StatusChip status={courseStatus(course)} />
        </div>

        {/* Primary signal: what kind of learning this is, and who it's for
            if that's not the viewer — this is the line a learner should be
            able to scan in under a second. */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`inline-flex items-center gap-1 text-[12px] font-bold px-2 py-1 rounded-md border ${
            isCertification(course) ? 'bg-[#D4AF37]/15 text-[#8A6D1F] border-[#D4AF37]/30' : 'bg-sky-50 text-sky-700 border-sky-200'
          }`}>
            {isCertification(course) ? <Award className="w-3.5 h-3.5" /> : <BookOpen className="w-3.5 h-3.5" />}
            {isCertification(course) ? 'Certification' : 'Guide'}
          </span>
          {assignedToOthers && assignedToOthers.length > 0 && (
            <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold px-1.5 py-1 rounded-md bg-slate-100 text-slate-500">
              <Users className="w-3 h-3" /> For {assignedToOthers.join(', ')}
            </span>
          )}
        </div>

        {/* Secondary metadata: subject area + difficulty, muted so it supports rather than competes with the badge above */}
        <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-slate-400">
          <span className="font-medium">{CATEGORY_LABELS[course.category] ?? course.category}</span>
          <span>·</span>
          <span className={`font-semibold px-1.5 py-0.5 rounded text-[10.5px] ${DIFFICULTY_COLORS[course.difficulty] ?? ''}`}>
            {course.difficulty}
          </span>
        </div>

        <p className="text-[13.5px] text-slate-500 line-clamp-2 flex-1">{course.description}</p>

        <div className="flex items-center gap-2 text-[12.5px] text-slate-400">
          <Clock className="w-3 h-3" /> {duration}
          <span>·</span>
          <BookMarked className="w-3 h-3" /> {course.totalLessons} lessons
        </div>

        {course.isEnrolled && !course.enrollment?.isCompleted && (
          <div>
            <div className="flex items-center justify-between mb-1 text-[12.5px]">
              <span className="text-slate-500">{course.progress}% complete</span>
              <span className="text-slate-400">{course.completedLessons}/{course.totalLessons}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5">
              <div className="bg-[#D4AF37] h-1.5 rounded-full transition-all" style={{ width: `${course.progress}%` }} />
            </div>
          </div>
        )}

        <div className="pt-1">
          {!course.isEnrolled && (
            <Btn variant="secondary" size="sm" className="w-full justify-center"
              icon={enrollMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              onClick={e => { e.stopPropagation(); enrollMut.mutate(course.id) }} disabled={enrollMut.isPending}>
              Enroll
            </Btn>
          )}
          {course.isEnrolled && !course.enrollment?.isCompleted && (
            <div className="flex items-center gap-2">
              <Btn variant="primary" size="sm" className="flex-1 justify-center" icon={<Play className="w-3.5 h-3.5" />}>
                Continue
              </Btn>
              {canUnenroll && (
                <button onClick={handleUnenroll} disabled={unenrollMut.isPending} title="Unenroll"
                  className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-md border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors disabled:opacity-50">
                  {unenrollMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
          )}
          {course.enrollment?.isCompleted && (
            <div className="flex items-center justify-center gap-1.5 py-1.5 text-[13.5px] text-green-600 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" /> Completed
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

// ─── Lesson content viewer (rendered in the player's main pane) ───────────────

function LessonViewer({ lesson, enrollmentId, isCompleted, submission, onMarkComplete, marking }: {
  lesson: any; enrollmentId: string; isCompleted: boolean; submission: any
  onMarkComplete: () => void; marking: boolean
}) {
  const submitAssignment = useSubmitAssignment();
  const [textAnswer, setTextAnswer] = useState(submission?.textAnswer ?? '');
  const [file, setFile] = useState<File | null>(null);

  return (
    <div className="space-y-3">
      {lesson.type === 'VIDEO' && (
        <>
          {lesson.videoUrl ? (
            isEmbeddableUrl(lesson.videoUrl) ? (
              <div className="aspect-video w-full rounded-lg overflow-hidden bg-black border border-[#D4AF37]/35">
                <iframe src={lesson.videoUrl} className="w-full h-full" allowFullScreen title={lesson.title} />
              </div>
            ) : (
              <video src={lesson.videoUrl} controls className="w-full rounded-lg bg-black max-h-[360px] border border-[#D4AF37]/35" />
            )
          ) : (
            <p className="text-[13.5px] text-slate-400 italic flex items-center gap-1.5"><VideoIcon className="w-4 h-4" /> No video content added yet.</p>
          )}
          {lesson.description && <p className="text-[13.5px] text-slate-500">{lesson.description}</p>}
          {!isCompleted && (
            <Btn size="sm" onClick={onMarkComplete} disabled={marking} icon={marking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : undefined}>
              Mark as Watched
            </Btn>
          )}
        </>
      )}

      {lesson.type === 'READING' && (
        <>
          {lesson.readingContentType === 'FILE' && lesson.readingContent ? (
            <a href={lesson.readingContent} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-[14px] text-[#1A3E5C] font-medium underline">
              <FileText className="w-4 h-4" /> Open reading material
            </a>
          ) : lesson.readingContent ? (
            <div className="text-[14.5px] text-slate-700 leading-relaxed bg-white border border-slate-200 rounded-lg p-4 max-h-72 overflow-y-auto">
              {lesson.readingContent.split(/\n\s*\n/).map((para: string, i: number) => (
                <p key={i} className="mb-3 last:mb-0 whitespace-pre-wrap">{para}</p>
              ))}
            </div>
          ) : (
            <p className="text-[13.5px] text-slate-400 italic">No reading content added yet.</p>
          )}
          {!isCompleted && (
            <Btn size="sm" onClick={onMarkComplete} disabled={marking} icon={marking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : undefined}>
              Mark as Read
            </Btn>
          )}
        </>
      )}

      {lesson.type === 'ASSIGNMENT' && (
        <>
          <p className="text-[14px] text-slate-700 whitespace-pre-wrap">{lesson.assignmentInstructions || 'No instructions provided.'}</p>
          {submission ? (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg space-y-2">
              <p className="text-[13.5px] text-green-700">
                Submitted {new Date(submission.submittedAt).toLocaleDateString('en-IN')}
                {submission.fileName && <> · <a href={submission.fileUrl} target="_blank" rel="noreferrer" className="underline">{submission.fileName}</a></>}
              </p>
              {submission.textAnswer && (
                <p className="text-[13.5px] text-slate-700 whitespace-pre-wrap bg-white border border-green-100 rounded-md p-2.5">{submission.textAnswer}</p>
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              {(lesson.assignmentSubmissionType === 'TEXT_RESPONSE' || lesson.assignmentSubmissionType === 'BOTH' || !lesson.assignmentSubmissionType) && (
                <TextareaField value={textAnswer} onChange={setTextAnswer} rows={3} placeholder="Write your response…" />
              )}
              {(lesson.assignmentSubmissionType === 'FILE_UPLOAD' || lesson.assignmentSubmissionType === 'BOTH') && (
                <input type="file" onChange={e => setFile(e.target.files?.[0] ?? null)} className="text-[13.5px] text-slate-600" />
              )}
              <Btn size="sm"
                onClick={() => submitAssignment.mutate({ enrollmentId, lessonId: lesson.id, textAnswer: textAnswer || undefined, file: file || undefined })}
                disabled={submitAssignment.isPending || (!textAnswer && !file)}
                icon={submitAssignment.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : undefined}>
                Submit Assignment
              </Btn>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Quiz-taking view (rendered in the player's main pane) ────────────────────

function ReviewQuestionCard({ q, index }: { q: QuizReviewQuestion; index: number }) {
  return (
    <Card className="space-y-1.5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[14.5px] font-semibold text-slate-800 flex-1">
          {index + 1}. {q.questionText} <span className="text-[12.5px] text-slate-400 font-normal">({q.marks} marks{q.type === 'DESCRIPTIVE' ? ' · not auto-graded' : ''})</span>
        </p>
        {q.isCorrect !== null && (
          <span className={`flex items-center gap-1 text-[12.5px] font-semibold flex-shrink-0 ${q.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
            {q.isCorrect ? <CheckCircle2 className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
            {q.isCorrect ? 'Correct' : 'Incorrect'}
          </span>
        )}
      </div>
      <p className="text-[13.5px] text-slate-600">
        Your answer: <span className={`font-medium ${q.isCorrect === false ? 'text-red-600' : 'text-slate-800'}`}>{q.yourAnswerText ?? '(no answer)'}</span>
      </p>
      {q.isCorrect === false && q.correctAnswerText && (
        <p className="text-[13.5px] text-green-700">Correct answer: <span className="font-medium">{q.correctAnswerText}</span></p>
      )}
      {q.type === 'DESCRIPTIVE' && (
        <p className="text-[12.5px] text-slate-400">Reviewed manually — doesn't affect your automatic score.</p>
      )}
    </Card>
  );
}

function QuizView({ quiz, enrollmentId, attempts, onContinue }: {
  quiz: any; enrollmentId: string; attempts: any[]; onContinue?: () => void
}) {
  const submitQuiz = useSubmitQuiz();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [descriptiveAnswers, setDescriptiveAnswers] = useState<Record<string, string>>({});
  const [mode, setMode] = useState<'review' | 'taking'>(attempts.length > 0 ? 'review' : 'taking');
  const [freshResult, setFreshResult] = useState<{ score: number; passed: boolean; attemptNumber?: number; review: QuizReviewQuestion[] } | null>(null);

  const reviewQuery = useQuizReview(enrollmentId, quiz.id, mode === 'review' && !freshResult);

  const alreadyPassed = attempts.some((a: any) => a.passed);
  const gradableCount = quiz.questions.filter((q: any) => q.type !== 'DESCRIPTIVE').length;
  const answeredCount = quiz.questions.filter((q: any) => q.type !== 'DESCRIPTIVE' && answers[q.id] !== undefined).length;

  const handleSubmit = () => {
    const allAnswers = { ...answers, ...descriptiveAnswers };
    submitQuiz.mutate({ enrollmentId, quizId: quiz.id, answers: allAnswers }, {
      onSuccess: data => { setFreshResult(data); setMode('review'); },
    });
  };

  const startRetake = () => { setFreshResult(null); setAnswers({}); setDescriptiveAnswers({}); setMode('taking'); };

  if (mode === 'review') {
    const data = freshResult ?? reviewQuery.data;
    if (!data) {
      return reviewQuery.isLoading
        ? <div className="flex items-center justify-center h-32"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
        : null;
    }
    return (
      <div className="space-y-4">
        <Card className={`!p-4 border-2 ${data.passed ? 'border-green-200 bg-green-50/40' : 'border-red-200 bg-red-50/40'}`}>
          <div className="flex items-center gap-3.5 flex-wrap">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${data.passed ? 'bg-green-100' : 'bg-red-100'}`}>
              {data.passed ? <Trophy className="w-6 h-6 text-green-600" /> : <AlertCircle className="w-6 h-6 text-red-600" />}
            </div>
            <div className="flex-1 min-w-[160px]">
              <p className="text-[16.5px] font-bold text-slate-900" style={{ fontFamily: 'Cinzel, serif' }}>{data.passed ? 'You passed!' : 'Not quite there'}</p>
              <p className="text-[13px] text-slate-500">Score: <span className="font-semibold text-slate-700">{data.score}%</span> · Pass mark: {quiz.passThreshold}%</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {!data.passed && <Btn size="sm" onClick={startRetake}>Retry Quiz</Btn>}
              {data.passed && onContinue && <Btn size="sm" onClick={onContinue} icon={<ChevronRight className="w-3.5 h-3.5" />}>Continue</Btn>}
              {data.passed && <Btn size="sm" variant="secondary" onClick={startRetake}>Retake</Btn>}
            </div>
          </div>
        </Card>
        <div>
          <p className="text-[15px] font-bold text-slate-800 mb-2.5">Review Your Answers</p>
          <div className="space-y-2.5">
            {data.review.map((q, i) => <ReviewQuestionCard key={q.questionId} q={q} index={i} />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <p className="text-[18px] font-bold text-slate-900" style={{ fontFamily: 'Cinzel, serif' }}>{quiz.title}</p>
        <p className="text-[13.5px] text-slate-400 mt-0.5">
          {quiz.questions.length} questions · Pass mark {quiz.passThreshold}%
          {quiz.timeLimitMins ? ` · ${quiz.timeLimitMins} min` : ''}
          {alreadyPassed && <span className="text-green-600 font-semibold"> · Already passed — retaking updates your latest attempt</span>}
        </p>
      </Card>

      {quiz.questions.map((q: any, i: number) => (
        <Card key={q.id} className="space-y-2.5">
          <p className="text-[14.5px] font-semibold text-slate-800">
            {i + 1}. {q.questionText} <span className="text-[12.5px] text-slate-400 font-normal">({q.marks} marks{q.type === 'DESCRIPTIVE' ? ' · not auto-graded' : ''})</span>
          </p>
          {q.type === 'MCQ' && (
            <div className="space-y-1.5">
              {(q.options || []).map((o: any) => (
                <label key={o.id} className="flex items-center gap-2 text-[14px] text-slate-700 cursor-pointer">
                  <input type="radio" name={q.id} checked={answers[q.id] === o.id}
                    onChange={() => setAnswers(p => ({ ...p, [q.id]: o.id }))} className="accent-[#1A3E5C]" />
                  {o.optionText}
                </label>
              ))}
            </div>
          )}
          {q.type === 'TRUE_FALSE' && (
            <div className="flex gap-3">
              {['true', 'false'].map(v => (
                <button key={v} onClick={() => setAnswers(p => ({ ...p, [q.id]: v }))}
                  className={`px-4 py-1.5 rounded-lg text-[14px] font-medium border capitalize transition-colors ${answers[q.id] === v ? 'bg-[#1A3E5C] text-white border-[#1A3E5C]' : 'border-slate-300 text-slate-600 hover:border-slate-400'}`}>
                  {v}
                </button>
              ))}
            </div>
          )}
          {q.type === 'DESCRIPTIVE' && (
            <>
              <TextareaField rows={3} value={descriptiveAnswers[q.id] ?? ''} onChange={v => setDescriptiveAnswers(p => ({ ...p, [q.id]: v }))}
                placeholder={q.wordLimit ? `Max ${q.wordLimit} words` : 'Your answer'} />
              <p className="text-[12.5px] text-slate-400">Descriptive questions are reviewed manually and don't affect your automatic score.</p>
            </>
          )}
        </Card>
      ))}

      <Btn className="w-full justify-center" size="lg" onClick={handleSubmit} disabled={submitQuiz.isPending || answeredCount === 0}
        icon={submitQuiz.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}>
        Submit Quiz ({answeredCount}/{gradableCount} answered)
      </Btn>
    </div>
  );
}

// ─── Course Detail — split-pane course player ──────────────────────────────────
// Persistent curriculum sidebar + a main pane rendering whichever lesson/quiz
// is selected, matching how Coursera/Udemy/LinkedIn Learning structure the
// course-taking screen — the learner never loses their place navigating
// between lessons.

const LESSON_TYPE_META: Record<string, { icon: React.ReactNode; label: string }> = {
  VIDEO:      { icon: <VideoIcon className="w-3.5 h-3.5" />, label: 'Video' },
  READING:    { icon: <FileText className="w-3.5 h-3.5" />, label: 'Reading' },
  ASSIGNMENT: { icon: <BookOpen className="w-3.5 h-3.5" />, label: 'Assignment' },
};

function CourseDetail({ course, isMandatory, onBack, onUnenrolled, onViewCertificates }: {
  course: LmsCourse; isMandatory: boolean; onBack: () => void; onUnenrolled: () => void; onViewCertificates: () => void
}) {
  const markComplete = useMarkLessonComplete();
  const enrollMut    = useEnrollCourse();
  const unenrollMut  = useUnenrollCourse();
  const canUnenroll  = course.isEnrolled && !isMandatory && !course.enrollment?.isCompleted;

  const handleUnenroll = () => {
    if (confirm(`Unenroll from "${course.title}"? Your progress on this course will be lost.`)) {
      unenrollMut.mutate(course.id, { onSuccess: onUnenrolled });
    }
  };

  const sections = (course as any).sections ?? [];
  const assignmentSubmissions: any[] = course.enrollment?.assignmentSubmissions ?? [];
  const items = flattenCurriculum(course);

  const [selectedKey, setSelectedKey] = useState<string | null>(
    () => getNextIncompleteKey(course) ?? items[0]?.key ?? null
  );
  const selectedIdx = items.findIndex(it => it.key === selectedKey);
  const selected = selectedIdx >= 0 ? items[selectedIdx] : null;
  const nextItem = selectedIdx >= 0 && selectedIdx < items.length - 1 ? items[selectedIdx + 1] : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-1.5 text-[15px] text-slate-500 hover:text-slate-800">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to LMS
        </button>
        {canUnenroll && (
          <button onClick={handleUnenroll} disabled={unenrollMut.isPending}
            className="flex items-center gap-1.5 text-[13.5px] text-slate-400 hover:text-red-600 disabled:opacity-50">
            {unenrollMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />} Unenroll
          </button>
        )}
      </div>

      {/* Header — thumbnail (if any) sits behind a scrim so the title/badges
          stay legible regardless of what the uploaded image contains */}
      <div className="relative bg-gradient-to-r from-[#15324a] to-[#0f2438] rounded-xl p-7 text-white flex items-center gap-5 overflow-hidden min-h-[168px]">
        {course.thumbnailUrl && (
          <>
            <img src={course.thumbnailUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0f2438] via-[#0f2438]/85 to-[#0f2438]/40" />
          </>
        )}
        <div className="relative z-10 flex items-center gap-5 w-full">
        {course.isEnrolled && <ProgressRing progress={course.enrollment?.isCompleted ? 100 : course.progress} />}
        <div className="flex-1 min-w-0">
          <div className="flex gap-2 mb-1.5 flex-wrap">
            <span className={`text-[11.5px] font-bold px-2 py-0.5 rounded-full ${(DIFFICULTY_COLORS[course.difficulty] ?? '').replace('bg-', 'bg-opacity-30 bg-').replace('text-', 'text-white ')}`}>
              {course.difficulty}
            </span>
            <span className="text-[11.5px] font-bold px-2 py-0.5 rounded-full bg-white/20">{CATEGORY_LABELS[course.category]}</span>
            {course.certificateTemplate ? (
              <span className="text-[11.5px] font-bold px-2 py-0.5 rounded-full bg-[#D4AF37]/30 flex items-center gap-1">
                <Award className="w-3 h-3" /> Certificate on completion
              </span>
            ) : (
              <span className="text-[11.5px] font-bold px-2 py-0.5 rounded-full bg-sky-400/25 flex items-center gap-1">
                <BookOpen className="w-3 h-3" /> Guide
              </span>
            )}
          </div>
          <h1 className="text-[22px] font-bold truncate" style={{ fontFamily: 'Cinzel, serif' }}>{course.title}</h1>
          <p className="text-[13.5px] text-white/60 mt-0.5">
            <Clock className="w-3 h-3 inline mr-1" />{course.estimatedHours}h {course.estimatedMinutes}m
            <span className="mx-1.5">·</span>
            <BookMarked className="w-3 h-3 inline mr-1" />{course.totalLessons} lessons
            {course.isEnrolled && <span className="mx-1.5">·</span>}
            {course.isEnrolled && `${course.completedLessons}/${course.totalLessons} complete`}
          </p>
        </div>
        {!course.isEnrolled && (
          <Btn onClick={() => enrollMut.mutate(course.id)} disabled={enrollMut.isPending}
            icon={enrollMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}>
            Enroll in this Course
          </Btn>
        )}
        </div>
      </div>

      {!course.isEnrolled ? (
        <>
          <p className="text-[15px] text-slate-600 max-w-3xl">{course.description}</p>
          <div className="space-y-2">
            <p className="text-[16px] font-bold text-slate-900" style={{ fontFamily: 'Cinzel, serif' }}>Course Curriculum</p>
            {sections.map((section: any) => (
              <Card key={section.id} className="!p-0 overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                  <p className="text-[15px] font-semibold text-slate-800">{section.title}</p>
                </div>
                {section.lessons?.map((lesson: any, i: number) => (
                  <div key={lesson.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-50 last:border-0 text-slate-500">
                    <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[11px] font-bold flex-shrink-0">{i + 1}</span>
                    {LESSON_TYPE_META[lesson.type]?.icon}
                    <p className="text-[14.5px] flex-1">{lesson.title}</p>
                    <span className="text-[12.5px] text-slate-400">{LESSON_TYPE_META[lesson.type]?.label ?? lesson.type}</span>
                  </div>
                ))}
                {section.quiz && (
                  <div className="flex items-center gap-3 px-4 py-2.5 text-slate-500 border-t border-slate-50">
                    <Award className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    <p className="text-[14.5px] flex-1">{section.quiz.title}</p>
                    <span className="text-[12.5px] text-slate-400">{section.quiz.questions?.length ?? 0} questions</span>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </>
      ) : course.enrollment?.isCompleted ? (
        <Card>
          <EmptyState icon={<Trophy className="w-14 h-14 text-amber-400" />} title="Course Completed"
            description={course.certificateTemplate ? 'Nice work — your certificate is ready.' : 'Nice work finishing this course.'}
            action={course.certificateTemplate ? <Btn onClick={onViewCertificates} icon={<Award className="w-4 h-4" />}>View Certificates</Btn> : undefined} />
        </Card>
      ) : (
        <div className="flex flex-col lg:flex-row gap-4 items-start">
          {/* Curriculum sidebar */}
          <div className="w-full lg:w-80 flex-shrink-0 lg:sticky lg:top-4 space-y-2">
            {sections.map((section: any) => (
              <Card key={section.id} className="!p-0 overflow-hidden">
                <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-100">
                  <p className="text-[13px] font-bold text-slate-600 uppercase tracking-wide">{section.title}</p>
                </div>
                {items.filter(it => it.section.id === section.id).map(it => {
                  const isActive = it.key === selectedKey;
                  const label = it.lesson ? it.lesson.title : it.quiz.title;
                  return (
                    <button key={it.key} onClick={() => setSelectedKey(it.key)}
                      className={`w-full flex items-start gap-2.5 px-3.5 py-2.5 text-left border-b border-slate-50 last:border-0 transition-colors ${isActive ? 'bg-[#1A3E5C]/8' : 'hover:bg-slate-50'}`}>
                      {it.isDone ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      ) : it.quiz ? (
                        <Award className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      ) : (
                        <span className="w-4 h-4 rounded-full border-2 border-slate-300 flex-shrink-0 mt-0.5" />
                      )}
                      <span className={`text-[13.5px] flex-1 leading-snug ${isActive ? 'font-semibold text-[#1A3E5C]' : 'text-slate-600'}`}>{label}</span>
                    </button>
                  );
                })}
              </Card>
            ))}
          </div>

          {/* Content pane */}
          <div className="flex-1 min-w-0 w-full">
            {!selected ? (
              <Card><EmptyState icon={<BookOpen className="w-10 h-10" />} title="Select a lesson" description="Pick an item from the curriculum to get started." /></Card>
            ) : selected.lesson ? (
              <Card>
                <div className="flex items-center gap-2 mb-3">
                  {LESSON_TYPE_META[selected.lesson.type]?.icon}
                  <p className="text-[17px] font-bold text-slate-900 flex-1" style={{ fontFamily: 'Cinzel, serif' }}>{selected.lesson.title}</p>
                  <span className="text-[12px] text-slate-400">{LESSON_TYPE_META[selected.lesson.type]?.label}</span>
                </div>
                <LessonViewer
                  lesson={selected.lesson}
                  enrollmentId={course.enrollment!.id}
                  isCompleted={selected.isDone}
                  submission={assignmentSubmissions.find(s => s.lessonId === selected.lesson.id)}
                  marking={markComplete.isPending}
                  onMarkComplete={() => markComplete.mutate({ enrollmentId: course.enrollment!.id, lessonId: selected.lesson.id })}
                />
                {selected.isDone && nextItem && (
                  <div className="pt-3 mt-3 border-t border-slate-100">
                    <Btn onClick={() => setSelectedKey(nextItem.key)} icon={<ChevronRight className="w-4 h-4" />}>
                      Next: {nextItem.lesson?.title ?? nextItem.quiz?.title}
                    </Btn>
                  </div>
                )}
              </Card>
            ) : (
              <QuizView
                quiz={selected.quiz}
                enrollmentId={course.enrollment!.id}
                attempts={(course.enrollment?.quizAttempts ?? []).filter((a: any) => a.quizId === selected.quiz.id)}
                onContinue={nextItem ? () => setSelectedKey(nextItem.key) : undefined}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Certificates Tab ──────────────────────────────────────────────────────────

function CertificatesTab() {
  const { data: certs = [], isLoading } = useLmsCertificates();

  if (isLoading) return <div className="flex items-center justify-center h-32"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>;

  if ((certs as any[]).length === 0) return (
    <EmptyState icon={<Trophy className="w-12 h-12" />} title="No certificates yet"
      description="Complete a course (including its quiz) to earn your first certificate." />
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      {(certs as any[]).map((c: any) => (
        <a key={c.certificateCode} href={`/org/lms/certificates/${c.certificateCode}`} target="_blank" rel="noreferrer">
          <Card className={`text-center space-y-3 relative ${c.isRevoked ? 'opacity-60' : ''}`}>
            {c.isRevoked && (
              <span className="absolute top-2.5 right-2.5 text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                Revoked
              </span>
            )}
            <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto ${c.isRevoked ? 'bg-slate-100' : 'bg-amber-50'}`}>
              <Award className={`w-8 h-8 ${c.isRevoked ? 'text-slate-400' : 'text-amber-500'}`} />
            </div>
            <p className="text-[15px] font-bold text-slate-900">{c.courseTitle}</p>
            <p className="text-[13px] text-slate-400">
              Issued {new Date(c.issuedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
            {c.certificate && (
              <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-[13px] font-semibold text-amber-700 font-mono">{c.certificateCode}</p>
              </div>
            )}
          </Card>
        </a>
      ))}
    </div>
  );
}

// ─── Team Coverage Tab (CO/CEO only) ────────────────────────────────────────────

function CoverageHeroCard({ title, icon: Icon, accent, section }: {
  title: string; icon: typeof Award; accent: string; section: LmsCoverageSection
}) {
  const allCaughtUp = section.behindUsers.length === 0;
  return (
    <Card className="!p-0 overflow-hidden">
      <div className="h-1 w-full" style={{ background: accent }} />
      <div className="p-4 flex items-center gap-4">
        <ProgressRing progress={section.orgCompletionRate} size={64} stroke={6} color={accent} trackColor="rgba(0,0,0,0.06)" textColor="#0f172a" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: accent }} />
            <p className="text-[13.5px] font-bold text-slate-800 truncate">{title}</p>
          </div>
          <p className="text-[12.5px] text-slate-400">{section.usersWithMandatory}/{section.totalUsers} users with requirements</p>
          <span className={`inline-flex items-center gap-1 mt-1.5 text-[11.5px] font-semibold px-1.5 py-0.5 rounded-full ${
            allCaughtUp ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {allCaughtUp ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
            {allCaughtUp ? 'Everyone up to date' : `${section.behindUsers.length} behind`}
          </span>
        </div>
      </div>
    </Card>
  );
}

function CoverageTab() {
  const { data, isLoading } = useLmsCoverage();

  if (isLoading) return <div className="flex items-center justify-center h-32"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>;
  if (!data) return null;

  const { certification, guides } = data;

  const designationNames = [...new Set([
    ...certification.perDesignation.map(d => d.designation),
    ...guides.perDesignation.map(d => d.designation),
  ])];

  const behindRows = [
    ...certification.behindUsers.map(u => ({ ...u, kind: 'Certification' as const })),
    ...guides.behindUsers.map(u => ({ ...u, kind: 'Guide' as const })),
  ].sort((a, b) => a.completionRate - b.completionRate);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <CoverageHeroCard title="Compliance Certification Coverage" icon={Award} accent="#D4AF37" section={certification} />
        <CoverageHeroCard title="Portal Onboarding Coverage" icon={BookOpen} accent="#1A3E5C" section={guides} />
      </div>

      {designationNames.length > 0 && (
        <Card className="!p-0 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-100">
            <p className="text-[14px] font-bold text-slate-800">Completion by Designation</p>
          </div>
          <div className="divide-y divide-slate-50">
            {designationNames.map(name => {
              const cert = certification.perDesignation.find(d => d.designation === name);
              const guide = guides.perDesignation.find(d => d.designation === name);
              return (
                <div key={name} className="flex items-center gap-4 px-4 py-2.5">
                  <p className="text-[13.5px] font-semibold text-slate-800 font-mono w-40 flex-shrink-0 truncate">{name}</p>
                  <MiniBar label="Cert" value={cert?.avgCompletionRate} color="#D4AF37" />
                  <MiniBar label="Guide" value={guide?.avgCompletionRate} color="#1A3E5C" />
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Card className="!p-0 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-slate-100">
          <p className="text-[14px] font-bold text-slate-800">Behind on Training</p>
        </div>
        {behindRows.length === 0 ? (
          <p className="text-center text-slate-400 text-[13.5px] py-6">Everyone is up to date across certifications and guides.</p>
        ) : (
          <div className="divide-y divide-slate-50">
            {behindRows.map((u, i) => (
              <div key={`${u.userId}-${u.kind}-${i}`} className="flex items-center gap-3 px-4 py-2.5">
                <div className="w-7 h-7 rounded-full bg-[#1A3E5C]/10 flex items-center justify-center text-[11px] font-bold text-[#1A3E5C] flex-shrink-0">
                  {u.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13.5px] font-semibold text-slate-800 truncate">{u.name}</p>
                  <p className="text-[12px] text-slate-400 truncate">{u.missingCourses.join(', ')}</p>
                </div>
                <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                  u.kind === 'Certification' ? 'bg-[#D4AF37]/15 text-[#8A6D1F]' : 'bg-sky-50 text-sky-700'
                }`}>{u.kind}</span>
                <span className="text-[13px] font-semibold text-red-600 flex-shrink-0 w-12 text-right">{u.completionRate}%</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function MiniBar({ label, value, color }: { label: string; value?: number; color: string }) {
  if (value === undefined) return <div className="flex-1" />;
  return (
    <div className="flex items-center gap-2 flex-1 min-w-0">
      <span className="text-[11px] font-semibold text-slate-400 w-9 flex-shrink-0">{label}</span>
      <div className="flex-1 bg-slate-100 rounded-full h-1.5 min-w-[40px]">
        <div className="h-1.5 rounded-full" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="text-[12px] font-semibold text-slate-600 w-9 flex-shrink-0 text-right">{value}%</span>
    </div>
  );
}

// ─── My Performance Tab ─────────────────────────────────────────────────────────

function StatBar({ label, completed, total, color }: { label: string; completed: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-[12.5px] font-semibold text-slate-600 w-24 flex-shrink-0">{label}</span>
      <div className="flex-1 bg-slate-100 rounded-full h-2 min-w-[60px]">
        <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-[12.5px] font-semibold text-slate-500 w-24 flex-shrink-0 text-right">{completed}/{total} ({pct}%)</span>
    </div>
  );
}

function PerformanceTab() {
  const { data, isLoading } = useMyPerformance();

  if (isLoading) return <div className="flex items-center justify-center h-32"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>;
  if (!data) return null;

  const pct = (b: { completed: number; total: number }) => b.total > 0 ? Math.round((b.completed / b.total) * 100) : 0;
  const chartData = data.quizScoreHistory.map((q, i) => ({
    label: new Date(q.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    score: q.score, passed: q.passed, quizTitle: q.quizTitle, index: i,
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="flex items-center gap-3.5">
          <ProgressRing progress={pct(data.certification)} size={56} stroke={5} color="#D4AF37" trackColor="rgba(0,0,0,0.06)" textColor="#0f172a" />
          <div className="min-w-0">
            <p className="text-[13.5px] font-bold text-slate-800">Certifications</p>
            <p className="text-[12px] text-slate-400">{data.certification.completed}/{data.certification.total} completed</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3.5">
          <ProgressRing progress={pct(data.guide)} size={56} stroke={5} color="#1A3E5C" trackColor="rgba(0,0,0,0.06)" textColor="#0f172a" />
          <div className="min-w-0">
            <p className="text-[13.5px] font-bold text-slate-800">Guides</p>
            <p className="text-[12px] text-slate-400">{data.guide.completed}/{data.guide.total} completed</p>
          </div>
        </Card>
        <Card className="flex items-center justify-around text-center">
          <div>
            <p className="text-[22px] font-bold text-slate-900 leading-none" style={{ fontFamily: 'Cinzel, serif' }}>{data.certificatesEarned}</p>
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mt-1">Certificates</p>
          </div>
          <div className="w-px h-9 bg-slate-100" />
          <div>
            <p className="text-[22px] font-bold text-slate-900 leading-none" style={{ fontFamily: 'Cinzel, serif' }}>{data.avgQuizScore}%</p>
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mt-1">Avg Quiz Score</p>
          </div>
        </Card>
      </div>

      <Card className="!p-0 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-slate-100">
          <p className="text-[14px] font-bold text-slate-800">Learning Priority Breakdown</p>
        </div>
        <div className="p-4 space-y-2.5">
          <StatBar label="Required" completed={data.required.completed} total={data.required.total} color="#EF4444" />
          <StatBar label="Recommended" completed={data.recommended.completed} total={data.recommended.total} color="#D4AF37" />
          <StatBar label="Optional" completed={data.optional.completed} total={data.optional.total} color="#94A3B8" />
        </div>
      </Card>

      <Card className="!p-0 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-slate-100">
          <p className="text-[14px] font-bold text-slate-800">Quiz Score Trend</p>
        </div>
        {chartData.length === 0 ? (
          <p className="text-center text-slate-400 text-[13.5px] py-8">Take a quiz to start tracking your score trend.</p>
        ) : (
          <div className="p-4 pl-1">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData} margin={{ top: 5, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={32} />
                <Tooltip
                  formatter={(value: any) => [`${value}%`, 'Score']}
                  labelFormatter={(_label, payload) => payload?.[0]?.payload?.quizTitle ?? ''}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                />
                <Line type="monotone" dataKey="score" stroke="#1A3E5C" strokeWidth={2}
                  dot={(props: any) => (
                    <circle key={`dot-${props.index}`} cx={props.cx} cy={props.cy} r={4}
                      fill={props.payload.passed ? '#10B981' : '#EF4444'} stroke="#fff" strokeWidth={1.5} />
                  )} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card className="!p-0 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-slate-100">
          <p className="text-[14px] font-bold text-slate-800">Recent Activity</p>
        </div>
        {data.recentActivity.length === 0 ? (
          <p className="text-center text-slate-400 text-[13.5px] py-6">No activity yet — start a course to see it here.</p>
        ) : (
          <div className="divide-y divide-slate-50">
            {data.recentActivity.map((a, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                  a.type === 'certificate' ? 'bg-amber-50' : a.title.startsWith('Passed') ? 'bg-green-50' : 'bg-red-50'
                }`}>
                  {a.type === 'certificate'
                    ? <Trophy className="w-3.5 h-3.5 text-amber-500" />
                    : a.title.startsWith('Passed')
                      ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                      : <AlertCircle className="w-3.5 h-3.5 text-red-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13.5px] font-semibold text-slate-800 truncate">{a.title}</p>
                  <p className="text-[12px] text-slate-400 truncate">{a.courseTitle}</p>
                </div>
                <span className="text-[12px] text-slate-400 flex-shrink-0">
                  {new Date(a.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── Main LMS Page ─────────────────────────────────────────────────────────────

export function LMSPage() {
  const { role } = useApp();
  const canSeeCoverage = role === 'co' || role === 'ceo';
  const { data, isLoading } = useLmsCourses();
  const [activeTab, setActiveTab] = useState('My Learning');
  const [selectedCourse, setSelectedCourse] = useState<LmsCourse | null>(null);
  const [typeFilter, setTypeFilter] = useState<'all' | 'certification' | 'guide'>('all');
  const matchesTypeFilter = (c: LmsCourse) =>
    typeFilter === 'all' || (typeFilter === 'certification' ? isCertification(c) : !isCertification(c));

  const designation  = data?.designation ?? null;
  const mandatory    = data?.mandatory   ?? [];
  const recommended  = data?.recommended ?? [];
  const optional     = data?.optional    ?? [];
  const allEnrolled  = [...mandatory, ...recommended, ...optional].filter(c => c.isEnrolled);
  const inProgress   = allEnrolled.filter(c => c.isEnrolled && !c.enrollment?.isCompleted);
  const completed    = allEnrolled.filter(c => c.enrollment?.isCompleted);
  const totalCourses = [...mandatory, ...recommended, ...optional].length;

  const mandatoryF   = mandatory.filter(matchesTypeFilter);
  const recommendedF = recommended.filter(matchesTypeFilter);
  const optionalF    = optional.filter(matchesTypeFilter);
  const inProgressF  = inProgress.filter(c => !mandatory.find(m => m.id === c.id)).filter(matchesTypeFilter);

  // The "optional" bucket mixes two very different things: courses targeted
  // at a different designation/portal role (not required for this viewer,
  // but not free-for-all either) and courses with no targeting at all
  // (genuinely open to anyone). Keeping them visually separate is the whole
  // fix for "why is this showing up for me" confusion.
  const otherRolesF     = optionalF.filter(c => getAssignedTo(c).length > 0);
  const openToEveryoneF = optionalF.filter(c => getAssignedTo(c).length === 0);

  const tabs = [
    `My Learning${allEnrolled.length > 0 ? ` (${allEnrolled.length})` : ''}`,
    'My Performance', 'Explore', 'Certificates',
    ...(canSeeCoverage ? ['Team Coverage'] : []),
  ];

  // Keep the selected course's data fresh as enrollment/progress/quiz state changes.
  const liveSelectedCourse = selectedCourse
    ? [...mandatory, ...recommended, ...optional].find(c => c.id === selectedCourse.id) ?? selectedCourse
    : null;

  if (liveSelectedCourse) {
    return (
      <CourseDetail
        key={liveSelectedCourse.id}
        course={liveSelectedCourse}
        isMandatory={!!mandatory.find(m => m.id === liveSelectedCourse.id)}
        onBack={() => setSelectedCourse(null)}
        onUnenrolled={() => setSelectedCourse(null)}
        onViewCertificates={() => { setSelectedCourse(null); setActiveTab('Certificates'); }}
      />
    );
  }

  const continueCourse = inProgress.length > 0
    ? [...inProgress].sort((a, b) => b.progress - a.progress)[0]
    : null;

  return (
    <div>
      <div className="bg-[#1A3E5C] rounded-xl shadow-sm shadow-slate-900/[0.08] px-6 py-5 mb-4 flex items-center justify-between gap-6 flex-wrap">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center flex-shrink-0">
            <GraduationCap className="w-5 h-5 text-[#D4AF37]" />
          </div>
          <div>
            <h1 className="text-[24px] font-bold text-white tracking-tight" style={{ fontFamily: 'Cinzel, serif' }}>Learning & Development</h1>
            {designation ? (
              <p className="text-[14px] text-white/75 mt-0.5">Your designation: <span className="text-white font-semibold">{designation}</span> · {mandatory.length} required · {recommended.length} recommended</p>
            ) : (
              <p className="flex items-center gap-1.5 text-[13.5px] text-amber-300 mt-0.5">
                <AlertCircle className="w-3.5 h-3.5" /> No LMS designation assigned — ask your Compliance Officer to assign one.
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-white/10 border border-white/15 rounded-xl px-2 py-1.5 flex-shrink-0">
          {([
            { label: 'In Progress', value: inProgress.length, color: '#9BC7E8', icon: Play },
            { label: 'Completed', value: completed.length, color: '#7EEAB8', icon: CheckCircle2 },
            { label: 'Total Courses', value: totalCourses, color: '#D4AF37', icon: BookOpen },
          ]).map((s, i) => (
            <div key={s.label} className={`flex items-center gap-2.5 px-3.5 py-1.5 ${i > 0 ? 'border-l border-white/15' : ''}`}>
              <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
                <s.icon className="w-4 h-4" style={{ color: s.color }} />
              </div>
              <div className="min-w-0">
                <p className="text-[19px] font-bold text-white leading-none" style={{ fontFamily: 'Cinzel, serif' }}>{s.value}</p>
                <p className="text-[10.5px] font-semibold text-white/70 uppercase tracking-wide whitespace-nowrap">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <TabNav tabs={tabs} active={tabs.find(t => t.startsWith(activeTab)) ?? tabs[0]} onChange={t => setActiveTab(t.split(' (')[0])} />

      {(activeTab === 'My Learning' || activeTab === 'Explore') && (
        <div className="flex items-center gap-1.5 mt-3 mb-3">
          {([
            { key: 'all' as const, label: 'All' },
            { key: 'certification' as const, label: 'Certifications', icon: Award },
            { key: 'guide' as const, label: 'Guides', icon: BookOpen },
          ]).map(f => (
            <button key={f.key} onClick={() => setTypeFilter(f.key)}
              className={`inline-flex items-center gap-1.5 text-[12.5px] font-semibold px-2.5 py-1 rounded-full border transition-colors ${
                typeFilter === f.key
                  ? 'bg-[#1A3E5C] text-white border-[#1A3E5C]'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
              }`}>
              {f.icon && <f.icon className="w-3 h-3" />}
              {f.label}
            </button>
          ))}
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
      )}

      {/* My Learning Tab */}
      {!isLoading && activeTab === 'My Learning' && (
        <div className="space-y-5">
          {continueCourse && (
            <Card onClick={() => setSelectedCourse(continueCourse)} className="!p-0 overflow-hidden">
              <div className="flex items-center gap-3.5 p-3.5">
                <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-[#1A3E5C] to-[#15324a] flex-shrink-0 overflow-hidden flex items-center justify-center">
                  {continueCourse.thumbnailUrl ? (
                    <img src={continueCourse.thumbnailUrl} alt="" className="w-full h-full object-cover opacity-80" />
                  ) : (
                    <BookOpen className="w-5 h-5 text-white/40" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11.5px] font-bold text-[#D4AF37] uppercase tracking-wide mb-0.5">Continue Learning</p>
                  <p className="text-[15px] font-bold text-slate-900 truncate" style={{ fontFamily: 'Cinzel, serif' }}>{continueCourse.title}</p>
                  <div className="flex items-center gap-2 mt-1 max-w-xs">
                    <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                      <div className="bg-[#D4AF37] h-1.5 rounded-full" style={{ width: `${continueCourse.progress}%` }} />
                    </div>
                    <span className="text-[12px] text-slate-400 flex-shrink-0">{continueCourse.progress}%</span>
                  </div>
                </div>
                <Btn size="sm" icon={<Play className="w-3.5 h-3.5" />} onClick={e => { e.stopPropagation(); setSelectedCourse(continueCourse); }}>Resume</Btn>
              </div>
            </Card>
          )}
          {mandatoryF.length > 0 && (
            <div>
              <p className="text-[14.5px] font-bold text-slate-800 flex items-center gap-2 mb-2.5">
                <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                Required Courses
                <span className="text-[12px] bg-red-50 text-red-700 px-1.5 py-0.5 rounded font-semibold">{mandatoryF.length}</span>
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {mandatoryF.map(c => <CourseCard key={c.id} course={c} badge="mandatory" onOpen={() => setSelectedCourse(c)} />)}
              </div>
            </div>
          )}
          {inProgressF.length > 0 && (
            <div>
              <p className="text-[14.5px] font-bold text-slate-800 flex items-center gap-2 mb-2.5">
                <Play className="w-3.5 h-3.5 text-[#1A3E5C]" /> In Progress
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {inProgressF.map(c => <CourseCard key={c.id} course={c} onOpen={() => setSelectedCourse(c)} />)}
              </div>
            </div>
          )}
          {allEnrolled.length === 0 && mandatory.length === 0 && (
            <EmptyState icon={<BookOpen className="w-12 h-12" />} title="No courses assigned yet"
              description="Explore courses below or wait for your Compliance Officer to assign your designation."
              action={<Btn onClick={() => setActiveTab('Explore')}>Browse Courses →</Btn>} />
          )}
          {(allEnrolled.length > 0 || mandatory.length > 0) && mandatoryF.length === 0 && inProgressF.length === 0 && (
            <div className="py-12 text-center text-slate-400 text-[14px]">No {typeFilter === 'certification' ? 'certification' : 'guide'} courses in your learning list.</div>
          )}
        </div>
      )}

      {/* Explore Tab */}
      {!isLoading && activeTab === 'Explore' && (
        <div className="space-y-5">
          {recommendedF.length > 0 && (
            <div>
              <p className="text-[14.5px] font-bold text-slate-800 flex items-center gap-2 mb-2.5">
                <Star className="w-3.5 h-3.5 text-[#1A3E5C]" /> Recommended for {designation}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {recommendedF.map(c => <CourseCard key={c.id} course={c} badge="recommended" onOpen={() => setSelectedCourse(c)} />)}
              </div>
            </div>
          )}
          {otherRolesF.length > 0 && (
            <div>
              <p className="text-[14.5px] font-bold text-slate-800 flex items-center gap-2 mb-1">
                <Users className="w-3.5 h-3.5 text-slate-400" /> Assigned to Other Roles
              </p>
              <p className="text-[12.5px] text-slate-400 mb-2.5">Not required for you — shown so you know why they exist, in case you're curious.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {otherRolesF.map(c => <CourseCard key={c.id} course={c} assignedToOthers={getAssignedTo(c)} onOpen={() => setSelectedCourse(c)} />)}
              </div>
            </div>
          )}
          {openToEveryoneF.length > 0 && (
            <div>
              <p className="text-[14.5px] font-bold text-slate-800 flex items-center gap-2 mb-2.5">
                <Globe className="w-3.5 h-3.5 text-[#1A3E5C]" /> Open to Everyone
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {openToEveryoneF.map(c => <CourseCard key={c.id} course={c} onOpen={() => setSelectedCourse(c)} />)}
              </div>
            </div>
          )}
          {optional.length === 0 && recommended.length === 0 && (
            <div className="py-16 text-center text-slate-400">No published courses available yet.</div>
          )}
          {(optional.length > 0 || recommended.length > 0) && optionalF.length === 0 && recommendedF.length === 0 && (
            <div className="py-16 text-center text-slate-400">No {typeFilter === 'certification' ? 'certification' : 'guide'} courses available.</div>
          )}
        </div>
      )}

      {/* My Performance Tab */}
      {!isLoading && activeTab === 'My Performance' && <PerformanceTab />}

      {/* Certificates Tab */}
      {!isLoading && activeTab === 'Certificates' && <CertificatesTab />}

      {/* Team Coverage Tab */}
      {!isLoading && activeTab === 'Team Coverage' && canSeeCoverage && <CoverageTab />}
    </div>
  );
}
