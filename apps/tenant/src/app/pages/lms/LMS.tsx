import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  GraduationCap, PlayCircle, BookOpen, Award, CheckCircle2, Clock,
  ChevronRight, ChevronLeft, HelpCircle, FileText, Video,
  BarChart2, Plus, Search, Filter, Star, Users, Layers,
  X, ArrowLeft, Play, Check, Lock, BookMarked, Zap
} from 'lucide-react';
import { TabNav, Btn, SearchInput } from '../../components/shared/DesignSystem';
import { LMS_COURSES } from '../../data/mockData';

const CATEGORY_COLORS: Record<string, string> = {
  'DPDP Compliance': '#3B82F6',
  'Portal Usage': '#22C55E',
  'Role-Specific': '#A78BFA',
  'General': '#F59E0B',
};

const DIFF_COLORS: Record<string, { bg: string; text: string }> = {
  'Beginner':     { bg: 'bg-green-50',  text: 'text-green-700'  },
  'Intermediate': { bg: 'bg-amber-50',  text: 'text-amber-700'  },
  'Advanced':     { bg: 'bg-red-50',    text: 'text-red-700'    },
};

// Extended mock data for comprehensive LMS
const QUESTION_BANK = [
  { id: 'QB-001', question: 'Under the DPDP Act 2023, who is primarily responsible for obtaining consent from data principals?', type: 'MCQ', difficulty: 'Intermediate', chapter: 'Chapter 2', options: ['Data Principal', 'Data Fiduciary', 'Data Processor', 'DPDT Board'], correct: 1 },
  { id: 'QB-002', question: 'What is the maximum penalty for a significant data breach under the DPDP Act?', type: 'MCQ', difficulty: 'Advanced', chapter: 'Chapter 8', options: ['₹50 crore', '₹150 crore', '₹250 crore', '₹500 crore'], correct: 2 },
  { id: 'QB-003', question: 'Which of the following is NOT a right granted to Data Principals under the DPDP Act?', type: 'MCQ', difficulty: 'Beginner', chapter: 'Chapter 3', options: ['Right to access information', 'Right to correction', 'Right to compensation', 'Right to erasure'], correct: 2 },
  { id: 'QB-004', question: 'Consent must be obtained before processing personal data.', type: 'True/False', difficulty: 'Beginner', chapter: 'Chapter 2', options: ['True', 'False'], correct: 0 },
  { id: 'QB-005', question: 'What is the role of the Data Protection Board of India (DPDT)?', type: 'MCQ', difficulty: 'Intermediate', chapter: 'Chapter 6', options: ['Collect taxes', 'Adjudicate complaints', 'Issue DPDP certificates', 'Regulate internet service'], correct: 1 },
  { id: 'QB-006', question: 'Which data category is subject to additional safeguards under the DPDP Act?', type: 'MCQ', difficulty: 'Intermediate', chapter: 'Chapter 2', options: ["Children's data (under 18)", 'Business data', 'Public records', 'Aggregated data'], correct: 0 },
  { id: 'QB-007', question: 'A Data Processor acts on behalf of the Data Fiduciary.', type: 'True/False', difficulty: 'Beginner', chapter: 'Chapter 2', options: ['True', 'False'], correct: 0 },
  { id: 'QB-008', question: 'What is "purpose limitation" in the context of DPDP Act?', type: 'MCQ', difficulty: 'Intermediate', chapter: 'Chapter 2', options: ['Limiting the number of data fiduciaries', 'Processing data only for the specified and consented purpose', 'Restricting access to sensitive data', 'Limiting data retention period'], correct: 1 },
];

