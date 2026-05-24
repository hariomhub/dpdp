import React, { useState } from 'react';
import {
  BookOpen, Award, Play, CheckCircle2, Clock, ChevronRight,
  Loader2, Lock, Trophy, Star, AlertCircle, BookMarked
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  useLmsCourses, useEnrollCourse, useLmsCertificates,
  useMarkLessonComplete, type LmsCourse
} from '../../../hooks/useLms';

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

function ProgressBar({ value, className = '' }: { value: number; className?: string }) {
  return (
    <div className={`w-full bg-slate-100 rounded-full h-1.5 ${className}`}>
      <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${value}%` }} />
    </div>
  );
}

// ─── Course Card ──────────────────────────────────────────────────────────────

function CourseCard({ course, badge, onOpen }: {
  course: LmsCourse
  badge?: 'mandatory' | 'recommended'
  onOpen: () => void
}) {
  const enrollMut = useEnrollCourse();
  const duration = course.estimatedHours > 0
    ? `${course.estimatedHours}h ${course.estimatedMinutes}m`
    : `${course.estimatedMinutes}m`;

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition-all cursor-pointer group"
      onClick={onOpen}>
      {/* Thumbnail */}
      <div className="h-28 bg-gradient-to-br from-blue-600 to-blue-800 relative flex items-center justify-center">
        <BookOpen className="w-10 h-10 text-white/30" />
        {badge && (
          <span className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${
            badge === 'mandatory' ? 'bg-red-500 text-white' : 'bg-blue-400 text-white'
          }`}>
            {badge === 'mandatory' ? 'Required' : 'Recommended'}
          </span>
        )}
        {course.isEnrolled && (
          <span className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500 text-white">
            Enrolled
          </span>
        )}
        {course.enrollment?.isCompleted && (
          <CheckCircle2 className="absolute bottom-2 right-2 w-5 h-5 text-green-400" />
        )}
      </div>

      <div className="p-3.5 space-y-2">
        <div className="flex gap-1.5 flex-wrap">
          <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
            {CATEGORY_LABELS[course.category] ?? course.category}
          </span>
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${DIFFICULTY_COLORS[course.difficulty] ?? ''}`}>
            {course.difficulty}
          </span>
        </div>

        <p className="text-[13px] font-bold text-slate-900 leading-snug line-clamp-2"
          style={{ fontFamily: 'Sora, sans-serif' }}>{course.title}</p>
        <p className="text-[11.5px] text-slate-500 line-clamp-2">{course.description}</p>

        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <Clock className="w-3 h-3" /> {duration}
          <span>·</span>
          <BookMarked className="w-3 h-3" /> {course.totalLessons} lessons
        </div>

        {course.isEnrolled && !course.enrollment?.isCompleted && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-slate-500">{course.progress}% complete</span>
              <span className="text-[11px] text-slate-400">{course.completedLessons}/{course.totalLessons}</span>
            </div>
            <ProgressBar value={course.progress} />
          </div>
        )}

        {!course.isEnrolled && (
          <button
            onClick={e => { e.stopPropagation(); enrollMut.mutate(course.id) }}
            disabled={enrollMut.isPending}
            className="w-full py-1.5 border border-blue-300 text-blue-600 text-[12px] font-semibold rounded-lg hover:bg-blue-50 flex items-center justify-center gap-1.5">
            {enrollMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
            Enroll
          </button>
        )}
        {course.isEnrolled && !course.enrollment?.isCompleted && (
          <button className="w-full py-1.5 bg-blue-600 text-white text-[12px] font-semibold rounded-lg hover:bg-blue-700 flex items-center justify-center gap-1.5">
            <Play className="w-3 h-3" /> Continue
          </button>
        )}
        {course.enrollment?.isCompleted && (
          <div className="flex items-center justify-center gap-1.5 py-1.5 text-[12px] text-green-600 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" /> Completed
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Course Detail ─────────────────────────────────────────────────────────────

function CourseDetail({ course, onBack }: { course: LmsCourse; onBack: () => void }) {
  const markComplete = useMarkLessonComplete();
  const enrollMut    = useEnrollCourse();
  const [openSection, setOpenSection] = useState<string | null>(null);

  const completedSet = new Set(
    course.enrollment
      ? (course as any).sections?.flatMap((s: any) => s.lessons.map((l: any) => l.id)).filter(() => false) // filled from actual progress
      : []
  );

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1.5 text-[12.5px] text-slate-400 hover:text-blue-600">
        ← Back to LMS
      </button>

      <div className="bg-gradient-to-r from-blue-700 to-blue-900 rounded-xl p-6 text-white">
        <div className="flex gap-2 mb-3 flex-wrap">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${DIFFICULTY_COLORS[course.difficulty].replace('bg-', 'bg-opacity-30 bg-').replace('text-', 'text-white ')}`}>
            {course.difficulty}
          </span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20">
            {CATEGORY_LABELS[course.category]}
          </span>
        </div>
        <h1 className="text-[22px] font-bold mb-2" style={{ fontFamily: 'Sora, sans-serif' }}>{course.title}</h1>
        <p className="text-[13px] text-blue-100 leading-relaxed">{course.description}</p>
        <div className="flex items-center gap-4 mt-4 text-[12px] text-blue-200">
          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {course.estimatedHours}h {course.estimatedMinutes}m</span>
          <span className="flex items-center gap-1"><BookMarked className="w-3.5 h-3.5" /> {course.totalLessons} lessons</span>
          {course.certificateTemplate && <span className="flex items-center gap-1"><Award className="w-3.5 h-3.5" /> Certificate on completion</span>}
        </div>
        {course.isEnrolled && !course.enrollment?.isCompleted && (
          <div className="mt-4">
            <div className="flex justify-between text-[11px] text-blue-200 mb-1">
              <span>Progress</span><span>{course.progress}%</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2">
              <div className="bg-white h-2 rounded-full transition-all" style={{ width: `${course.progress}%` }} />
            </div>
          </div>
        )}
      </div>

      {!course.isEnrolled && (
        <button onClick={() => enrollMut.mutate(course.id)} disabled={enrollMut.isPending}
          className="w-full py-3 bg-blue-600 text-white text-[14px] font-semibold rounded-xl hover:bg-blue-700 flex items-center justify-center gap-2">
          {enrollMut.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
          Enroll in this Course
        </button>
      )}

      {/* Curriculum */}
      <div className="space-y-2">
        <p className="text-[14px] font-bold text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>Course Curriculum</p>
        {course.sections?.map((section: any) => (
          <div key={section.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <button onClick={() => setOpenSection(openSection === section.id ? null : section.id)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left">
              <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${openSection === section.id ? 'rotate-90' : ''}`} />
              <p className="text-[13px] font-semibold text-slate-800 flex-1">{section.title}</p>
              <span className="text-[11px] text-slate-400">{section.lessons?.length ?? 0} lessons</span>
            </button>
            {openSection === section.id && (
              <div className="border-t border-slate-100">
                {section.lessons?.map((lesson: any, i: number) => (
                  <div key={lesson.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-50 last:border-0 hover:bg-slate-50">
                    <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 flex-shrink-0">{i+1}</span>
                    <p className="text-[12.5px] text-slate-700 flex-1">{lesson.title}</p>
                    <span className="text-[10.5px] text-slate-400">{lesson.estimatedMinutes}m</span>
                    {course.isEnrolled && (
                      <button
                        onClick={() => markComplete.mutate({ enrollmentId: course.enrollment!.id, lessonId: lesson.id })}
                        className="text-[10.5px] px-2 py-0.5 rounded border border-green-200 text-green-600 hover:bg-green-50">
                        Mark done
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Certificates Tab ──────────────────────────────────────────────────────────

function CertificatesTab() {
  const { data: certs = [], isLoading } = useLmsCertificates();

  if (isLoading) return <div className="flex items-center justify-center h-32"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>;

  if ((certs as any[]).length === 0) return (
    <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-xl">
      <Trophy className="w-12 h-12 text-slate-200 mx-auto mb-3" />
      <p className="text-[14px] font-semibold text-slate-500">No certificates yet</p>
      <p className="text-[12px] text-slate-400 mt-1">Complete a course to earn your first certificate.</p>
    </div>
  );

  return (
    <div className="grid grid-cols-3 gap-4">
      {(certs as any[]).map((c: any) => (
        <div key={c.enrollmentId} className="bg-white border border-slate-200 rounded-xl p-5 text-center space-y-3">
          <div className="w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center mx-auto">
            <Award className="w-8 h-8 text-amber-500" />
          </div>
          <p className="text-[13px] font-bold text-slate-900">{c.courseTitle}</p>
          <p className="text-[11px] text-slate-400">
            Completed {new Date(c.completedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
          {c.certificate && (
            <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-[11px] font-semibold text-amber-700">{c.certificate.title}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main LMS Page ─────────────────────────────────────────────────────────────

export function LMSPage() {
  const { role } = useApp();
  const { data, isLoading } = useLmsCourses();
  const [activeTab, setActiveTab] = useState<'My Learning' | 'Explore' | 'Certificates'>('My Learning');
  const [selectedCourse, setSelectedCourse] = useState<LmsCourse | null>(null);

  const designation  = data?.designation ?? null;
  const mandatory    = data?.mandatory   ?? [];
  const recommended  = data?.recommended ?? [];
  const optional     = data?.optional    ?? [];
  const allEnrolled  = [...mandatory, ...recommended, ...optional].filter(c => c.isEnrolled);
  const inProgress   = allEnrolled.filter(c => c.isEnrolled && !c.enrollment?.isCompleted);
  const completed    = allEnrolled.filter(c => c.enrollment?.isCompleted);
  const totalCourses = [...mandatory, ...recommended, ...optional].length;

  if (selectedCourse) {
    return (
      <div className="max-w-3xl mx-auto">
        <CourseDetail course={selectedCourse} onBack={() => setSelectedCourse(null)} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[20px] font-bold text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>Learning & Development</h1>
          {designation ? (
            <p className="text-[12.5px] text-slate-400 mt-0.5">
              Your designation: <span className="font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded text-[11px]">{designation}</span>
              {' '} · {mandatory.length} required · {recommended.length} recommended
            </p>
          ) : (
            <div className="flex items-center gap-1.5 mt-1 text-[12px] text-amber-600">
              <AlertCircle className="w-3.5 h-3.5" />
              No LMS designation assigned. Ask your Compliance Officer to assign one.
            </div>
          )}
        </div>
        {/* Stats */}
        <div className="flex gap-3">
          {[
            { label: 'In Progress', value: inProgress.length, color: 'text-blue-600' },
            { label: 'Completed',   value: completed.length,  color: 'text-green-600' },
            { label: 'Total',       value: totalCourses,      color: 'text-slate-600' },
          ].map(s => (
            <div key={s.label} className="text-center px-3 py-1.5 bg-white border border-slate-200 rounded-lg">
              <p className={`text-[18px] font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10.5px] text-slate-400">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        {(['My Learning', 'Explore', 'Certificates'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-[12.5px] font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab ? 'border-blue-500 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}>
            {tab}
            {tab === 'My Learning' && allEnrolled.length > 0 && (
              <span className="ml-1.5 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold">{allEnrolled.length}</span>
            )}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
      )}

      {/* My Learning Tab */}
      {!isLoading && activeTab === 'My Learning' && (
        <div className="space-y-6">
          {mandatory.length > 0 && (
            <div>
              <p className="text-[13px] font-bold text-slate-800 flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                Required Courses
                <span className="text-[10px] bg-red-50 text-red-700 px-1.5 py-0.5 rounded font-semibold">{mandatory.length}</span>
              </p>
              <div className="grid grid-cols-3 gap-4">
                {mandatory.map(c => <CourseCard key={c.id} course={c} badge="mandatory" onOpen={() => setSelectedCourse(c)} />)}
              </div>
            </div>
          )}
          {inProgress.filter(c => !mandatory.find(m => m.id === c.id)).length > 0 && (
            <div>
              <p className="text-[13px] font-bold text-slate-800 flex items-center gap-2 mb-3">
                <Play className="w-3.5 h-3.5 text-blue-500" /> In Progress
              </p>
              <div className="grid grid-cols-3 gap-4">
                {inProgress.filter(c => !mandatory.find(m => m.id === c.id)).map(c => <CourseCard key={c.id} course={c} onOpen={() => setSelectedCourse(c)} />)}
              </div>
            </div>
          )}
          {allEnrolled.length === 0 && mandatory.length === 0 && (
            <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-xl">
              <BookOpen className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-[14px] font-semibold text-slate-500">No courses assigned yet</p>
              <p className="text-[12px] text-slate-400 mt-1">Explore courses below or wait for your Compliance Officer to assign your designation.</p>
              <button onClick={() => setActiveTab('Explore')} className="mt-4 px-4 py-2 bg-blue-600 text-white text-[13px] font-semibold rounded-lg hover:bg-blue-700">
                Browse Courses →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Explore Tab */}
      {!isLoading && activeTab === 'Explore' && (
        <div className="space-y-6">
          {recommended.length > 0 && (
            <div>
              <p className="text-[13px] font-bold text-slate-800 flex items-center gap-2 mb-3">
                <Star className="w-3.5 h-3.5 text-blue-500" /> Recommended for {designation}
              </p>
              <div className="grid grid-cols-3 gap-4">
                {recommended.map(c => <CourseCard key={c.id} course={c} badge="recommended" onOpen={() => setSelectedCourse(c)} />)}
              </div>
            </div>
          )}
          {optional.length > 0 && (
            <div>
              <p className="text-[13px] font-bold text-slate-800 mb-3">All Available Courses</p>
              <div className="grid grid-cols-3 gap-4">
                {optional.map(c => <CourseCard key={c.id} course={c} onOpen={() => setSelectedCourse(c)} />)}
              </div>
            </div>
          )}
          {optional.length === 0 && recommended.length === 0 && (
            <div className="py-16 text-center text-slate-400">No published courses available yet.</div>
          )}
        </div>
      )}

      {/* Certificates Tab */}
      {!isLoading && activeTab === 'Certificates' && <CertificatesTab />}
    </div>
  );
}