import React, { useState } from 'react';
import {
  Plus, Play, BookOpen, BarChart2, Search, Edit2, Eye,
  Trash2, GripVertical, X, Check, Image, FileText, Video,
  Award, Download, AlertTriangle, Loader2
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import {
  useCourses, useCourse, useCreateCourse, useUpdateCourse, useSyncCourseContent,
  useQuestions, useCreateQuestion,
  useCertificateTemplates, useCreateCertificateTemplate,
  useDesignations, useCreateDesignation, useUpdateDesignation, useDeleteDesignation,
  useCourseDesignations, useSetCourseDesignations
} from '../../../hooks/useLms';
import toast from 'react-hot-toast';

// Enrollment trend kept as mock — requires tenant portal data
const ENROLLMENT_DATA = [
  { month: 'Nov', enrollments: 145 }, { month: 'Dec', enrollments: 170 },
  { month: 'Jan', enrollments: 42 }, { month: 'Feb', enrollments: 68 }, { month: 'Mar', enrollments: 91 },
  { month: 'Apr', enrollments: 124 },
];

// Certificate issuance log kept as mock — requires tenant portal data
const CERT_LOG = [
  { id: 'CERT-2025-001', learner: 'Amit Rao', org: 'TechNova Solutions', course: 'DPDP Compliance Fundamentals', issued: '2025-04-20', status: 'Active' },
  { id: 'CERT-2025-002', learner: 'Priya Sharma', org: 'TechNova Solutions', course: 'How to Use the DPDP CMS Portal', issued: '2025-04-18', status: 'Active' },
  { id: 'CERT-2025-003', learner: 'Manish Kumar', org: 'TechNova Solutions', course: 'Evidence Submission Best Practices', issued: '2025-04-15', status: 'Active' },
  { id: 'CERT-2025-004', learner: 'Nandan Reddy', org: 'Infosys BPO Ltd', course: 'DPDP Compliance Fundamentals', issued: '2025-04-12', status: 'Revoked' },
];

//  Content Item Modals 
type ContentModal = { type: 'section' | 'video' | 'reading' | 'assignment' | null };

function ContentModal({ type, onClose, onSave }: { type: ContentModal['type']; onClose: () => void; onSave: (item: any) => void }) {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [videoSrc, setVideoSrc] = useState<'upload' | 'embed'>('upload');
  const [contentType, setContentType] = useState<'rich' | 'file'>('rich');
  const [submissionType, setSubmissionType] = useState('Text Response');

  if (!type) return null;

  const TITLES = { section: 'Add Section', video: 'Add Video Lesson', reading: 'Add Reading Material', assignment: 'Add Assignment' };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-[520px] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200">
          <p className="text-[15px] font-bold text-slate-900">{TITLES[type]}</p>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400 hover:text-slate-700" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-[11.5px] font-medium text-slate-700 mb-1">{type === 'section' ? 'Section Title' : 'Title'} <span className="text-slate-400">**</span></label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder={type === 'section' ? 'e.g., Introduction to DPDP' : 'e.g., Understanding Consent'}
              className="w-full h-10 px-3 rounded-lg border border-slate-300 text-[13px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400" />
          </div>

          {type === 'section' && (
            <div>
              <label className="block text-[11.5px] font-medium text-slate-700 mb-1">Description <span className="text-slate-400 font-normal">(optional)</span></label>
              <textarea rows={2} value={desc} onChange={e => setDesc(e.target.value)} placeholder="Brief description of this section…"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-[12.5px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400 resize-none" />
            </div>
          )}

          {type === 'video' && (
            <>
              <div>
                <label className="block text-[11.5px] font-medium text-slate-700 mb-1">Description <span className="text-slate-400 font-normal">(optional)</span></label>
                <textarea rows={2} value={desc} onChange={e => setDesc(e.target.value)} placeholder="What will learners learn from this video?"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-[12.5px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400 resize-none" />
              </div>
              <div>
                <label className="block text-[11.5px] font-medium text-slate-700 mb-2">Video Source</label>
                <div className="flex gap-2 mb-3">
                  {[{ val: 'upload', label: 'Upload File' }, { val: 'embed', label: 'Embed URL' }].map(s => (
                    <button key={s.val} onClick={() => setVideoSrc(s.val as any)}
                      className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-all ${videoSrc === s.val ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-200 text-slate-600 hover:border-slate-400'}`}>{s.label}</button>
                  ))}
                </div>
                {videoSrc === 'upload' ? (
                  <div className="h-24 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center text-[12px] text-slate-400 cursor-pointer hover:border-slate-400 hover:text-slate-600 transition-colors">
                    <Video className="w-6 h-6 mb-1" />
                    Drag and drop video file here, or click to browse
                    <span className="text-[10.5px] mt-0.5">MP4, MOV, AVI — max 2GB</span>
                  </div>
                ) : (
                  <input placeholder="https://youtube.com/embed/... or https://vimeo.com/..."
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 text-[12.5px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400" />
                )}
              </div>
            </>
          )}

          {type === 'reading' && (
            <>
              <div>
                <label className="block text-[11.5px] font-medium text-slate-700 mb-2">Content Type</label>
                <div className="flex gap-2 mb-3">
                  {[{ val: 'rich', label: 'Rich Text' }, { val: 'file', label: 'Upload File' }].map(s => (
                    <button key={s.val} onClick={() => setContentType(s.val as any)}
                      className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-all ${contentType === s.val ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-200 text-slate-600 hover:border-slate-400'}`}>{s.label}</button>
                  ))}
                </div>
                {contentType === 'rich' ? (
                  <div className="border border-slate-300 rounded-lg overflow-hidden">
                    <div className="flex gap-1 px-2 py-1.5 border-b border-slate-200 bg-slate-50 text-[11px] text-slate-500">
                      {['B', 'I', 'U', '• List', '1. List'].map(t => <button key={t} className="px-1.5 py-0.5 hover:bg-slate-200 rounded font-medium transition-colors">{t}</button>)}
                    </div>
                    <textarea rows={6} placeholder="Write the reading material content here…"
                      className="w-full px-3 py-2 text-[12.5px] text-slate-900 placeholder-slate-400 focus:outline-none resize-none" />
                  </div>
                ) : (
                  <div className="h-20 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center text-[12px] text-slate-400 cursor-pointer hover:border-slate-400 hover:text-slate-600 transition-colors">
                    <FileText className="w-5 h-5 mb-1" />
                    Upload PDF or DOCX file
                  </div>
                )}
              </div>
            </>
          )}

          {type === 'assignment' && (
            <>
              <div>
                <label className="block text-[11.5px] font-medium text-slate-700 mb-1">Instructions <span className="text-slate-400">**</span></label>
                <textarea rows={4} placeholder="Describe what learners need to do for this assignment…"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-[12.5px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400 resize-none" />
              </div>
              <div>
                <label className="block text-[11.5px] font-medium text-slate-700 mb-2">Submission Type</label>
                <div className="flex gap-2">
                  {['Text Response', 'File Upload', 'Both'].map(s => (
                    <button key={s} onClick={() => setSubmissionType(s)}
                      className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-all ${submissionType === s ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-200 text-slate-600 hover:border-slate-400'}`}>{s}</button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
        <div className="flex items-center gap-3 px-5 py-4 border-t border-slate-200">
          <button onClick={onClose} className="px-4 py-2 border border-slate-300 text-[13px] text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
          <button onClick={() => { onSave({ type, title, desc }); onClose(); }} disabled={!title}
            className="flex-1 py-2 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-200 disabled:text-slate-400 text-white text-[13px] font-semibold rounded-lg transition-colors">
            Save {TITLES[type].replace('Add ', '')} →
          </button>
        </div>
      </div>
    </div>
  );
}

//  Question Form (Add Question / Quiz) 
type QType = 'MCQ' | 'True-False' | 'Descriptive';
function QuestionFormModal({ onClose, onSave }: { onClose: () => void; onSave: (q: any) => void }) {
  const [qType, setQType] = useState<QType>('MCQ');
  const [text, setText] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correct, setCorrect] = useState(0);
  const [tfCorrect, setTfCorrect] = useState<'True' | 'False'>('True');
  const [modelAnswer, setModelAnswer] = useState('');
  const [wordLimit, setWordLimit] = useState('');
  const [marks, setMarks] = useState(2);
  const [difficulty, setDifficulty] = useState('Medium');
  const [topic, setTopic] = useState('');
  const { mutate: createQuestion, isPending: savingQ } = useCreateQuestion();

  const handleSaveQuestion = () => {
    if (!text) return;
    createQuestion({
      questionText: text,
      type: qType === 'True-False' ? 'TRUE_FALSE' : qType.toUpperCase() as any,
      marks,
      difficulty: difficulty.toUpperCase() as any,
      topic: topic || undefined,
      tfCorrectAnswer: qType === 'True-False' ? (tfCorrect === 'True') : undefined,
      modelAnswer: qType === 'Descriptive' ? modelAnswer : undefined,
      wordLimit: wordLimit ? parseInt(wordLimit) : undefined,
      options: qType === 'MCQ' ? options
        .map((opt, i) => ({ optionText: opt, isCorrect: i === correct, orderIndex: i }))
        .filter(o => o.optionText) : undefined,
    } as any, {
      onSuccess: () => { onSave({ text, type: qType, marks, difficulty, topic }); onClose(); },
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-[580px] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200">
          <p className="text-[15px] font-bold text-slate-900">Add Question</p>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400 hover:text-slate-700" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-[11.5px] font-medium text-slate-700 mb-1">Question Text <span className="text-slate-400">**</span></label>
            <textarea rows={3} value={text} onChange={e => setText(e.target.value)} placeholder="Enter the question…"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-[12.5px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400 resize-none" />
          </div>
          <div>
            <label className="block text-[11.5px] font-medium text-slate-700 mb-2">Question Type <span className="text-slate-400">**</span></label>
            <div className="flex gap-2">
              {(['MCQ', 'True-False', 'Descriptive'] as const).map(t => (
                <button key={t} onClick={() => setQType(t)}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-all ${qType === t ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-200 text-slate-600 hover:border-slate-400'}`}>{t}</button>
              ))}
            </div>
          </div>

          {qType === 'MCQ' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11.5px] font-medium text-slate-700">Answer Options (mark correct)</label>
                {options.length < 6 && (
                  <button onClick={() => setOptions(p => [...p, ''])} className="text-[11px] text-slate-700 hover:text-slate-800 font-medium flex items-center gap-1"><Plus className="w-3 h-3" /> Add Option</button>
                )}
              </div>
              <div className="space-y-2">
                {options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <button onClick={() => setCorrect(i)} className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${correct === i ? 'border-green-500 bg-green-500' : 'border-slate-300'}`}>
                      {correct === i && <Check className="w-3 h-3 text-white" />}
                    </button>
                    <input value={opt} onChange={e => setOptions(p => p.map((o, j) => j === i ? e.target.value : o))} placeholder={`Option ${i + 1}`}
                      className="flex-1 h-9 px-3 rounded-md border border-slate-300 text-[12.5px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400" />
                    {options.length > 2 && <button onClick={() => setOptions(p => p.filter((_, j) => j !== i))} className="text-slate-300 hover:text-slate-400 transition-colors"><X className="w-3.5 h-3.5" /></button>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {qType === 'True-False' && (
            <div>
              <label className="block text-[11.5px] font-medium text-slate-700 mb-2">Correct Answer</label>
              <div className="flex gap-3">
                {(['True', 'False'] as const).map(v => (
                  <button key={v} onClick={() => setTfCorrect(v)}
                    className={`px-6 py-2 rounded-lg text-[12.5px] font-medium border transition-all ${tfCorrect === v ? 'bg-green-600 text-white border-green-600' : 'border-slate-200 text-slate-600 hover:border-green-300'}`}>{v}</button>
                ))}
              </div>
            </div>
          )}

          {qType === 'Descriptive' && (
            <>
              <div>
                <label className="block text-[11.5px] font-medium text-slate-700 mb-1">Model Answer <span className="text-slate-400">**</span></label>
                <textarea rows={4} value={modelAnswer} onChange={e => setModelAnswer(e.target.value)} placeholder="Reference answer for manual grading…"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-[12.5px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400 resize-none" />
                <p className="text-[10.5px] text-slate-400 mt-0.5">Reference answer for manual grading</p>
              </div>
              <div>
                <label className="block text-[11.5px] font-medium text-slate-700 mb-1">Word Limit <span className="text-slate-400 font-normal">(optional)</span></label>
                <input type="number" value={wordLimit} onChange={e => setWordLimit(e.target.value)} placeholder="e.g., 300"
                  className="w-32 h-9 px-3 rounded-lg border border-slate-300 text-[12.5px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400" />
                <p className="text-[10.5px] text-slate-400 mt-0.5">Leave empty for no word limit</p>
              </div>
            </>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11.5px] font-medium text-slate-700 mb-1">Marks <span className="text-slate-400">**</span></label>
              <input type="number" value={marks} onChange={e => setMarks(Number(e.target.value))} min={1} max={20}
                className="w-full h-9 px-3 rounded-lg border border-slate-300 text-[12.5px] text-slate-900 focus:outline-none focus:border-slate-400" />
            </div>
            <div>
              <label className="block text-[11.5px] font-medium text-slate-700 mb-1">Difficulty</label>
              <select value={difficulty} onChange={e => setDifficulty(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-300 text-[12.5px] text-slate-900 focus:outline-none focus:border-slate-400 bg-white">
                {['Easy', 'Medium', 'Hard'].map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11.5px] font-medium text-slate-700 mb-1">Topic / Tag</label>
              <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g., Consent"
                className="w-full h-9 px-3 rounded-lg border border-slate-300 text-[12.5px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400" />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2 border-t border-slate-200">
            <button onClick={onClose} className="px-4 py-2 border border-slate-300 text-[13px] text-slate-600 rounded-lg hover:bg-slate-50">Cancel</button>
            <button onClick={handleSaveQuestion} disabled={!text || savingQ}
              className="flex-1 py-2 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-200 disabled:text-slate-400 text-white text-[13px] font-semibold rounded-lg flex items-center justify-center gap-2">
              {savingQ ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Save Question →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

//  Certificate Template Builder 
function CertTemplateBuilder({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ name: '', layout: 'classic', title: 'Certificate of Completion', body: 'This is to certify that {learner_name} has successfully completed {course_name} on {completion_date}.', signatory: '', designation: '', bg: '#FFFFFF' });
  const up = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));
  const [preview, setPreview] = useState(false);
  const VARS = ['{learner_name}', '{course_name}', '{completion_date}', '{certificate_id}', '{organization_name}'];
  const { mutate: createTemplate, isPending: savingTemplate } = useCreateCertificateTemplate();

  const handleSaveTemplate = () => {
    if (!form.name) { toast.error('Template name is required'); return; }
    createTemplate({
      name: form.name,
      layout: form.layout.toUpperCase() as any,
      titleText: form.title,
      bodyText: form.body,
      signatory: form.signatory || undefined,
      designation: form.designation || undefined,
      bgColor: form.bg,
      isDefault: false,
    } as any, { onSuccess: () => onClose() });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-end z-50" onClick={onClose}>
      <div className="w-[860px] h-full bg-white border-l border-slate-200 overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 sticky top-0 bg-white z-10">
          <p className="text-[15px] font-bold text-slate-900">Create Certificate Template</p>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400 hover:text-slate-700" /></button>
        </div>
        <div className="p-5 space-y-5">
          {preview ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-bold text-slate-800">Preview (Sample Data)</p>
                <button onClick={() => setPreview(false)} className="text-[12px] text-slate-700 font-medium hover:text-slate-800">← Back to Editor</button>
              </div>
              <div className="rounded-xl border-2 border-slate-200 overflow-hidden" style={{ background: form.bg, minHeight: 320, fontFamily: 'Sora, sans-serif' }}>
                <div className="h-1.5 w-full bg-indigo-600" />
                <div className="p-10 text-center">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-4">DPDP CMS Platform</p>
                  <h1 className="text-[28px] font-bold text-slate-800 mb-2">{form.title}</h1>
                  <p className="text-[13px] text-slate-500 mb-8">
                    {form.body.replace('{learner_name}', 'Amit Rao').replace('{course_name}', 'DPDP Compliance Fundamentals').replace('{completion_date}', 'April 26, 2025').replace('{certificate_id}', 'CERT-2025-001').replace('{organization_name}', 'TechNova Solutions')}
                  </p>
                  <div className="flex justify-center gap-16 mt-8">
                    {form.signatory && <div className="text-center"><div className="h-10 border-b border-slate-400 w-32 mb-1" /><p className="text-[11.5px] font-medium text-slate-700">{form.signatory}</p><p className="text-[10.5px] text-slate-400">{form.designation}</p></div>}
                    <div className="text-center"><div className="h-10 border-b border-slate-400 w-32 mb-1" /><p className="text-[11.5px] font-medium text-slate-700">Platform Director</p><p className="text-[10.5px] text-slate-400">DPDP CMS</p></div>
                  </div>
                  <p className="text-[10px] text-slate-300 font-mono mt-6">Certificate ID: CERT-2025-001</p>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-[11.5px] font-medium text-slate-700 mb-1">Template Name <span className="text-slate-400">**</span></label>
                <input value={form.name} onChange={e => up('name', e.target.value)} placeholder="e.g., Professional Certificate"
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 text-[13px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400" />
              </div>
              <div>
                <label className="block text-[11.5px] font-medium text-slate-700 mb-2">Layout</label>
                <div className="grid grid-cols-3 gap-3">
                  {[{ val: 'classic', label: 'Classic', preview: '' }, { val: 'modern', label: 'Modern', preview: '' }, { val: 'minimal', label: 'Minimal', preview: '' }].map(l => (
                    <button key={l.val} onClick={() => up('layout', l.val)}
                      className={`p-3 border-2 rounded-lg text-center transition-all ${form.layout === l.val ? 'border-slate-900 bg-slate-50' : 'border-slate-200 hover:border-slate-400'}`}>
                      <p className="text-[18px] mb-1 font-mono text-slate-400">{l.preview}</p>
                      <p className="text-[12px] font-medium text-slate-700">{l.label}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[11.5px] font-medium text-slate-700 mb-1">Certificate Title Text</label>
                <input value={form.title} onChange={e => up('title', e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 text-[13px] text-slate-900 focus:outline-none focus:border-slate-400" />
              </div>
              <div>
                <label className="block text-[11.5px] font-medium text-slate-700 mb-1">Body Text</label>
                <textarea rows={3} value={form.body} onChange={e => up('body', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-[12.5px] text-slate-900 focus:outline-none focus:border-slate-400 resize-none" />
                <p className="text-[10.5px] text-slate-400 mt-1">Available variables:</p>
                <div className="flex gap-1.5 flex-wrap mt-1">
                  {VARS.map(v => <span key={v} className="font-mono text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded">{v}</span>)}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11.5px] font-medium text-slate-700 mb-1">Signatory Name</label>
                  <input value={form.signatory} onChange={e => up('signatory', e.target.value)} placeholder="e.g., Rajesh Kumar"
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 text-[13px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400" />
                </div>
                <div>
                  <label className="block text-[11.5px] font-medium text-slate-700 mb-1">Signatory Designation</label>
                  <input value={form.designation} onChange={e => up('designation', e.target.value)} placeholder="e.g., Head of Compliance"
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 text-[13px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400" />
                </div>
              </div>
              <div>
                <label className="block text-[11.5px] font-medium text-slate-700 mb-1">Background Color</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={form.bg} onChange={e => up('bg', e.target.value)} className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer" />
                  <span className="text-[12px] text-slate-500">Or select pattern: </span>
                  <div className="h-8 w-8 rounded border border-slate-200 bg-white" />
                  <div className="h-8 w-8 rounded border border-slate-200" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #f8fafc 0, #f8fafc 2px, transparent 0, transparent 50%)', backgroundSize: '8px 8px' }} />
                </div>
              </div>
            </>
          )}
          <div className="flex items-center gap-3 pt-3 border-t border-slate-200">
            <button onClick={() => setPreview(!preview)} className="px-4 py-2 border border-slate-300 text-[13px] text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">
              {preview ? '← Edit' : 'Preview Certificate'}
            </button>
            <button onClick={onClose} className="px-4 py-2 border border-slate-300 text-[13px] text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
            <button onClick={handleSaveTemplate} disabled={savingTemplate}
              className="flex-1 py-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-60 text-white text-[13px] font-semibold rounded-lg transition-colors flex items-center justify-center gap-2">
              {savingTemplate ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Save Template →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

//  Course Builder 
type CourseFormStep = 1 | 2 | 3;
type SectionItem = { id: string; title: string; items: { id: string; type: string; title: string }[] };
type QuizQuestion = { id: string; text: string; type: string; marks: number; difficulty: string };

function CourseForm({ courseId, onClose }: { courseId?: string; onClose: () => void }) {
  const { data: fullCourseData, isLoading: isLoadingCourse } = useCourse(courseId || '');
  const [step, setStep] = useState<CourseFormStep>(1);
  const [form, setForm] = useState({ title: '', desc: '', category: 'DPDP Compliance', difficulty: 'Beginner', durationH: '', durationM: '', status: 'Draft', certTemplate: '' });
  
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [includeQuiz, setIncludeQuiz] = useState(false);
  const [quizTitle, setQuizTitle] = useState('End of Course Quiz');
  const [passThreshold, setPassThreshold] = useState(70);
  const [timeLimit, setTimeLimit] = useState('');
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);

  React.useEffect(() => {
    if (courseId && fullCourseData) {
      setForm({
        title: fullCourseData.title || '',
        desc: fullCourseData.description || '',
        category: fullCourseData.category?.replace('_', ' ') || 'DPDP Compliance',
        difficulty: fullCourseData.difficulty || 'Beginner',
        durationH: String(fullCourseData.estimatedHours || ''),
        durationM: String(fullCourseData.estimatedMinutes || ''),
        status: fullCourseData.status === 'PUBLISHED' ? 'Published' : 'Draft',
        certTemplate: (fullCourseData as any).certificateTemplate?.name || ''
      });

      if ((fullCourseData as any).sections && (fullCourseData as any).sections.length > 0) {
        setSections((fullCourseData as any).sections.map((s: any) => ({
          id: s.id,
          title: s.title,
          items: (s.lessons || []).map((l: any) => ({ id: l.id, type: l.type.replace('_', '-').toLowerCase(), title: l.title }))
        })));

        const lastSection = (fullCourseData as any).sections[(fullCourseData as any).sections.length - 1];
        if (lastSection.quiz) {
          setIncludeQuiz(true);
          setQuizTitle(lastSection.quiz.title);
          setPassThreshold(lastSection.quiz.passThreshold);
          setTimeLimit(lastSection.quiz.timeLimitMins ? String(lastSection.quiz.timeLimitMins) : '');
          setQuizQuestions((lastSection.quiz.questions || []).map((q: any) => ({
            id: q.id,
            text: q.questionText,
            type: q.type === 'TRUE_FALSE' ? 'True-False' : q.type.charAt(0) + q.type.slice(1).toLowerCase(),
            marks: q.marks,
            difficulty: q.difficulty.charAt(0) + q.difficulty.slice(1).toLowerCase()
          })));
        }
      }
    }
  }, [fullCourseData, courseId]);

  const up = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));
  const { mutate: createCourse, isPending: savingCourse } = useCreateCourse();
  const { mutate: updateCourse, isPending: updatingCourse } = useUpdateCourse();
  const { mutate: syncContent, isPending: syncingContent } = useSyncCourseContent();
  const { data: certTemplatesData } = useCertificateTemplates();
  const certTemplates = certTemplatesData ?? [];

  const { data: designations = [] } = useDesignations();
  const { data: courseDesignations = [] } = useCourseDesignations(courseId || '');
  const { mutate: setCourseDesignations } = useSetCourseDesignations();
  const [selectedDesignations, setSelectedDesignations] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    if (courseDesignations.length > 0) {
      setSelectedDesignations(new Set(courseDesignations.map((d: any) => d.designationId)));
    }
  }, [courseDesignations]);

  const handleSaveCourse = (status: 'DRAFT' | 'PUBLISHED') => {
    if (!form.title) { toast.error('Course title is required'); return; }
    const selectedTemplate = certTemplates.find((t: any) => t.name === form.certTemplate);
    const payload = {
      title: form.title,
      description: form.desc,
      category: form.category.toUpperCase().replace(/ /g, '_') as any,
      difficulty: form.difficulty.toUpperCase() as any,
      estimatedHours: parseInt(form.durationH || '0'),
      estimatedMinutes: parseInt(form.durationM || '0'),
      status,
      certificateTemplateId: selectedTemplate?.id ?? undefined,
    };
    
    const contentPayload = {
      sections,
      quiz: includeQuiz ? {
        title: quizTitle,
        passThreshold,
        timeLimit,
        questions: quizQuestions
      } : null
    };

    if (courseId) {
      updateCourse({ id: courseId, ...payload } as any, { onSuccess: () => {
        syncContent({ courseId: courseId, data: contentPayload }, { onSuccess: () => {
          if (selectedDesignations.size >= 0) {
            setCourseDesignations({ courseId: courseId, targets: Array.from(selectedDesignations).map(id => ({ designationId: id, isMandatory: true })) });
          }
          toast.success('Course saved successfully');
          onClose();
        }});
      }});
    } else {
      createCourse(payload as any, { onSuccess: (res: any) => {
        if (res?.data?.id) {
          syncContent({ courseId: res.data.id, data: contentPayload }, { onSuccess: () => {
            if (selectedDesignations.size > 0) {
              setCourseDesignations({ courseId: res.data.id, targets: Array.from(selectedDesignations).map(id => ({ designationId: id, isMandatory: true })) });
            }
            toast.success('Course created successfully');
            onClose();
          }});
        } else {
          onClose();
        }
      }});
    }
  };


  const [showQForm, setShowQForm] = useState(false);
  const totalMarks = quizQuestions.reduce((s, q) => s + q.marks, 0);

  const [contentModal, setContentModal] = useState<{ type: ContentModal['type']; sectionId: string | null }>({ type: null, sectionId: null });

  const addToSection = (sectionId: string, item: any) => {
    setSections(p => p.map(s => s.id === sectionId ? { ...s, items: [...s.items, { id: String(Date.now()), type: item.type, title: item.title }] } : s));
  };
  const addSection = (item: any) => {
    setSections(p => [...p, { id: String(Date.now()), title: item.title, items: [] }]);
  };

  const STEPS = ['Course Details', 'Build Content', 'Add Quiz'];

  const TYPE_ICON: Record<string, React.ReactNode> = {
    video: <Video className="w-3.5 h-3.5 text-blue-400" />,
    reading: <FileText className="w-3.5 h-3.5 text-green-400" />,
    assignment: <BookOpen className="w-3.5 h-3.5 text-amber-400" />,
    section: <BookOpen className="w-3.5 h-3.5 text-slate-400" />,
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-end z-50" onClick={onClose}>
      {contentModal.type && (
        <ContentModal type={contentModal.type} onClose={() => setContentModal({ type: null, sectionId: null })}
          onSave={item => {
            if (contentModal.type === 'section') addSection(item);
            else if (contentModal.sectionId) addToSection(contentModal.sectionId, { ...item, type: contentModal.type });
          }} />
      )}
      {showQForm && <QuestionFormModal onClose={() => setShowQForm(false)} onSave={q => setQuizQuestions(p => [...p, { ...q, id: String(Date.now()) }])} />}

      <div className="w-[860px] h-full bg-white border-l border-slate-200 overflow-y-auto" onClick={e => e.stopPropagation()}>
        {isLoadingCourse ? (
          <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>
        ) : (
          <>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-4">
            <p className="text-[15px] font-bold text-slate-900">{courseId ? 'Edit Course' : 'Create Course'}</p>
            <div className="flex items-center gap-2">
              {STEPS.map((s, i) => (
                <React.Fragment key={s}>
                  <button onClick={() => setStep((i + 1) as CourseFormStep)}
                    className={`text-[11.5px] font-medium px-2.5 py-1 rounded-full transition-all ${step === i + 1 ? 'bg-slate-800 text-white' : step > i + 1 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}>
                    {i + 1}. {s}
                  </button>
                  {i < 2 && <div className="w-4 h-px bg-slate-200" />}
                </React.Fragment>
              ))}
            </div>
          </div>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400 hover:text-slate-700" /></button>
        </div>

        <div className="p-5">
          {/* Step 1 */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-[11.5px] font-medium text-slate-700 mb-1">Course Title <span className="text-slate-400">**</span></label>
                <input value={form.title} onChange={e => up('title', e.target.value)} placeholder="e.g., DPDP Compliance Fundamentals"
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 text-[13px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400" />
              </div>
              <div>
                <label className="block text-[11.5px] font-medium text-slate-700 mb-1">Description <span className="text-slate-400">**</span></label>
                <textarea rows={3} value={form.desc} onChange={e => up('desc', e.target.value)} placeholder="What will learners gain from this course?"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-[12.5px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400 resize-none" />
                <p className="text-[10.5px] text-slate-400 mt-0.5">Shown on the course card and detail page</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Category', key: 'category', opts: ['DPDP Compliance', 'Portal Usage', 'Role-Specific', 'General'] },
                  { label: 'Difficulty Level', key: 'difficulty', opts: ['Beginner', 'Intermediate', 'Advanced'] },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-[11.5px] font-medium text-slate-700 mb-1">{f.label} <span className="text-slate-400">**</span></label>
                    <select value={(form as any)[f.key]} onChange={e => up(f.key, e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-slate-300 text-[12.5px] text-slate-900 focus:outline-none focus:border-slate-400 bg-white">
                      {f.opts.map(o => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                ))}
                <div>
                  <label className="block text-[11.5px] font-medium text-slate-700 mb-1">Estimated Duration <span className="text-slate-400">**</span></label>
                  <div className="flex gap-2">
                    <input value={form.durationH} onChange={e => up('durationH', e.target.value)} placeholder="0" type="number" min={0}
                      className="w-20 h-10 px-3 rounded-lg border border-slate-300 text-[12.5px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400" />
                    <span className="self-center text-[12px] text-slate-500">hrs</span>
                    <input value={form.durationM} onChange={e => up('durationM', e.target.value)} placeholder="0" type="number" min={0} max={59}
                      className="w-20 h-10 px-3 rounded-lg border border-slate-300 text-[12.5px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400" />
                    <span className="self-center text-[12px] text-slate-500">min</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[11.5px] font-medium text-slate-700 mb-1">Certificate Template</label>
                  <select value={form.certTemplate} onChange={e => up('certTemplate', e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 text-[12.5px] text-slate-900 focus:outline-none focus:border-slate-400 bg-white">
                    <option value="">No certificate</option>
                    {certTemplates.map((t: any) => <option key={t.id} value={t.name}>{t.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[11.5px] font-medium text-slate-700 mb-1">Thumbnail</label>
                <div className="h-24 px-3 rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-[12px] text-slate-400 cursor-pointer hover:border-slate-400 hover:text-slate-600 transition-colors">
                  <Image className="w-5 h-5 mb-1" />
                  Drag and drop or click to upload. Recommended: 1280×720px
                </div>
              </div>
              <div>
                <label className="block text-[11.5px] font-medium text-slate-700 mb-1">Target Designations</label>
                <div className="space-y-2 max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-2.5">
                  {(designations as any[]).map((d: any) => (
                    <label key={d.id} className="flex items-center gap-2 text-[12.5px] text-slate-700 cursor-pointer">
                      <input type="checkbox" checked={selectedDesignations.has(d.id)}
                        onChange={(e) => {
                          const newSet = new Set(selectedDesignations);
                          if (e.target.checked) newSet.add(d.id);
                          else newSet.delete(d.id);
                          setSelectedDesignations(newSet);
                        }} 
                        className="accent-slate-800"
                      />
                      <span className="font-medium text-slate-900">{d.name}</span> 
                      <span className="text-[11px] text-slate-400">— {d.description}</span>
                    </label>
                  ))}
                  {(designations as any[]).length === 0 && <p className="text-[11px] text-slate-400 p-1">No designations available.</p>}
                </div>
              </div>
              <div>
                <label className="block text-[11.5px] font-medium text-slate-700 mb-1">Status</label>
                <div className="flex gap-2">
                  {['Draft', 'Published'].map(s => (
                    <button key={s} onClick={() => up('status', s)}
                      className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-all ${form.status === s ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-200 text-slate-600 hover:border-slate-400'}`}>{s}</button>
                  ))}
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button onClick={() => setStep(2)} className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-[13px] font-semibold rounded-lg">Next: Build Content →</button>
              </div>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-bold text-slate-800">Course Sections</p>
                <button onClick={() => setContentModal({ type: 'section', sectionId: null })}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] border border-dashed border-slate-300 rounded-lg text-slate-500 hover:border-slate-400 hover:text-slate-600 transition-colors">
                  <Plus className="w-3.5 h-3.5" /> Add Section
                </button>
              </div>
              {sections.map((sec, si) => (
                <div key={sec.id} className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 border-b border-slate-200">
                    <GripVertical className="w-3.5 h-3.5 text-slate-300 cursor-grab" />
                    <p className="text-[12.5px] font-semibold text-slate-800 flex-1">Section {si + 1}: {sec.title}</p>
                    <button onClick={() => setSections(p => p.filter(s => s.id !== sec.id))} className="p-1 text-slate-300 hover:text-slate-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                  {sec.items.map((item, li) => (
                    <div key={item.id} className="flex items-center gap-3 px-5 py-2.5 border-b border-slate-50 last:border-0 hover:bg-slate-50">
                      <GripVertical className="w-3 h-3 text-slate-200 cursor-grab" />
                      {TYPE_ICON[item.type] || <FileText className="w-3.5 h-3.5 text-slate-400" />}
                      <p className="text-[12px] text-slate-700 flex-1">{item.title}</p>
                      <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded capitalize">{item.type}</span>
                      <button onClick={() => setSections(p => p.map(s => s.id === sec.id ? { ...s, items: s.items.filter(i => i.id !== item.id) } : s))} className="p-1 text-slate-300 hover:text-slate-400 transition-colors"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  ))}
                  <div className="flex gap-2 px-5 py-2.5 bg-slate-50">
                    {([['video', 'Video Lesson'], ['reading', 'Reading Material'], ['assignment', 'Assignment']] as [ContentModal['type'], string][]).map(([t, label]) => (
                      <button key={t} onClick={() => setContentModal({ type: t, sectionId: sec.id })}
                        className="flex items-center gap-1 px-2 py-1 text-[10.5px] border border-dashed border-slate-300 rounded text-slate-400 hover:border-slate-400 hover:text-slate-600 transition-colors">
                        <Plus className="w-2.5 h-2.5" /> {label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {sections.length === 0 && (
                <div className="py-10 text-center text-[12px] text-slate-400">
                  <BookOpen className="w-8 h-8 mx-auto mb-2 text-slate-200" />
                  No sections yet. Add a section to start building content.
                </div>
              )}
              <div className="flex justify-between pt-2">
                <button onClick={() => setStep(1)} className="px-4 py-2 border border-slate-300 text-[13px] text-slate-600 rounded-lg hover:bg-slate-50">← Back</button>
                <button onClick={() => setStep(3)} className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-[13px] font-semibold rounded-lg">Next: Add Quiz →</button>
              </div>
            </div>
          )}

          {/* Step 3 — Quiz Builder */}
          {step === 3 && (
            <div className="space-y-4">
              {showQForm && <QuestionFormModal onClose={() => setShowQForm(false)} onSave={q => setQuizQuestions(p => [...p, { ...q, id: String(Date.now()) }])} />}
              <div>
                <p className="text-[13px] font-bold text-slate-800 mb-1">Add Quiz (Optional)</p>
                <p className="text-[12px] text-slate-500">Add a quiz learners must pass to complete this course.</p>
              </div>
              <label className="flex items-center gap-3 cursor-pointer p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                <div onClick={() => setIncludeQuiz(v => !v)} className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${includeQuiz ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${includeQuiz ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </div>
                <span className="text-[12.5px] font-medium text-slate-700">Include a quiz for this course</span>
              </label>

              {includeQuiz && (
                <>
                  {/* Quiz settings */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                    <p className="text-[11.5px] font-bold text-slate-600 uppercase tracking-wide">Quiz Settings</p>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">Quiz Title</label>
                        <input value={quizTitle} onChange={e => setQuizTitle(e.target.value)}
                          className="w-full h-9 px-3 rounded-md border border-slate-300 text-[12.5px] text-slate-900 focus:outline-none focus:border-slate-400 bg-white" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">Pass Threshold (%)</label>
                        <div className="flex items-center gap-2">
                          <input type="number" value={passThreshold} onChange={e => setPassThreshold(Number(e.target.value))} min={0} max={100}
                            className="w-20 h-9 px-3 rounded-md border border-slate-300 text-[12.5px] text-slate-900 focus:outline-none focus:border-slate-400 bg-white" />
                          <span className="text-[11px] text-slate-400">% min to pass</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">Time Limit (optional)</label>
                        <div className="flex items-center gap-2">
                          <input type="number" value={timeLimit} onChange={e => setTimeLimit(e.target.value)} placeholder="e.g., 30" min={1}
                            className="w-20 h-9 px-3 rounded-md border border-slate-300 text-[12.5px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400 bg-white" />
                          <span className="text-[11px] text-slate-400">minutes</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-1 border-t border-slate-200">
                      <span className="text-[11.5px] text-slate-500">Total Marks (auto):</span>
                      <span className="text-[13px] font-bold text-slate-800">{totalMarks}</span>
                      <span className="text-[11px] text-slate-400">· {quizQuestions.length} questions</span>
                    </div>
                  </div>

                  {/* Questions */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[12.5px] font-bold text-slate-800">{quizQuestions.length} Questions Added</p>
                      <div className="flex gap-2">
                        <button className="flex items-center gap-1.5 px-3 py-1.5 text-[11.5px] border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
                          + Add from Question Bank
                        </button>
                        <button onClick={() => setShowQForm(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-[11.5px] font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                          <Plus className="w-3.5 h-3.5" /> Create New Question
                        </button>
                      </div>
                    </div>

                    {quizQuestions.map((q, idx) => (
                      <div key={q.id} className="flex items-start gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 group">
                        <GripVertical className="w-4 h-4 text-slate-300 cursor-grab flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[11px] font-bold text-slate-400">Q{idx + 1}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${q.type === 'MCQ' ? 'bg-blue-50 text-blue-700' : q.type === 'True-False' ? 'bg-purple-50 text-purple-700' : 'bg-orange-50 text-orange-700'}`}>{q.type}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${q.difficulty === 'Easy' ? 'bg-green-50 text-green-700' : q.difficulty === 'Medium' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'}`}>{q.difficulty}</span>
                          </div>
                          <p className="text-[12px] text-slate-700 line-clamp-2">{q.text}</p>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="text-[11px] font-semibold text-slate-600">{q.marks} marks</span>
                          <button className="p-1 text-slate-300 hover:text-slate-400 transition-colors opacity-0 group-hover:opacity-100">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {quizQuestions.length === 0 && (
                      <div className="py-8 text-center text-[12px] text-slate-400 border border-dashed border-slate-200 rounded-lg">
                        No questions added yet. Create a new question or add from the Question Bank.
                      </div>
                    )}
                  </div>
                </>
              )}

              <div className="flex justify-between pt-2 border-t border-slate-200">
                <button onClick={() => setStep(2)} className="px-4 py-2 border border-slate-300 text-[13px] text-slate-600 rounded-lg hover:bg-slate-50">← Back</button>
                <div className="flex gap-2">
                  <button onClick={() => handleSaveCourse('DRAFT')} disabled={savingCourse}
                    className="px-4 py-2 border border-slate-300 text-[13px] text-slate-600 rounded-lg hover:bg-slate-50 disabled:opacity-60 flex items-center gap-2">
                    {savingCourse ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Save as Draft
                  </button>
                  <button onClick={() => handleSaveCourse('PUBLISHED')} disabled={savingCourse}
                    className="px-5 py-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-60 text-white text-[13px] font-semibold rounded-lg flex items-center gap-2">
                    {savingCourse ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Save and Publish
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        </>
      )}
    </div>
    </div>
  );
}

//  Main LMS Page 
// ─── Designations Tab ─────────────────────────────────────────────────────────
function DesignationsTab() {
  const { data: designations = [], isLoading } = useDesignations()
  const createMut = useCreateDesignation()
  const updateMut = useUpdateDesignation()
  const deleteMut = useDeleteDesignation()

  const [showForm, setShowForm]   = useState(false)
  const [editItem, setEditItem]   = useState<any>(null)
  const [name, setName]           = useState('')
  const [desc, setDesc]           = useState('')
  const [order, setOrder]         = useState(0)

  const openCreate = () => { setEditItem(null); setName(''); setDesc(''); setOrder(0); setShowForm(true) }
  const openEdit   = (d: any) => { setEditItem(d); setName(d.name); setDesc(d.description ?? ''); setOrder(d.displayOrder); setShowForm(true) }

  const handleSave = async () => {
    if (!name.trim()) return
    if (editItem) await updateMut.mutateAsync({ id: editItem.id, name: name.trim(), description: desc || undefined, displayOrder: order })
    else          await createMut.mutateAsync({ name: name.trim(), description: desc || undefined, displayOrder: order })
    setShowForm(false)
  }

  const ROLE_SUGGESTION: Record<string, string> = {
    CEO: 'Chief Executive Officer', CFO: 'Chief Financial Officer',
    CISO: 'Chief Information Security Officer', CTO: 'Chief Technology Officer',
    COO: 'Chief Operating Officer', CLO: 'Chief Legal Officer',
    CPO: 'Chief Privacy Officer', DPO: 'Data Protection Officer',
    IT_LEAD: 'IT Team Lead', MANAGER: 'Department Manager',
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[16px] font-bold text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>LMS Designations</h2>
          <p className="text-[12px] text-slate-400 mt-0.5">Define business roles for LMS learning paths. Tenants assign these to their users.</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-[13px] font-semibold rounded-lg hover:bg-slate-800">
          + New Designation
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl shadow-xl w-[420px] p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <p className="text-[15px] font-bold text-slate-900">{editItem ? 'Edit' : 'New'} Designation</p>
            <div>
              <label className="block text-[11.5px] font-medium text-slate-600 mb-1">Name (e.g. CISO) *</label>
              <input value={name} onChange={e => setName(e.target.value.toUpperCase())} placeholder="CISO"
                className="w-full h-9 px-3 rounded-lg border border-slate-300 text-[13px] font-mono focus:outline-none focus:border-slate-700" />
              {ROLE_SUGGESTION[name] && <p className="text-[11px] text-blue-600 mt-1">Full form: {ROLE_SUGGESTION[name]}</p>}
            </div>
            <div>
              <label className="block text-[11.5px] font-medium text-slate-600 mb-1">Description</label>
              <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2}
                placeholder="Who is this for and what courses should they take..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-[12.5px] resize-none focus:outline-none focus:border-slate-700" />
            </div>
            <div>
              <label className="block text-[11.5px] font-medium text-slate-600 mb-1">Display Order</label>
              <input type="number" value={order} onChange={e => setOrder(Number(e.target.value))} min={0}
                className="w-24 h-9 px-3 rounded-lg border border-slate-300 text-[13px] focus:outline-none focus:border-slate-700" />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-slate-300 text-[13px] text-slate-600 rounded-lg">Cancel</button>
              <button onClick={handleSave} disabled={!name.trim() || createMut.isPending || updateMut.isPending}
                className="flex-1 py-2 bg-slate-900 text-white text-[13px] font-semibold rounded-lg hover:bg-slate-800 disabled:opacity-50">
                {editItem ? 'Save' : 'Create'} →
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-32"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-[12.5px]">
            <thead><tr className="border-b border-slate-100 bg-slate-50 text-slate-500 text-left">
              {['Designation', 'Description', 'Courses', 'Order', 'Status', ''].map(h => (
                <th key={h} className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {(designations as any[]).length === 0 && (
                <tr><td colSpan={6} className="py-12 text-center text-slate-400">No designations yet. Create one above.</td></tr>
              )}
              {(designations as any[]).map((d: any) => (
                <tr key={d.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px]">{d.name}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 max-w-xs">{d.description ?? <span className="text-slate-300">—</span>}</td>
                  <td className="px-4 py-3">
                    <span className="text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-semibold">
                      {d._count?.courses ?? 0} courses
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{d.displayOrder}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${d.isActive ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {d.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(d)} className="text-[11.5px] px-2 py-1 border border-slate-200 rounded hover:bg-slate-50 text-slate-600">Edit</button>
                      <button onClick={() => deleteMut.mutate(d.id)} disabled={d._count?.courses > 0}
                        className="text-[11.5px] px-2 py-1 border border-red-100 rounded hover:bg-red-50 text-red-400 disabled:opacity-30 disabled:cursor-not-allowed">Del</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <p className="text-[12.5px] font-semibold text-blue-800 mb-1">How Designations Work</p>
        <p className="text-[12px] text-blue-600">
          Assign these designations to LMS courses (in the Courses tab → Edit → Target Designations).
          Tenant CO/CEO assigns a designation to each user. When assigned, users are auto-enrolled in all
          mandatory courses for that designation.
        </p>
      </div>
    </div>
  )
}

function CoursePreviewModal({ courseId, onClose }: { courseId: string; onClose: () => void }) {
  const { data: course, isLoading } = useCourse(courseId);

  if (isLoading) return <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50"><Loader2 className="w-8 h-8 animate-spin text-white" /></div>;
  if (!course) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50" onClick={onClose}>
       <div className="bg-white rounded-xl shadow-xl w-[600px] max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
           <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 shrink-0">
             <h2 className="text-[16px] font-bold text-slate-900">Preview: {course.title}</h2>
             <button onClick={onClose}><X className="w-4 h-4 text-slate-400 hover:text-slate-600" /></button>
           </div>
           <div className="p-5 space-y-4 overflow-y-auto">
             <div className="flex gap-2">
               <span className="px-2 py-1 bg-slate-100 rounded text-[11px] font-medium">{course.category?.replace('_', ' ')}</span>
               <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-[11px] font-medium">{course.difficulty}</span>
               <span className="px-2 py-1 bg-slate-100 rounded text-[11px] font-medium">{course.estimatedHours}h {course.estimatedMinutes}m</span>
             </div>
             <p className="text-[13px] text-slate-600">{course.description}</p>
             
             <div className="mt-4 border border-slate-200 rounded-lg overflow-hidden">
                <div className="px-4 py-2 bg-slate-50 border-b border-slate-200">
                  <p className="text-[12px] font-bold text-slate-800">Course Curriculum</p>
                </div>
                {(course as any).sections?.length === 0 && <div className="p-4 text-center text-[12px] text-slate-400">No content added yet.</div>}
                {(course as any).sections?.map((sec: any, i: number) => (
                  <div key={sec.id} className="border-b border-slate-100 last:border-0">
                    <div className="px-4 py-2 bg-slate-50/50">
                       <p className="text-[12.5px] font-semibold text-slate-800">Section {i+1}: {sec.title}</p>
                    </div>
                    {sec.lessons?.map((l: any, j: number) => (
                       <div key={l.id} className="px-5 py-2 flex items-center gap-2 hover:bg-slate-50">
                          <Play className="w-3 h-3 text-blue-500" />
                          <p className="text-[12px] text-slate-600">{j+1}. {l.title}</p>
                          <span className="ml-auto text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-400">{l.type}</span>
                       </div>
                    ))}
                    {sec.quiz && (
                       <div className="px-5 py-2 flex items-center gap-2 hover:bg-slate-50 border-t border-slate-100">
                          <Award className="w-3.5 h-3.5 text-amber-500" />
                          <p className="text-[12px] text-slate-600">{sec.quiz.title} ({sec.quiz.questions?.length} Questions) - Passing: {sec.quiz.passThreshold}%</p>
                       </div>
                    )}
                  </div>
                ))}
             </div>
           </div>
       </div>
    </div>
  )
}


export function AdminLMSPage() {
  const [activeTab, setActiveTab] = useState<'Courses' | 'Question Bank' | 'Analytics' | 'Certificates' | 'Designations'>('Courses');
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState<any>(null);
  const [previewCourse, setPreviewCourse] = useState<any>(null);
  const [showQForm, setShowQForm] = useState(false);
  const [showCertBuilder, setShowCertBuilder] = useState(false);
  const [search, setSearch] = useState('');
  const [qTypeFilter, setQTypeFilter] = useState('All');
  const [qDiffFilter, setQDiffFilter] = useState('All');
  const [revokeId, setRevokeId] = useState<string | null>(null);

  // API hooks
  const { data: coursesData, isLoading: coursesLoading } = useCourses();
  const courses = coursesData?.data ?? [];

  const { data: questionsData, isLoading: questionsLoading } = useQuestions({
    type: qTypeFilter !== 'All' ? qTypeFilter.toUpperCase().replace('-', '_') : undefined,
    difficulty: qDiffFilter !== 'All' ? qDiffFilter.toUpperCase() : undefined,
    search: search || undefined,
  });
  const questions = questionsData?.data ?? [];

  const { data: certTemplatesRaw, isLoading: certLoading } = useCertificateTemplates();
  const certTemplates = certTemplatesRaw ?? [];

  const DIFF_COLORS: Record<string, string> = { Easy: 'bg-green-50 text-green-700', Medium: 'bg-amber-50 text-amber-700', Hard: 'bg-rose-50 text-rose-700', EASY: 'bg-green-50 text-green-700', MEDIUM: 'bg-amber-50 text-amber-700', HARD: 'bg-rose-50 text-rose-700' };
  const TYPE_COLORS: Record<string, string> = { MCQ: 'bg-blue-50 text-blue-700', 'True-False': 'bg-purple-50 text-purple-700', TRUE_FALSE: 'bg-purple-50 text-purple-700', Descriptive: 'bg-orange-50 text-orange-700', DESCRIPTIVE: 'bg-orange-50 text-orange-700' };

  return (
    <div className="space-y-4">
      {(showCourseForm || editingCourse) && <CourseForm courseId={editingCourse?.id} onClose={() => { setShowCourseForm(false); setEditingCourse(null); }} />}
      {previewCourse && <CoursePreviewModal courseId={previewCourse.id} onClose={() => setPreviewCourse(null)} />}
      {showQForm && <QuestionFormModal onClose={() => setShowQForm(false)} onSave={() => {}} />}
      {showCertBuilder && <CertTemplateBuilder onClose={() => setShowCertBuilder(false)} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-bold text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>LMS Content</h1>
          <p className="text-[12px] text-slate-400 mt-0.5">Learning Management System · {courses.filter((c: any) => c.status === 'PUBLISHED').length} published courses · {questions.length} questions</p>
        </div>
        {activeTab === 'Courses' && (
          <button onClick={() => setShowCourseForm(true)} className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-[13px] font-medium rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> Create Course
          </button>
        )}
        {activeTab === 'Question Bank' && (
          <button onClick={() => setShowQForm(true)} className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-[13px] font-medium rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> Add Question
          </button>
        )}
        {activeTab === 'Certificates' && (
          <button onClick={() => setShowCertBuilder(true)} className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-[13px] font-medium rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> Create Template
          </button>
        )}
      </div>

      <div className="flex border-b border-slate-200 gap-0">
        {(['Courses', 'Question Bank', 'Analytics', 'Certificates', 'Designations'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 text-[12.5px] font-medium border-b-2 transition-colors -mb-px ${activeTab === tab ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            {tab}
          </button>
        ))}
      </div>

      {/* Courses Tab */}
      {activeTab === 'Courses' && (
        coursesLoading
          ? <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
          : <div className="grid grid-cols-3 gap-4">
          {courses.map((c: any) => (
            <div key={c.id} className="bg-white border border-slate-200 rounded-lg overflow-hidden hover:shadow-sm transition-shadow">
              <div className="h-28 bg-slate-50 border-b border-slate-100 flex items-center justify-center">
                <BookOpen className="w-12 h-12 text-slate-200" />
              </div>
              <div className="p-3.5">
                <div className="flex items-start gap-2 mb-1">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${c.status === 'PUBLISHED' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>{c.status}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-medium flex-shrink-0">{c.difficulty}</span>
                </div>
                <p className="text-[13px] font-bold text-slate-900 leading-tight mb-1">{c.title}</p>
                <p className="text-[10.5px] text-slate-400 mb-2">{c._count?.sections ?? 0} sections · {c.estimatedHours}h {c.estimatedMinutes}m</p>
                <div className="flex gap-2">
                  <button onClick={() => setEditingCourse(c)} className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"><Edit2 className="w-3 h-3" /> Edit</button>
                  <button onClick={() => setPreviewCourse(c)} className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"><Eye className="w-3 h-3" /> Preview</button>
                </div>
              </div>
            </div>
          ))}
          {courses.length === 0 && <div className="col-span-3 py-16 text-center text-[12px] text-slate-400"><BookOpen className="w-8 h-8 mx-auto mb-2 text-slate-200" />No courses yet. Create your first course.</div>}
        </div>
      )}

      {/* Question Bank Tab */}
      {activeTab === 'Question Bank' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-2.5">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search questions…"
                className="w-full pl-8 pr-3 h-8 rounded-md border border-slate-200 text-[12.5px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400" />
            </div>
            <select value={qTypeFilter} onChange={e => setQTypeFilter(e.target.value)} className="h-8 px-2 rounded-md border border-slate-200 text-[12px] text-slate-700 focus:outline-none focus:border-slate-400 bg-white">
              {['All', 'MCQ', 'True-False', 'Descriptive'].map(o => <option key={o}>{o}</option>)}
            </select>
            <select value={qDiffFilter} onChange={e => setQDiffFilter(e.target.value)} className="h-8 px-2 rounded-md border border-slate-200 text-[12px] text-slate-700 focus:outline-none focus:border-slate-400 bg-white">
              {['All', 'Easy', 'Medium', 'Hard'].map(o => <option key={o}>{o}</option>)}
            </select>
            <span className="ml-auto text-[11px] text-slate-400">{questions.length} questions</span>
          </div>
          {questionsLoading
            ? <div className="flex items-center justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
            : <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-[12px]">
              <thead><tr className="border-b border-slate-100 bg-slate-50 text-left text-slate-500">
                {['Question', 'Type', 'Difficulty', 'Marks', 'Topic', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {questions.map((q: any) => (
                  <tr key={q.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3 max-w-[300px]"><p className="truncate text-slate-800 font-medium">{q.questionText}</p></td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-[10.5px] font-semibold ${TYPE_COLORS[q.type] || 'bg-slate-100 text-slate-600'}`}>{q.type}</span></td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-[10.5px] font-semibold ${DIFF_COLORS[q.difficulty] || ''}`}>{q.difficulty}</span></td>
                    <td className="px-4 py-3 font-semibold text-slate-700">{q.marks}</td>
                    <td className="px-4 py-3 text-slate-500">{q.topic ?? '—'}</td>
                    <td className="px-4 py-3"><div className="flex gap-1.5"><button className="p-1 text-slate-400 hover:text-amber-600 transition-colors"><Edit2 className="w-3.5 h-3.5" /></button><button className="p-1 text-slate-400 hover:text-rose-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button></div></td>
                  </tr>
                ))}
                {questions.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-[12px] text-slate-400">No questions found.</td></tr>}
              </tbody>
            </table>
          </div>}
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'Analytics' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total Enrollments', value: '—', color: '#3B82F6' },
              { label: 'Total Completions', value: '—', color: '#10B981' },
              { label: 'Avg Quiz Score', value: '—', color: '#8B5CF6' },
            ].map(s => (
              <div key={s.label} className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <div className="h-0.5 w-full" style={{ background: s.color }} />
                <div className="p-4">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">{s.label}</p>
                  <p className="text-[28px] font-bold text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>{s.value}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <p className="text-[13px] font-semibold text-slate-800 mb-3">Enrollment Trend (Last 6 Months)</p>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={ENROLLMENT_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6 }} />
                <Line type="monotone" dataKey="enrollments" stroke="#EF4444" strokeWidth={2} dot={false} name="Enrollments" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
              <p className="text-[13px] font-semibold text-slate-800">Per-Course Analytics</p>
              <p className="text-[10.5px] text-slate-400 italic">Enrollment data available after tenant portal connection</p>
            </div>
            <table className="w-full text-[12px]">
              <thead><tr className="border-b border-slate-100 bg-slate-50 text-left text-slate-500">
                {['Course', 'Status', 'Duration', 'Enrollments', 'Completions', 'Avg Score'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {courses.filter((c: any) => c.status === 'PUBLISHED').map((c: any) => (
                  <tr key={c.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-medium text-slate-800 max-w-[200px] truncate">{c.title}</td>
                    <td className="px-4 py-2.5"><span className="text-[10px] px-1.5 py-0.5 rounded bg-green-50 text-green-700 font-medium">{c.status}</span></td>
                    <td className="px-4 py-2.5 text-slate-500">{c.estimatedHours}h {c.estimatedMinutes}m</td>
                    <td className="px-4 py-2.5 text-slate-400">—</td>
                    <td className="px-4 py-2.5 text-slate-400">—</td>
                    <td className="px-4 py-2.5 text-slate-400">—</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Designations Tab */}
      {activeTab === 'Designations' && <DesignationsTab />}

      {/* Certificates Tab */}
      {activeTab === 'Certificates' && (
        <div className="space-y-5">
          {/* Part 1: Templates */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-[14px] font-bold text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>Certificate Templates</p>
                <p className="text-[11.5px] text-slate-400">Design templates assigned to courses. Org logos auto-populate per tenant.</p>
              </div>
            </div>
            {certLoading
              ? <div className="flex items-center justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
              : <div className="grid grid-cols-3 gap-4">
              {(certTemplates as any[]).map(t => (
                <div key={t.id} className="bg-white border border-slate-200 rounded-lg overflow-hidden hover:shadow-sm transition-shadow">
                  <div className="h-28 bg-slate-50 border-b border-slate-100 flex items-center justify-center">
                    <div className="w-20 h-14 bg-white border border-slate-200 rounded flex items-center justify-center">
                      <Award className="w-6 h-6 text-slate-400" />
                    </div>
                  </div>
                  <div className="p-3.5">
                    <p className="text-[13px] font-bold text-slate-900 mb-0.5">{t.name}</p>
                    <p className="text-[10.5px] text-slate-400 mb-3">{t.layout} layout · Used by {t._count?.courses ?? 0} course{(t._count?.courses ?? 0) !== 1 ? 's' : ''}</p>
                    <button onClick={() => setShowCertBuilder(true)} className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium border border-slate-200 rounded-md hover:bg-slate-50 transition-colors">
                      <Edit2 className="w-3 h-3" /> Edit Template
                    </button>
                  </div>
                </div>
              ))}
              <button onClick={() => setShowCertBuilder(true)} className="bg-white border-2 border-dashed border-slate-200 rounded-lg p-4 flex flex-col items-center justify-center text-[12px] text-slate-400 hover:border-slate-400 hover:text-slate-600 transition-colors cursor-pointer min-h-[160px]">
                <Plus className="w-6 h-6 mb-2" />
                Create New Template
              </button>
            </div>}
          </div>

          {/* Part 2: Issuance Log */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-[14px] font-bold text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>Certificate Issuance Log</p>
                <p className="text-[11.5px] text-slate-400">All certificates issued across all organizations.</p>
              </div>
              <div className="flex gap-2">
                <input type="date" className="h-8 px-2 rounded-md border border-slate-200 text-[12px] text-slate-700 focus:outline-none focus:border-slate-400" />
                <select className="h-8 px-2 rounded-md border border-slate-200 text-[12px] text-slate-700 focus:outline-none focus:border-slate-400 bg-white">
                  {['All Orgs', 'TechNova Solutions', 'Infosys BPO Ltd'].map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
            </div>
            {revokeId && (
              <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-[400px] p-5">
                  <div className="flex items-center gap-2 mb-3"><AlertTriangle className="w-5 h-5 text-amber-500" /><p className="text-[15px] font-bold text-slate-900">Revoke Certificate?</p></div>
                  <p className="text-[13px] text-slate-600 mb-3">This will mark the certificate as revoked and notify the learner. This action cannot be undone.</p>
                  <div className="mb-4">
                    <label className="block text-[11.5px] font-medium text-slate-700 mb-1">Reason for Revocation <span className="text-slate-400">**</span></label>
                    <textarea rows={2} placeholder="e.g., Academic dishonesty — re-examination required"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-[12.5px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400 resize-none" />
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setRevokeId(null)} className="flex-1 py-2 border border-slate-300 text-[13px] text-slate-600 rounded-lg hover:bg-slate-50">Cancel</button>
                    <button onClick={() => setRevokeId(null)} className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white text-[13px] font-bold rounded-lg">Confirm Revoke</button>
                  </div>
                </div>
              </div>
            )}
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-[12px]">
                <thead><tr className="border-b border-slate-100 bg-slate-50 text-left text-slate-500">
                  {['Learner', 'Organization', 'Course', 'Issue Date', 'Certificate ID', 'Status', ''].map(h => (
                    <th key={h} className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {CERT_LOG.map(cert => (
                    <tr key={cert.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-semibold text-slate-800">{cert.learner}</td>
                      <td className="px-4 py-2.5 text-slate-500">{cert.org}</td>
                      <td className="px-4 py-2.5 text-slate-600 max-w-[180px] truncate">{cert.course}</td>
                      <td className="px-4 py-2.5 text-slate-500">{cert.issued}</td>
                      <td className="px-4 py-2.5"><span className="font-mono text-[10.5px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">{cert.id}</span></td>
                      <td className="px-4 py-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10.5px] font-semibold ${cert.status === 'Active' ? 'bg-green-50 text-green-700' : 'bg-rose-50 text-rose-700'}`}>{cert.status}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        {cert.status === 'Active' && (
                          <button onClick={() => setRevokeId(cert.id)} className="text-[11px] text-slate-400 hover:text-slate-800 font-medium border border-slate-200 px-2 py-0.5 rounded hover:bg-slate-50 transition-colors">Revoke</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}