const VIDEOS = [
  { id: 'V-001', title: 'Introduction to DPDP Act 2023 — Overview', duration: '8:42', instructor: 'Priya Sharma', views: 1240, thumbnail: 'dpdp-intro', category: 'DPDP Compliance', resolution: '1080p' },
  { id: 'V-002', title: 'Understanding Consent under DPDP', duration: '12:15', instructor: 'Rajesh Kumar', views: 890, thumbnail: 'consent', category: 'DPDP Compliance', resolution: '1080p' },
  { id: 'V-003', title: 'How to Navigate the Controls Library', duration: '5:30', instructor: 'System Admin', views: 560, thumbnail: 'controls', category: 'Portal Usage', resolution: '720p' },
  { id: 'V-004', title: 'Creating and Managing Assessments', duration: '9:48', instructor: 'System Admin', views: 430, thumbnail: 'assessments', category: 'Portal Usage', resolution: '720p' },
  { id: 'V-005', title: 'Data Fiduciary Obligations — Deep Dive', duration: '18:22', instructor: 'Sunita Joshi', views: 745, thumbnail: 'fiduciary', category: 'DPDP Compliance', resolution: '1080p' },
  { id: 'V-006', title: 'Evidence Collection Best Practices', duration: '11:05', instructor: 'Manish Kumar', views: 320, thumbnail: 'evidence', category: 'Role-Specific', resolution: '720p' },
];

const QUIZZES = [
  { id: 'QZ-001', title: 'DPDP Act Fundamentals Quiz', questions: 15, duration: '20 min', attempts: 234, avgScore: 73, passMark: 70, status: 'Available', difficulty: 'Beginner', linkedCourse: 'DPDP Act Fundamentals for Everyone' },
  { id: 'QZ-002', title: 'Chapter 2: Consent & Purpose Limitation', questions: 10, duration: '15 min', attempts: 156, avgScore: 68, passMark: 70, status: 'Available', difficulty: 'Intermediate', linkedCourse: 'DPDP Act Fundamentals for Everyone' },
  { id: 'QZ-003', title: 'Data Fiduciary Responsibilities Assessment', questions: 20, duration: '30 min', attempts: 87, avgScore: 81, passMark: 75, status: 'Completed', difficulty: 'Advanced', linkedCourse: 'Advanced Data Fiduciary Obligations' },
  { id: 'QZ-004', title: 'Portal Navigation & Tools Quiz', questions: 8, duration: '10 min', attempts: 312, avgScore: 91, passMark: 60, status: 'Completed', difficulty: 'Beginner', linkedCourse: 'DPDP CMS — Portal Usage Guide' },
  { id: 'QZ-005', title: 'Evidence & Audit Trail Quiz', questions: 12, duration: '18 min', attempts: 64, avgScore: 61, passMark: 70, status: 'Available', difficulty: 'Intermediate', linkedCourse: null },
];

const CERTIFICATES = [
  { id: 'CERT-001', title: 'DPDP Act Fundamentals — Completed', date: '2025-02-15', score: 88, issuer: 'DPDP CMS Platform', validity: 'Valid until Feb 2026', icon: '🎓' },
  { id: 'CERT-002', title: 'Portal Usage Proficiency', date: '2025-01-20', score: 94, issuer: 'DPDP CMS Platform', validity: 'Valid until Jan 2026', icon: '⚡' },
];

export function LMSPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Courses');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [diffFilter, setDiffFilter] = useState('All');
  const [activeQuiz, setActiveQuiz] = useState<any>(null);
  const [quizState, setQuizState] = useState<{ q: number; answers: number[]; submitted: boolean }>({ q: 0, answers: [], submitted: false });
  const [selectedVideo, setSelectedVideo] = useState<any>(null);
  const [selectedQB, setSelectedQB] = useState<string[]>([]);

  const enrolled = LMS_COURSES.filter(c => c.progress > 0);
  const completed = LMS_COURSES.filter(c => c.status === 'Completed');

  const filteredCourses = LMS_COURSES.filter(c => {
    const matchSearch = c.title.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === 'All' || c.category === categoryFilter;
    const matchDiff = diffFilter === 'All' || c.difficulty === diffFilter;
    return matchSearch && matchCat && matchDiff;
  });

  const filteredVideos = VIDEOS.filter(v =>
    v.title.toLowerCase().includes(search.toLowerCase()) &&
    (categoryFilter === 'All' || v.category === categoryFilter)
  );

  const filteredQB = QUESTION_BANK.filter(q =>
    q.question.toLowerCase().includes(search.toLowerCase()) &&
    (diffFilter === 'All' || q.difficulty === diffFilter)
  );

  // Quiz player
  if (activeQuiz) {
    const questions = QUESTION_BANK.slice(0, activeQuiz.questions);
    const currentQ = questions[quizState.q];

    if (quizState.submitted) {
      const score = Math.round((quizState.answers.filter((a, i) => a === questions[i]?.correct).length / questions.length) * 100);
      const passed = score >= activeQuiz.passMark;
      return (
        <div className="max-w-lg mx-auto mt-8">
          <div className="bg-white rounded-xl shadow-md p-6 text-center">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${passed ? 'bg-green-100' : 'bg-red-100'}`}>
              {passed ? <CheckCircle2 className="w-9 h-9 text-green-600" /> : <X className="w-9 h-9 text-red-500" />}
            </div>
            <h2 className="text-[20px] font-bold text-slate-900 mb-1" style={{ fontFamily: 'Sora, sans-serif' }}>
              {passed ? 'Quiz Passed!' : 'Quiz Not Passed'}
            </h2>
            <p className="text-[14px] text-slate-500 mb-4">{activeQuiz.title}</p>
            <div className={`text-[48px] font-bold mb-1 ${passed ? 'text-green-600' : 'text-red-500'}`} style={{ fontFamily: 'Sora, sans-serif' }}>{score}%</div>
            <p className="text-[13px] text-slate-400 mb-6">Pass mark: {activeQuiz.passMark}%</p>
            {passed && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg mb-4 text-left">
                <p className="text-[12px] font-semibold text-green-700">🎓 Certificate Eligible</p>
                <p className="text-[11px] text-green-600 mt-0.5">You can download your certificate for this course.</p>
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => { setActiveQuiz(null); setQuizState({ q: 0, answers: [], submitted: false }); }}
                className="flex-1 py-2 border border-slate-300 text-slate-700 text-[13px] font-medium rounded-lg hover:bg-slate-50">
                Back to Quizzes
              </button>
              {!passed && (
                <button onClick={() => setQuizState({ q: 0, answers: [], submitted: false })}
                  className="flex-1 py-2 bg-blue-600 text-white text-[13px] font-medium rounded-lg hover:bg-blue-700">
                  Retry Quiz
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setActiveQuiz(null)} className="flex items-center gap-1.5 text-[13px] text-slate-500 hover:text-slate-800">
            <ArrowLeft className="w-4 h-4" /> Back to Quizzes
          </button>
          <span className="text-[12px] text-slate-400">Question {quizState.q + 1} of {questions.length}</span>
        </div>

        {/* Progress */}
        <div className="h-1.5 bg-slate-200 rounded-full mb-5 overflow-hidden">
          <div className="h-full bg-blue-600 transition-all rounded-full" style={{ width: `${((quizState.q + 1) / questions.length) * 100}%` }} />
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${DIFF_COLORS[currentQ.difficulty]?.bg} ${DIFF_COLORS[currentQ.difficulty]?.text}`}>
              {currentQ.difficulty}
            </span>
            <span className="text-[11px] text-slate-400">{currentQ.type}</span>
          </div>
          <h3 className="text-[15px] font-semibold text-slate-900 mb-5 leading-snug">{currentQ.question}</h3>
          <div className="space-y-2.5">
            {currentQ.options.map((opt, idx) => {
              const isSelected = quizState.answers[quizState.q] === idx;
              return (
                <button key={idx}
                  onClick={() => {
                    const newAnswers = [...quizState.answers];
                    newAnswers[quizState.q] = idx;
                    setQuizState(p => ({ ...p, answers: newAnswers }));
                  }}
                  className={`w-full text-left px-4 py-3 rounded-lg border text-[13px] transition-all
                    ${isSelected ? 'border-blue-500 bg-blue-50 text-blue-800 font-medium' : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-300 hover:bg-blue-50/50'}`}
                >
                  <span className={`inline-flex w-5 h-5 rounded-full items-center justify-center mr-2 text-[11px] font-bold
                    ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                    {String.fromCharCode(65 + idx)}
                  </span>
                  {opt}
                </button>
              );
            })}
          </div>

          <div className="flex gap-3 mt-6">
            {quizState.q > 0 && (
              <button onClick={() => setQuizState(p => ({ ...p, q: p.q - 1 }))}
                className="px-4 py-2 border border-slate-300 text-slate-700 text-[13px] font-medium rounded-lg hover:bg-slate-50 flex items-center gap-2">
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>
            )}
            {quizState.q < questions.length - 1 ? (
              <button
                onClick={() => setQuizState(p => ({ ...p, q: p.q + 1 }))}
                disabled={quizState.answers[quizState.q] === undefined}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-[13px] font-medium rounded-lg flex items-center justify-center gap-2"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => setQuizState(p => ({ ...p, submitted: true }))}
                disabled={quizState.answers.length < questions.length}
                className="flex-1 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-[13px] font-medium rounded-lg flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" /> Submit Quiz
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Video Player
  if (selectedVideo) {
    return (
      <div>
        <button onClick={() => setSelectedVideo(null)} className="flex items-center gap-1.5 text-[13px] text-slate-500 hover:text-slate-800 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Videos
        </button>
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            {/* Video Player Mock */}
            <div className="bg-slate-900 rounded-xl overflow-hidden aspect-video flex items-center justify-center mb-3 relative">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900" />
              <div className="relative z-10 text-center">
                <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center mx-auto mb-3 cursor-pointer hover:bg-white/30 transition-colors">
                  <Play className="w-8 h-8 text-white ml-1" />
                </div>
                <p className="text-white text-[14px] font-medium">{selectedVideo.title}</p>
                <p className="text-white/60 text-[12px] mt-1">{selectedVideo.duration} · {selectedVideo.resolution}</p>
              </div>
              {/* Controls bar */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 p-3">
                <div className="h-1 bg-white/20 rounded-full mb-2">
                  <div className="h-full bg-blue-500 rounded-full w-1/3" />
                </div>
                <div className="flex items-center gap-3 text-white/80">
                  <Play className="w-4 h-4" />
                  <span className="text-[11px]">4:12 / {selectedVideo.duration}</span>
                  <div className="flex-1" />
                  <span className="text-[11px]">{selectedVideo.resolution}</span>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <h2 className="text-[15px] font-semibold text-slate-900 mb-1">{selectedVideo.title}</h2>
              <div className="flex items-center gap-3 text-[12px] text-slate-500 mb-3">
                <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {selectedVideo.views.toLocaleString()} views</span>
                <span>·</span>
                <span>Instructor: <strong>{selectedVideo.instructor}</strong></span>
                <span>·</span>
                <span className="px-2 py-0.5 rounded text-[11px]" style={{ background: `${CATEGORY_COLORS[selectedVideo.category]}20`, color: CATEGORY_COLORS[selectedVideo.category] }}>
                  {selectedVideo.category}
                </span>
              </div>
              <p className="text-[13px] text-slate-600 leading-relaxed">
                This comprehensive video covers key aspects of the topic, providing practical examples and real-world scenarios to help you understand compliance requirements. Follow along with the exercises and check your understanding with the linked quiz.
              </p>
            </div>
          </div>
          <div>
            <h3 className="text-[13px] font-semibold text-slate-800 mb-3">More Videos</h3>
            <div className="space-y-2.5">
              {VIDEOS.filter(v => v.id !== selectedVideo.id).map(v => (
                <div key={v.id} onClick={() => setSelectedVideo(v)}
                  className="flex gap-2.5 p-2.5 bg-white border border-slate-200 rounded-lg cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all">
                  <div className="w-16 h-12 bg-slate-900 rounded-md flex items-center justify-center flex-shrink-0">
                    <Play className="w-4 h-4 text-white/70" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-slate-800 line-clamp-2 leading-snug">{v.title}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{v.duration}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header Stats */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-[20px] font-bold text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>Learning Center</h1>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-4">
        {[
          { icon: GraduationCap, label: 'In Progress', value: enrolled.length, color: 'text-blue-600', bg: 'bg-blue-50' },
          { icon: CheckCircle2, label: 'Completed', value: completed.length, color: 'text-green-600', bg: 'bg-green-50' },
          { icon: Award, label: 'Certificates', value: CERTIFICATES.length, color: 'text-amber-600', bg: 'bg-amber-50' },
          { icon: HelpCircle, label: 'Quizzes Done', value: QUIZZES.filter(q => q.status === 'Completed').length, color: 'text-violet-600', bg: 'bg-violet-50' },
        ].map(stat => (
          <div key={stat.label} className="bg-white border border-slate-200 rounded-lg p-3 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${stat.bg}`}>
              <stat.icon className={`w-4.5 h-4.5 ${stat.color}`} style={{ width: 18, height: 18 }} />
            </div>
            <div>
              <p className="text-[20px] font-bold text-slate-900 leading-none" style={{ fontFamily: 'Sora, sans-serif' }}>{stat.value}</p>
              <p className="text-[11px] text-slate-500">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <TabNav
        tabs={['Courses', 'Videos', 'Quizzes', 'Question Bank', 'Certificates']}
        active={activeTab}
        onChange={setActiveTab}
      />

      {/* Search + Filters Row */}
      {activeTab !== 'Certificates' && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-48 max-w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              placeholder={`Search ${activeTab.toLowerCase()}...`}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 h-8 rounded-md bg-white border border-slate-300 text-slate-800 placeholder-slate-400 text-[12px] focus:outline-none focus:border-blue-500"
            />
          </div>
          {(activeTab === 'Courses' || activeTab === 'Videos') && (
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
              className="h-8 px-2.5 rounded-md bg-white border border-slate-300 text-slate-700 text-[12px] focus:outline-none focus:border-blue-500">
              <option value="All">All Categories</option>
              <option>DPDP Compliance</option>
              <option>Portal Usage</option>
              <option>Role-Specific</option>
              <option>General</option>
            </select>
          )}
          {(activeTab === 'Courses' || activeTab === 'Question Bank') && (
            <select value={diffFilter} onChange={e => setDiffFilter(e.target.value)}
              className="h-8 px-2.5 rounded-md bg-white border border-slate-300 text-slate-700 text-[12px] focus:outline-none focus:border-blue-500">
              <option value="All">All Levels</option>
              <option>Beginner</option>
              <option>Intermediate</option>
              <option>Advanced</option>
            </select>
          )}
        </div>
      )}

      {/* ── COURSES ─────────────────────────────────────────────────── */}
      {activeTab === 'Courses' && (
        <div>
          {/* Continue Learning */}
          {enrolled.length > 0 && (
            <div className="mb-5">
              <h2 className="text-[14px] font-semibold text-slate-800 mb-2.5">Continue Learning</h2>
              <div className="grid grid-cols-2 gap-3">
                {enrolled.map(course => (
                  <div key={course.id}
                    className="bg-white border border-slate-200 rounded-lg p-3.5 cursor-pointer hover:shadow-md transition-shadow flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: `${CATEGORY_COLORS[course.category]}15` }}>
                      <BookOpen className="w-5 h-5" style={{ color: CATEGORY_COLORS[course.category] }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: `${CATEGORY_COLORS[course.category]}15`, color: CATEGORY_COLORS[course.category] }}>
                        {course.category}
                      </span>
                      <p className="text-[13px] font-semibold text-slate-800 leading-snug mt-1">{course.title}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                          <div className="h-full bg-blue-600 rounded-full" style={{ width: `${course.progress}%` }} />
                        </div>
                        <span className="text-[11px] text-slate-500 flex-shrink-0">{course.progress}%</span>
                      </div>
                      <button className="mt-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-medium rounded-md">
                        Continue →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All Courses Grid */}
          <h2 className="text-[14px] font-semibold text-slate-800 mb-2.5">All Courses</h2>
          <div className="grid grid-cols-3 gap-3">
            {filteredCourses.map(course => (
              <div key={course.id}
                className="bg-white border border-slate-200 rounded-lg overflow-hidden cursor-pointer hover:shadow-md transition-shadow">
                {/* Thumbnail */}
                <div className="h-28 flex items-center justify-center relative overflow-hidden"
                  style={{ background: `${CATEGORY_COLORS[course.category]}10` }}>
                  <BookOpen className="w-10 h-10 opacity-40" style={{ color: CATEGORY_COLORS[course.category] }} />
                  {course.status === 'Completed' && (
                    <div className="absolute top-2 right-2 bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
                      <Check className="w-2.5 h-2.5" /> Done
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: `${CATEGORY_COLORS[course.category]}15`, color: CATEGORY_COLORS[course.category] }}>
                      {course.category}
                    </span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${DIFF_COLORS[course.difficulty]?.bg} ${DIFF_COLORS[course.difficulty]?.text}`}>
                      {course.difficulty}
                    </span>
                  </div>
                  <h3 className="text-[12.5px] font-semibold text-slate-800 leading-snug mb-1">{course.title}</h3>
                  <p className="text-[11px] text-slate-400 line-clamp-2 mb-2">{course.description}</p>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 mb-2">
                    <span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> {course.duration}</span>
                    <span>{course.lessons} lessons</span>
                    <span className="flex items-center gap-1"><Users className="w-2.5 h-2.5" /> {course.enrolled}</span>
                  </div>

                  {course.progress > 0 && course.status !== 'Completed' && (
                    <div className="mb-2">
                      <div className="flex justify-between text-[10px] mb-1">
                        <span className="text-slate-400">Progress</span>
                        <span className="text-slate-600">{course.progress}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                        <div className="h-full bg-blue-600 rounded-full" style={{ width: `${course.progress}%` }} />
                      </div>
                    </div>
                  )}

                  <button className={`w-full py-1.5 rounded-md text-[11px] font-medium transition-colors
                    ${course.status === 'Completed'
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : course.progress > 0
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-slate-100 border border-slate-200 text-slate-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600'
                    }`}>
                    {course.status === 'Completed' ? '✓ Completed' : course.progress > 0 ? 'Continue' : 'Start Course'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── VIDEOS ─────────────────────────────────────────────────── */}
      {activeTab === 'Videos' && (
        <div className="grid grid-cols-3 gap-3">
          {filteredVideos.map(video => (
            <div key={video.id} onClick={() => setSelectedVideo(video)}
              className="bg-white border border-slate-200 rounded-lg overflow-hidden cursor-pointer hover:shadow-md transition-shadow">
              {/* Thumbnail */}
              <div className="h-32 bg-slate-900 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-900" />
                <div className="relative z-10 text-center">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-1">
                    <Play className="w-5 h-5 text-white ml-0.5" />
                  </div>
                  <span className="text-white/70 text-[11px]">{video.duration}</span>
                </div>
                <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                  {video.resolution}
                </div>
              </div>
              <div className="p-3">
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded mb-1 inline-block"
                  style={{ background: `${CATEGORY_COLORS[video.category]}15`, color: CATEGORY_COLORS[video.category] }}>
                  {video.category}
                </span>
                <h3 className="text-[12.5px] font-semibold text-slate-800 leading-snug mb-1">{video.title}</h3>
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <span>{video.instructor}</span>
                  <span>·</span>
                  <span className="flex items-center gap-1"><Users className="w-2.5 h-2.5" /> {video.views.toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── QUIZZES ─────────────────────────────────────────────────── */}
      {activeTab === 'Quizzes' && (
        <div className="space-y-3">
          {QUIZZES.map(quiz => (
            <div key={quiz.id} className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                  ${quiz.status === 'Completed' ? 'bg-green-50' : 'bg-violet-50'}`}>
                  {quiz.status === 'Completed'
                    ? <CheckCircle2 className="w-5 h-5 text-green-600" />
                    : <HelpCircle className="w-5 h-5 text-violet-600" />
                  }
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-[13px] font-semibold text-slate-800">{quiz.title}</h3>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${DIFF_COLORS[quiz.difficulty]?.bg} ${DIFF_COLORS[quiz.difficulty]?.text}`}>
                      {quiz.difficulty}
                    </span>
                    {quiz.status === 'Completed' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-green-50 text-green-700">Completed</span>
                    )}
                  </div>
                  {quiz.linkedCourse && (
                    <p className="text-[11px] text-slate-400 mb-2">Linked to: {quiz.linkedCourse}</p>
                  )}
                  <div className="flex items-center gap-4 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1"><HelpCircle className="w-3 h-3" /> {quiz.questions} questions</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {quiz.duration}</span>
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {quiz.attempts} attempts</span>
                    <span>Avg score: <strong className="text-slate-700">{quiz.avgScore}%</strong></span>
                    <span>Pass mark: <strong className="text-slate-700">{quiz.passMark}%</strong></span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setActiveQuiz(quiz);
                    setQuizState({ q: 0, answers: [], submitted: false });
                  }}
                  className={`px-4 py-2 text-[12px] font-medium rounded-lg border transition-all flex-shrink-0
                    ${quiz.status === 'Completed'
                      ? 'bg-slate-50 border-slate-300 text-slate-600 hover:bg-slate-100'
                      : 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700'
                    }`}
                >
                  {quiz.status === 'Completed' ? 'Retake' : 'Start Quiz'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── QUESTION BANK ────────────────────────────────────────────── */}
      {activeTab === 'Question Bank' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[12px] text-slate-500">{filteredQB.length} questions in bank</p>
            <div className="flex items-center gap-2">
              {selectedQB.length > 0 && (
                <span className="text-[12px] text-blue-600">{selectedQB.length} selected</span>
              )}
              <button className="px-3 py-1.5 bg-blue-600 text-white text-[12px] font-medium rounded-md hover:bg-blue-700 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Add Question
              </button>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="w-10 px-3 py-2.5"></th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Question</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Difficulty</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Chapter</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {filteredQB.map(q => (
                  <tr key={q.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-3">
                      <input type="checkbox" className="accent-blue-600 w-3.5 h-3.5"
                        checked={selectedQB.includes(q.id)}
                        onChange={() => setSelectedQB(prev => prev.includes(q.id) ? prev.filter(id => id !== q.id) : [...prev, q.id])}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[12.5px] font-medium text-slate-800 leading-snug">{q.question}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{q.options.length} options</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] px-2 py-0.5 rounded bg-violet-50 text-violet-700 font-medium">{q.type}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] px-2 py-0.5 rounded font-medium ${DIFF_COLORS[q.difficulty]?.bg} ${DIFF_COLORS[q.difficulty]?.text}`}>
                        {q.difficulty}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] text-slate-500">{q.chapter}</span>
                    </td>
                    <td className="px-4 py-3">
                      <button className="text-[11px] text-blue-600 hover:underline">Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── CERTIFICATES ─────────────────────────────────────────────── */}
      {activeTab === 'Certificates' && (
        <div>
          {CERTIFICATES.length > 0 ? (
            <div className="grid grid-cols-2 gap-4">
              {CERTIFICATES.map(cert => (
                <div key={cert.id} className="bg-white border border-amber-200 rounded-xl p-5 relative overflow-hidden">
                  {/* Decorative */}
                  <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-full -translate-y-1/2 translate-x-1/2" />
                  <div className="absolute top-3 right-3">
                    <Award className="w-8 h-8 text-amber-400" />
                  </div>
                  <div className="relative z-10">
                    <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-widest mb-2">Certificate of Completion</p>
                    <h3 className="text-[15px] font-bold text-slate-900 mb-3 leading-snug pr-10">{cert.title}</h3>
                    <div className="flex items-center gap-4 text-[11px] text-slate-500 mb-4">
                      <span>Score: <strong className="text-green-700">{cert.score}%</strong></span>
                      <span>·</span>
                      <span>Issued: {cert.date}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mb-4">{cert.validity}</p>
                    <div className="flex gap-2">
                      <button className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-white text-[12px] font-medium rounded-lg transition-colors">
                        Download PDF
                      </button>
                      <button className="px-4 py-2 border border-slate-300 text-slate-600 text-[12px] rounded-lg hover:bg-slate-50">
                        Share
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {/* Locked certificates */}
              {LMS_COURSES.filter(c => c.status !== 'Completed').slice(0, 2).map(course => (
                <div key={course.id} className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                    <Lock className="w-6 h-6 text-slate-400" />
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-slate-500">Complete to Unlock</p>
                    <p className="text-[13px] text-slate-700 mt-0.5">{course.title}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="w-24 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${course.progress}%` }} />
                      </div>
                      <span className="text-[11px] text-slate-400">{course.progress}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <Award className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-[14px] font-medium text-slate-500">No certificates yet</p>
              <p className="text-[12px] text-slate-400">Complete courses and pass quizzes to earn certificates</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
