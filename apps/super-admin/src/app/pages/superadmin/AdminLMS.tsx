import React, { useState } from 'react';
import {
  Plus, Play, BookOpen, BarChart2, Search, Edit2, Eye,
  Trash2, GripVertical, X, Check, Image, FileText, Video,
  Award, Download, AlertTriangle, Loader2, ChevronDown, Archive
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import {
  useCourses, useCourse, useCreateCourse, useUpdateCourse, useSyncCourseContent,
  useArchiveCourse, useDeleteCourse,
  useQuestions, useCreateQuestion, useUpdateQuestion, useDeleteQuestion,
  useCertificateTemplates, useCreateCertificateTemplate, useUpdateCertificateTemplate,
  useDesignations, useCreateDesignation, useUpdateDesignation, useDeleteDesignation,
  useCourseDesignations, useSetCourseDesignations, useUploadLmsFile,
  useCoursePortalRoles, useSetCoursePortalRoles,
  useLmsAnalytics, useIssuedCertificates, useRevokeCertificate,
} from '../../../hooks/useLms';
import toast from 'react-hot-toast';

//  Content Item Modals
type ContentModal = { type: 'section' | 'video' | 'reading' | 'assignment' | null };

const SUBMISSION_TYPE_MAP: Record<string, string> = {
  'Text Response': 'TEXT_RESPONSE',
  'File Upload':   'FILE_UPLOAD',
  'Both':          'BOTH',
};

// The platform's own fixed permission roles — independent of LMS Designation
// (org job-function). Used for "how do I use this portal" course targeting.
// Same 5 roles + labels as the tenant Settings "LMS Role Mapping" screen.
const PORTAL_ROLES = [
  { value: 'CEO',              label: 'CEO' },
  { value: 'CO',                label: 'Compliance Officer' },
  { value: 'IT_ADMIN',          label: 'IT Admin' },
  { value: 'INTERNAL_AUDITOR',  label: 'Internal Auditor' },
  { value: 'EXTERNAL_AUDITOR',  label: 'External Auditor' },
];

function ContentModal({ type, onClose, onSave }: { type: ContentModal['type']; onClose: () => void; onSave: (item: any) => void }) {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [videoSrc, setVideoSrc] = useState<'upload' | 'embed'>('embed');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [contentType, setContentType] = useState<'rich' | 'file'>('rich');
  const [readingText, setReadingText] = useState('');
  const [readingFile, setReadingFile] = useState<File | null>(null);
  const [instructions, setInstructions] = useState('');
  const [submissionType, setSubmissionType] = useState('Text Response');
  const { mutateAsync: uploadFile, isPending: uploading } = useUploadLmsFile();
  const [saving, setSaving] = useState(false);

  if (!type) return null;

  const TITLES = { section: 'Add Section', video: 'Add Video Lesson', reading: 'Add Reading Material', assignment: 'Add Assignment' };

  const canSave = !!title && (
    type !== 'video' || (videoSrc === 'embed' ? !!videoUrl : !!videoFile)
  ) && (
    type !== 'reading' || (contentType === 'rich' ? !!readingText : !!readingFile)
  ) && (
    type !== 'assignment' || !!instructions
  );

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const item: any = { type, title, desc };
      if (type === 'video') {
        item.videoSource = videoSrc === 'upload' ? 'UPLOAD' : 'EMBED';
        if (videoSrc === 'upload' && videoFile) {
          const uploaded = await uploadFile({ file: videoFile, folder: 'videos' });
          item.videoUrl = uploaded.fileUrl;
        } else {
          item.videoUrl = videoUrl;
        }
      } else if (type === 'reading') {
        item.readingContentType = contentType === 'rich' ? 'RICH_TEXT' : 'FILE';
        if (contentType === 'file' && readingFile) {
          const uploaded = await uploadFile({ file: readingFile, folder: 'reading' });
          item.readingContent = uploaded.fileUrl;
        } else {
          item.readingContent = readingText;
        }
      } else if (type === 'assignment') {
        item.assignmentInstructions = instructions;
        item.assignmentSubmissionType = SUBMISSION_TYPE_MAP[submissionType] ?? 'TEXT_RESPONSE';
      }
      onSave(item);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl border border-[#64748B]/20 shadow-xl w-[520px] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#64748B]/20">
          <p className="text-[17px] font-bold text-slate-900">{TITLES[type]}</p>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400 hover:text-slate-700" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-[13.5px] font-medium text-slate-700 mb-1">{type === 'section' ? 'Section Title' : 'Title'} <span className="text-slate-400">**</span></label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder={type === 'section' ? 'e.g., Introduction to DPDP' : 'e.g., Understanding Consent'}
              className="w-full h-10 px-3 rounded-lg border border-slate-300 text-[15px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400" />
          </div>

          {type === 'section' && (
            <div>
              <label className="block text-[13.5px] font-medium text-slate-700 mb-1">Description <span className="text-slate-400 font-normal">(optional)</span></label>
              <textarea rows={2} value={desc} onChange={e => setDesc(e.target.value)} placeholder="Brief description of this section…"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-[14.5px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400 resize-none" />
            </div>
          )}

          {type === 'video' && (
            <>
              <div>
                <label className="block text-[13.5px] font-medium text-slate-700 mb-1">Description <span className="text-slate-400 font-normal">(optional)</span></label>
                <textarea rows={2} value={desc} onChange={e => setDesc(e.target.value)} placeholder="What will learners learn from this video?"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-[14.5px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400 resize-none" />
              </div>
              <div>
                <label className="block text-[13.5px] font-medium text-slate-700 mb-2">Video Source</label>
                <div className="flex gap-2 mb-3">
                  {[{ val: 'embed', label: 'Embed URL' }, { val: 'upload', label: 'Upload File' }].map(s => (
                    <button key={s.val} onClick={() => setVideoSrc(s.val as any)}
                      className={`px-3 py-1.5 rounded-lg text-[14px] font-medium border transition-all ${videoSrc === s.val ? 'bg-[#15324a] text-white border-slate-800' : 'border-[#64748B]/20 text-slate-600 hover:border-slate-400'}`}>{s.label}</button>
                  ))}
                </div>
                {videoSrc === 'upload' ? (
                  <label className="h-24 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center text-[14px] text-slate-400 cursor-pointer hover:border-slate-400 hover:text-slate-600 transition-colors">
                    <input type="file" accept="video/*" className="hidden" onChange={e => setVideoFile(e.target.files?.[0] ?? null)} />
                    <Video className="w-6 h-6 mb-1" />
                    {videoFile ? videoFile.name : 'Drag and drop video file here, or click to browse'}
                    <span className="text-[12.5px] mt-0.5">MP4, MOV, AVI — max 100MB (or use Embed URL for larger files)</span>
                  </label>
                ) : (
                  <input value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="https://youtube.com/embed/... or https://vimeo.com/..."
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 text-[14.5px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400" />
                )}
              </div>
            </>
          )}

          {type === 'reading' && (
            <>
              <div>
                <label className="block text-[13.5px] font-medium text-slate-700 mb-2">Content Type</label>
                <div className="flex gap-2 mb-3">
                  {[{ val: 'rich', label: 'Rich Text' }, { val: 'file', label: 'Upload File' }].map(s => (
                    <button key={s.val} onClick={() => setContentType(s.val as any)}
                      className={`px-3 py-1.5 rounded-lg text-[14px] font-medium border transition-all ${contentType === s.val ? 'bg-[#15324a] text-white border-slate-800' : 'border-[#64748B]/20 text-slate-600 hover:border-slate-400'}`}>{s.label}</button>
                  ))}
                </div>
                {contentType === 'rich' ? (
                  <div className="border border-slate-300 rounded-lg overflow-hidden">
                    <div className="flex gap-1 px-2 py-1.5 border-b border-[#64748B]/20 bg-slate-50 text-[13px] text-slate-500">
                      {['B', 'I', 'U', '• List', '1. List'].map(t => <button key={t} type="button" className="px-1.5 py-0.5 hover:bg-slate-200 rounded font-medium transition-colors">{t}</button>)}
                    </div>
                    <textarea rows={6} value={readingText} onChange={e => setReadingText(e.target.value)} placeholder="Write the reading material content here…"
                      className="w-full px-3 py-2 text-[14.5px] text-slate-900 placeholder-slate-400 focus:outline-none resize-none" />
                  </div>
                ) : (
                  <label className="h-20 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center text-[14px] text-slate-400 cursor-pointer hover:border-slate-400 hover:text-slate-600 transition-colors">
                    <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={e => setReadingFile(e.target.files?.[0] ?? null)} />
                    <FileText className="w-5 h-5 mb-1" />
                    {readingFile ? readingFile.name : 'Upload PDF or DOCX file'}
                  </label>
                )}
              </div>
            </>
          )}

          {type === 'assignment' && (
            <>
              <div>
                <label className="block text-[13.5px] font-medium text-slate-700 mb-1">Instructions <span className="text-slate-400">**</span></label>
                <textarea rows={4} value={instructions} onChange={e => setInstructions(e.target.value)} placeholder="Describe what learners need to do for this assignment…"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-[14.5px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400 resize-none" />
              </div>
              <div>
                <label className="block text-[13.5px] font-medium text-slate-700 mb-2">Submission Type</label>
                <div className="flex gap-2">
                  {['Text Response', 'File Upload', 'Both'].map(s => (
                    <button key={s} onClick={() => setSubmissionType(s)}
                      className={`px-3 py-1.5 rounded-lg text-[14px] font-medium border transition-all ${submissionType === s ? 'bg-[#15324a] text-white border-slate-800' : 'border-[#64748B]/20 text-slate-600 hover:border-slate-400'}`}>{s}</button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
        <div className="flex items-center gap-3 px-5 py-4 border-t border-[#64748B]/20">
          <button onClick={onClose} className="px-4 py-2 border border-slate-300 text-[15px] text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={!canSave || saving || uploading}
            className="flex-1 py-2 bg-[#15324a] hover:bg-[#1A3E5C] disabled:bg-slate-200 disabled:text-slate-400 text-white text-[15px] font-semibold rounded-lg transition-colors flex items-center justify-center gap-2">
            {(saving || uploading) ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Save {TITLES[type].replace('Add ', '')} →
          </button>
        </div>
      </div>
    </div>
  );
}

//  Question Form (Add Question / Quiz)
type QType = 'MCQ' | 'True-False' | 'Descriptive';
function QuestionFormModal({ onClose, onSave, mode = 'bank', initial }: {
  onClose: () => void; onSave: (q: any) => void
  // 'bank' (default): standalone Question Bank tab — persists to the bank immediately.
  // 'draft': used inside the course quiz builder — returns the full question to local
  // state only; syncCourseContent is the single writer when the course is saved, which
  // avoids creating an orphaned bank copy alongside a second, option-less quiz copy.
  mode?: 'bank' | 'draft'; initial?: any
}) {
  const [qType, setQType] = useState<QType>(initial?.type ?? 'MCQ');
  const [text, setText] = useState(initial?.text ?? initial?.questionText ?? '');
  const [options, setOptions] = useState<string[]>(
    initial?.options?.length ? initial.options.map((o: any) => o.optionText) : ['', '', '', '']
  );
  const [correct, setCorrect] = useState(
    initial?.options?.length ? Math.max(0, initial.options.findIndex((o: any) => o.isCorrect)) : 0
  );
  const [tfCorrect, setTfCorrect] = useState<'True' | 'False'>(initial?.tfCorrectAnswer === false ? 'False' : 'True');
  const [modelAnswer, setModelAnswer] = useState(initial?.modelAnswer ?? '');
  const [wordLimit, setWordLimit] = useState(initial?.wordLimit ? String(initial.wordLimit) : '');
  const [marks, setMarks] = useState(initial?.marks ?? 2);
  const [difficulty, setDifficulty] = useState(initial?.difficulty ?? 'Medium');
  const [topic, setTopic] = useState(initial?.topic ?? '');
  const { mutate: createQuestion, isPending: creating } = useCreateQuestion();
  const { mutate: updateQuestion, isPending: updating } = useUpdateQuestion();
  const savingQ = creating || updating;

  const handleSaveQuestion = () => {
    if (!text) return;

    const draftShape = {
      id: initial?.id,
      text, type: qType, marks, difficulty, topic: topic || undefined,
      tfCorrectAnswer: qType === 'True-False' ? (tfCorrect === 'True') : undefined,
      modelAnswer: qType === 'Descriptive' ? modelAnswer : undefined,
      wordLimit: wordLimit ? parseInt(wordLimit) : undefined,
      options: qType === 'MCQ' ? options
        .map((opt, i) => ({ optionText: opt, isCorrect: i === correct, orderIndex: i }))
        .filter(o => o.optionText) : undefined,
    };

    if (mode === 'draft') {
      onSave(draftShape);
      onClose();
      return;
    }

    const apiPayload = {
      questionText: text,
      type: (qType === 'True-False' ? 'TRUE_FALSE' : qType.toUpperCase()) as any,
      marks,
      difficulty: difficulty.toUpperCase() as any,
      topic: topic || undefined,
      tfCorrectAnswer: draftShape.tfCorrectAnswer,
      modelAnswer: draftShape.modelAnswer,
      wordLimit: draftShape.wordLimit,
      options: draftShape.options,
    };

    if (initial?.id) {
      updateQuestion({ id: initial.id, ...apiPayload } as any, {
        onSuccess: () => { onSave({ ...draftShape, id: initial.id }); onClose(); },
      });
    } else {
      createQuestion(apiPayload as any, {
        onSuccess: (res: any) => { onSave({ ...draftShape, id: res?.data?.id ?? draftShape.id }); onClose(); },
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl border border-[#64748B]/20 shadow-xl w-[580px] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#64748B]/20">
          <p className="text-[17px] font-bold text-slate-900">{initial ? 'Edit Question' : 'Add Question'}</p>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400 hover:text-slate-700" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-[13.5px] font-medium text-slate-700 mb-1">Question Text <span className="text-slate-400">**</span></label>
            <textarea rows={3} value={text} onChange={e => setText(e.target.value)} placeholder="Enter the question…"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-[14.5px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400 resize-none" />
          </div>
          <div>
            <label className="block text-[13.5px] font-medium text-slate-700 mb-2">Question Type <span className="text-slate-400">**</span></label>
            <div className="flex gap-2">
              {(['MCQ', 'True-False', 'Descriptive'] as const).map(t => (
                <button key={t} onClick={() => setQType(t)}
                  className={`px-3 py-1.5 rounded-lg text-[14px] font-medium border transition-all ${qType === t ? 'bg-[#15324a] text-white border-slate-800' : 'border-[#64748B]/20 text-slate-600 hover:border-slate-400'}`}>{t}</button>
              ))}
            </div>
          </div>

          {qType === 'MCQ' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[13.5px] font-medium text-slate-700">Answer Options (mark correct)</label>
                {options.length < 6 && (
                  <button onClick={() => setOptions(p => [...p, ''])} className="text-[13px] text-slate-700 hover:text-slate-800 font-medium flex items-center gap-1"><Plus className="w-3 h-3" /> Add Option</button>
                )}
              </div>
              <div className="space-y-2">
                {options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <button onClick={() => setCorrect(i)} className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${correct === i ? 'border-green-500 bg-green-500' : 'border-slate-300'}`}>
                      {correct === i && <Check className="w-3 h-3 text-white" />}
                    </button>
                    <input value={opt} onChange={e => setOptions(p => p.map((o, j) => j === i ? e.target.value : o))} placeholder={`Option ${i + 1}`}
                      className="flex-1 h-9 px-3 rounded-md border border-slate-300 text-[14.5px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400" />
                    {options.length > 2 && <button onClick={() => setOptions(p => p.filter((_, j) => j !== i))} className="text-slate-300 hover:text-slate-400 transition-colors"><X className="w-3.5 h-3.5" /></button>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {qType === 'True-False' && (
            <div>
              <label className="block text-[13.5px] font-medium text-slate-700 mb-2">Correct Answer</label>
              <div className="flex gap-3">
                {(['True', 'False'] as const).map(v => (
                  <button key={v} onClick={() => setTfCorrect(v)}
                    className={`px-6 py-2 rounded-lg text-[14.5px] font-medium border transition-all ${tfCorrect === v ? 'bg-green-600 text-white border-green-600' : 'border-[#64748B]/20 text-slate-600 hover:border-green-300'}`}>{v}</button>
                ))}
              </div>
            </div>
          )}

          {qType === 'Descriptive' && (
            <>
              <div>
                <label className="block text-[13.5px] font-medium text-slate-700 mb-1">Model Answer <span className="text-slate-400">**</span></label>
                <textarea rows={4} value={modelAnswer} onChange={e => setModelAnswer(e.target.value)} placeholder="Reference answer for manual grading…"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-[14.5px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400 resize-none" />
                <p className="text-[12.5px] text-slate-400 mt-0.5">Reference answer for manual grading</p>
              </div>
              <div>
                <label className="block text-[13.5px] font-medium text-slate-700 mb-1">Word Limit <span className="text-slate-400 font-normal">(optional)</span></label>
                <input type="number" value={wordLimit} onChange={e => setWordLimit(e.target.value)} placeholder="e.g., 300"
                  className="w-32 h-9 px-3 rounded-lg border border-slate-300 text-[14.5px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400" />
                <p className="text-[12.5px] text-slate-400 mt-0.5">Leave empty for no word limit</p>
              </div>
            </>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[13.5px] font-medium text-slate-700 mb-1">Marks <span className="text-slate-400">**</span></label>
              <input type="number" value={marks} onChange={e => setMarks(Number(e.target.value))} min={1} max={20}
                className="w-full h-9 px-3 rounded-lg border border-slate-300 text-[14.5px] text-slate-900 focus:outline-none focus:border-slate-400" />
            </div>
            <div>
              <label className="block text-[13.5px] font-medium text-slate-700 mb-1">Difficulty</label>
              <select value={difficulty} onChange={e => setDifficulty(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-300 text-[14.5px] text-slate-900 focus:outline-none focus:border-slate-400 bg-white">
                {['Easy', 'Medium', 'Hard'].map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[13.5px] font-medium text-slate-700 mb-1">Topic / Tag</label>
              <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g., Consent"
                className="w-full h-9 px-3 rounded-lg border border-slate-300 text-[14.5px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400" />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2 border-t border-[#64748B]/20">
            <button onClick={onClose} className="px-4 py-2 border border-slate-300 text-[15px] text-slate-600 rounded-lg hover:bg-slate-50">Cancel</button>
            <button onClick={handleSaveQuestion} disabled={!text || savingQ}
              className="flex-1 py-2 bg-[#15324a] hover:bg-[#1A3E5C] disabled:bg-slate-200 disabled:text-slate-400 text-white text-[15px] font-semibold rounded-lg flex items-center justify-center gap-2">
              {savingQ ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Save Question →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

//  Add from Question Bank (picker)
function QuestionBankPicker({ excludeIds, onClose, onAdd }: {
  excludeIds: string[]; onClose: () => void; onAdd: (qs: QuizQuestion[]) => void
}) {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useQuestions({ bankOnly: 'true', search: search || undefined });
  const questions = (data?.data ?? []).filter((q: any) => !excludeIds.includes(q.id));
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (id: string) => setSelected(p => {
    const n = new Set(p);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });

  const handleAdd = () => {
    const picked: QuizQuestion[] = questions
      .filter((q: any) => selected.has(q.id))
      .map((q: any) => ({
        id: q.id,
        text: q.questionText,
        type: q.type === 'TRUE_FALSE' ? 'True-False' : q.type.charAt(0) + q.type.slice(1).toLowerCase(),
        marks: q.marks,
        difficulty: q.difficulty.charAt(0) + q.difficulty.slice(1).toLowerCase(),
        topic: q.topic ?? undefined,
        tfCorrectAnswer: q.tfCorrectAnswer ?? undefined,
        modelAnswer: q.modelAnswer ?? undefined,
        wordLimit: q.wordLimit ?? undefined,
        options: (q.options || []).map((o: any, i: number) => ({ optionText: o.optionText, isCorrect: o.isCorrect, orderIndex: o.orderIndex ?? i })),
      }));
    onAdd(picked);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl border border-[#64748B]/20 shadow-xl w-[560px] max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#64748B]/20">
          <p className="text-[17px] font-bold text-slate-900">Add from Question Bank</p>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400 hover:text-slate-700" /></button>
        </div>
        <div className="p-4 border-b border-[#64748B]/20">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search questions…"
            className="w-full h-9 px-3 rounded-lg border border-slate-300 text-[14.5px] focus:outline-none focus:border-slate-400" />
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {isLoading && <div className="py-8 text-center text-slate-400 text-[14px]">Loading…</div>}
          {!isLoading && questions.length === 0 && (
            <div className="py-8 text-center text-slate-400 text-[14px]">No unattached bank questions found.</div>
          )}
          {questions.map((q: any) => (
            <label key={q.id} className="flex items-start gap-3 p-2.5 border border-[#64748B]/20 rounded-lg hover:bg-slate-50 cursor-pointer">
              <input type="checkbox" checked={selected.has(q.id)} onChange={() => toggle(q.id)} className="mt-1 accent-slate-800" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[12px] px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded font-semibold">{q.type}</span>
                  <span className="text-[12px] text-slate-400">{q.marks} marks</span>
                </div>
                <p className="text-[14px] text-slate-700 line-clamp-2">{q.questionText}</p>
              </div>
            </label>
          ))}
        </div>
        <div className="flex items-center gap-3 px-5 py-4 border-t border-[#64748B]/20">
          <button onClick={onClose} className="px-4 py-2 border border-slate-300 text-[15px] text-slate-600 rounded-lg hover:bg-slate-50">Cancel</button>
          <button onClick={handleAdd} disabled={selected.size === 0}
            className="flex-1 py-2 bg-[#15324a] hover:bg-[#1A3E5C] disabled:bg-slate-200 disabled:text-slate-400 text-white text-[15px] font-semibold rounded-lg">
            Add {selected.size || ''} Question{selected.size === 1 ? '' : 's'} →
          </button>
        </div>
      </div>
    </div>
  );
}

//  Certificate rendering helpers — contrast-aware text colors so a chosen
// background always stays readable, plus a real NiyamSaathi brand mark (in a
// white badge, so it stays legible against any background too).
function hexLuminance(hex: string): number {
  const clean = (hex || '#FFFFFF').replace('#', '').trim();
  const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
  const r = parseInt(full.substring(0, 2), 16) / 255 || 1;
  const g = parseInt(full.substring(2, 4), 16) / 255 || 1;
  const b = parseInt(full.substring(4, 6), 16) / 255 || 1;
  const lin = (v: number) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function getCertPalette(bg: string) {
  const isDark = hexLuminance(bg) < 0.5;
  return {
    isDark,
    heading:   isDark ? '#FFFFFF' : '#1A3E5C',
    body:      isDark ? 'rgba(255,255,255,0.85)' : '#475569',
    label:     isDark ? 'rgba(255,255,255,0.65)' : '#64748B',
    faint:     isDark ? 'rgba(255,255,255,0.55)' : '#64748B',
    sigLine:   isDark ? 'rgba(255,255,255,0.4)'  : '#94A3B8',
  };
}

function CertLogoBadge({ className = 'h-11 px-3', imgClassName = 'h-7' }: { className?: string; imgClassName?: string }) {
  return (
    <div className={`inline-flex items-center justify-center rounded-lg bg-white border border-black/5 shadow-sm flex-shrink-0 ${className}`}>
      <img src="/niyamsaathi_logo.png" alt="NiyamSaathi" className={`w-auto object-contain ${imgClassName}`} />
    </div>
  );
}

//  Certificate rendering — three genuinely distinct layouts (not just a label).
// Kept self-contained here and mirrored in the tenant app's CertificateView,
// since the two apps don't share a component bundle for this yet — both must
// stay visually identical so the admin preview matches what's actually issued.
function CertificateCard({ layout, bg, title, body, signatory, designation, orgName, certId }: {
  layout: string; bg: string; title: string; body: string
  signatory?: string; designation?: string; orgName: string; certId: string
}) {
  const normalized = (layout || 'CLASSIC').toUpperCase();
  const palette = getCertPalette(bg);

  if (normalized === 'MODERN') {
    return (
      <div className="rounded-xl overflow-hidden flex shadow-sm" style={{ background: bg, minHeight: 320 }}>
        <div className="w-[32%] bg-[#1A3E5C] relative flex flex-col items-center justify-center p-6 text-center flex-shrink-0 overflow-hidden">
          <div className="absolute inset-0 opacity-[0.08] pointer-events-none"
            style={{ backgroundImage: 'repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 1px, transparent 14px)' }} />
          <CertLogoBadge className="relative h-11 px-3 mb-3" imgClassName="h-7" />
          <p className="relative text-white text-[13px] font-bold uppercase tracking-widest leading-snug" style={{ fontFamily: 'Cinzel, serif' }}>{orgName}</p>
        </div>
        <div className="flex-1 p-8 flex flex-col justify-center min-w-0">
          <p className="text-[11px] font-bold text-[#D4AF37] uppercase tracking-widest mb-2">Verified Certificate</p>
          <h1 className="text-[25px] font-bold mb-3 leading-tight" style={{ fontFamily: 'Cinzel, serif', color: palette.heading }}>{title}</h1>
          <p className="text-[14px] leading-relaxed mb-8" style={{ color: palette.body }}>{body}</p>
          {signatory && (
            <div className="mb-4">
              <div className="h-px w-28 mb-1.5" style={{ background: palette.sigLine }} />
              <p className="text-[13px] font-semibold" style={{ color: palette.body }}>{signatory}</p>
              {designation && <p className="text-[11.5px]" style={{ color: palette.faint }}>{designation}</p>}
            </div>
          )}
          <p className="text-[11.5px] font-mono font-medium" style={{ color: palette.faint }}>Certificate ID: {certId}</p>
        </div>
      </div>
    );
  }

  if (normalized === 'MINIMAL') {
    return (
      <div className="rounded-xl overflow-hidden border border-black/10 shadow-sm" style={{ background: bg, minHeight: 320 }}>
        <div className="p-11">
          <div className="flex items-center gap-2.5 mb-9">
            <CertLogoBadge className="h-8 px-2" imgClassName="h-5" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: palette.label }}>{orgName}</p>
          </div>
          <h1 className="text-[23px] font-bold mb-2" style={{ fontFamily: 'Cinzel, serif', color: palette.heading }}>{title}</h1>
          <div className="h-0.5 w-10 bg-[#D4AF37] mb-6" />
          <p className="text-[14px] leading-relaxed max-w-lg mb-16" style={{ color: palette.body }}>{body}</p>
          <div className="flex items-end justify-between gap-4">
            <div>
              {signatory && (
                <>
                  <p className="text-[13.5px] font-medium" style={{ color: palette.body }}>{signatory}</p>
                  {designation && <p className="text-[12px]" style={{ color: palette.faint }}>{designation}</p>}
                </>
              )}
            </div>
            <p className="text-[11.5px] font-mono font-medium flex-shrink-0" style={{ color: palette.faint }}>{certId}</p>
          </div>
        </div>
      </div>
    );
  }

  // CLASSIC (default) — ornamental double border, centered, seal medallion.
  return (
    <div className="rounded-xl overflow-hidden shadow-sm" style={{ background: bg, minHeight: 320 }}>
      <div className="border-[3px] border-double border-[#D4AF37]/70 m-3 rounded-lg">
        <div className="p-9 text-center">
          <CertLogoBadge className="h-14 px-4 mb-4 mx-auto" imgClassName="h-9" />
          <p className="text-[12px] font-semibold uppercase tracking-[0.25em] mb-3" style={{ color: palette.label }}>{orgName}</p>
          <h1 className="text-[28px] font-bold mb-3" style={{ fontFamily: 'Cinzel, serif', color: palette.heading }}>{title}</h1>
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="h-px w-12 bg-[#D4AF37]/60" />
            <div className="w-1.5 h-1.5 rotate-45 bg-[#D4AF37]" />
            <div className="h-px w-12 bg-[#D4AF37]/60" />
          </div>
          <p className="text-[14px] leading-relaxed max-w-md mx-auto mb-9" style={{ color: palette.body }}>{body}</p>
          {signatory && (
            <div className="mb-5">
              <div className="h-10 border-b w-32 mb-1 mx-auto" style={{ borderColor: palette.sigLine }} />
              <p className="text-[13.5px] font-medium" style={{ color: palette.body }}>{signatory}</p>
              {designation && <p className="text-[12.5px]" style={{ color: palette.faint }}>{designation}</p>}
            </div>
          )}
          <p className="text-[11.5px] font-mono font-medium tracking-wide" style={{ color: palette.faint }}>Certificate ID: {certId}</p>
        </div>
      </div>
    </div>
  );
}

//  Certificate Template Builder
function CertTemplateBuilder({ template, onClose }: { template?: any | null; onClose: () => void }) {
  const isEditing = !!template;
  const [form, setForm] = useState(() => template ? {
    name: template.name ?? '',
    layout: (template.layout ?? 'CLASSIC').toLowerCase(),
    title: template.titleText ?? 'Certificate of Completion',
    body: template.bodyText ?? 'This is to certify that {learner_name} has successfully completed {course_name} on {completion_date}.',
    signatory: template.signatory ?? '',
    designation: template.designation ?? '',
    bg: template.bgColor ?? '#FFFFFF',
  } : { name: '', layout: 'classic', title: 'Certificate of Completion', body: 'This is to certify that {learner_name} has successfully completed {course_name} on {completion_date}.', signatory: '', designation: '', bg: '#FFFFFF' });
  const up = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));
  const VARS = ['{learner_name}', '{course_name}', '{completion_date}', '{certificate_id}', '{organization_name}'];
  const { mutate: createTemplate, isPending: creating } = useCreateCertificateTemplate();
  const { mutate: updateTemplate, isPending: updating } = useUpdateCertificateTemplate();
  const savingTemplate = creating || updating;

  const handleSaveTemplate = () => {
    if (!form.name) { toast.error('Template name is required'); return; }
    const payload = {
      name: form.name,
      layout: form.layout.toUpperCase() as any,
      titleText: form.title,
      bodyText: form.body,
      signatory: form.signatory || undefined,
      designation: form.designation || undefined,
      bgColor: form.bg,
    };
    if (isEditing) {
      updateTemplate({ id: template.id, data: payload } as any, { onSuccess: () => onClose() });
    } else {
      createTemplate({ ...payload, isDefault: false } as any, { onSuccess: () => onClose() });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-end z-50" onClick={onClose}>
      <div className="w-[1120px] max-w-[95vw] h-full bg-white border-l border-[#64748B]/20 flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#64748B]/20 flex-shrink-0">
          <p className="text-[17px] font-bold text-slate-900">{isEditing ? 'Edit Certificate Template' : 'Create Certificate Template'}</p>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400 hover:text-slate-700" /></button>
        </div>

        <div className="flex-1 overflow-hidden flex">
          {/* Form column */}
          <div className="w-[52%] overflow-y-auto p-5 space-y-5 border-r border-slate-100">
            <div>
              <label className="block text-[13.5px] font-medium text-slate-700 mb-1">Template Name <span className="text-slate-400">**</span></label>
              <input value={form.name} onChange={e => up('name', e.target.value)} placeholder="e.g., Professional Certificate"
                className="w-full h-10 px-3 rounded-lg border border-slate-300 text-[15px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400" />
            </div>
            <div>
              <label className="block text-[13.5px] font-medium text-slate-700 mb-2">Layout</label>
              <div className="grid grid-cols-3 gap-3">
                {[{ val: 'classic', label: 'Classic' }, { val: 'modern', label: 'Modern' }, { val: 'minimal', label: 'Minimal' }].map(l => (
                  <button key={l.val} onClick={() => up('layout', l.val)}
                    className={`p-3 border-2 rounded-lg text-center transition-all ${form.layout === l.val ? 'border-[#1A3E5C] bg-slate-50' : 'border-[#64748B]/20 hover:border-slate-400'}`}>
                    <p className="text-[14px] font-medium text-slate-700">{l.label}</p>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[13.5px] font-medium text-slate-700 mb-1">Certificate Title Text</label>
              <input value={form.title} onChange={e => up('title', e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-300 text-[15px] text-slate-900 focus:outline-none focus:border-slate-400" />
            </div>
            <div>
              <label className="block text-[13.5px] font-medium text-slate-700 mb-1">Body Text</label>
              <textarea rows={3} value={form.body} onChange={e => up('body', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-[14.5px] text-slate-900 focus:outline-none focus:border-slate-400 resize-none" />
              <p className="text-[12.5px] text-slate-400 mt-1">Available variables:</p>
              <div className="flex gap-1.5 flex-wrap mt-1">
                {VARS.map(v => <span key={v} className="font-mono text-[12px] px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded">{v}</span>)}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[13.5px] font-medium text-slate-700 mb-1">Signatory Name</label>
                <input value={form.signatory} onChange={e => up('signatory', e.target.value)} placeholder="e.g., Rajesh Kumar"
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 text-[15px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400" />
              </div>
              <div>
                <label className="block text-[13.5px] font-medium text-slate-700 mb-1">Signatory Designation</label>
                <input value={form.designation} onChange={e => up('designation', e.target.value)} placeholder="e.g., Head of Compliance"
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 text-[15px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400" />
              </div>
            </div>
            <div>
              <label className="block text-[13.5px] font-medium text-slate-700 mb-1">Background Color</label>
              <div className="flex items-center gap-3">
                <input type="color" value={form.bg} onChange={e => up('bg', e.target.value)} className="w-10 h-10 rounded-lg border border-[#64748B]/20 cursor-pointer" />
                <span className="text-[14px] text-slate-500">Or select pattern: </span>
                <button type="button" onClick={() => up('bg', '#FFFFFF')}
                  className={`h-8 w-8 rounded border bg-white transition-all ${form.bg === '#FFFFFF' ? 'border-[#1A3E5C] ring-2 ring-[#1A3E5C]/30' : 'border-[#64748B]/20'}`} />
                <button type="button" onClick={() => up('bg', '#F8FAFC')}
                  className={`h-8 w-8 rounded border transition-all ${form.bg === '#F8FAFC' ? 'border-[#1A3E5C] ring-2 ring-[#1A3E5C]/30' : 'border-[#64748B]/20'}`}
                  style={{ backgroundImage: 'repeating-linear-gradient(45deg, #f8fafc 0, #f8fafc 2px, #eef2f7 2px, #eef2f7 4px)' }} />
              </div>
            </div>
          </div>

          {/* Live preview column — reflects the form state as you type, no toggle needed */}
          <div className="flex-1 overflow-y-auto p-5 bg-slate-50">
            <p className="text-[12.5px] font-bold text-slate-500 uppercase tracking-wide mb-3">Live Preview (Sample Data)</p>
            <CertificateCard
              layout={form.layout}
              bg={form.bg}
              title={form.title || 'Certificate of Completion'}
              body={(form.body || '').replace('{learner_name}', 'Amit Rao').replace('{course_name}', 'DPDP Compliance Fundamentals').replace('{completion_date}', 'April 26, 2025').replace('{certificate_id}', 'CERT-2025-001').replace('{organization_name}', 'TechNova Solutions')}
              signatory={form.signatory}
              designation={form.designation}
              orgName="TechNova Solutions"
              certId="CERT-2025-001"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 px-5 py-3.5 border-t border-[#64748B]/20 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 border border-slate-300 text-[15px] text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
          <button onClick={handleSaveTemplate} disabled={savingTemplate}
            className="flex-1 py-2 bg-[#15324a] hover:bg-[#1A3E5C] disabled:opacity-60 text-white text-[15px] font-semibold rounded-lg transition-colors flex items-center justify-center gap-2">
            {savingTemplate ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : isEditing ? 'Update Template →' : 'Save Template →'}
          </button>
        </div>
      </div>
    </div>
  );
}

//  Course Builder 
type CourseFormStep = 1 | 2 | 3;
type SectionContentItem = {
  id: string; type: string; title: string; desc?: string;
  videoSource?: string; videoUrl?: string;
  readingContentType?: string; readingContent?: string;
  assignmentInstructions?: string; assignmentSubmissionType?: string;
};
type SectionItem = { id: string; title: string; items: SectionContentItem[] };
type QuizQuestion = {
  id: string; text: string; type: string; marks: number; difficulty: string; topic?: string;
  tfCorrectAnswer?: boolean; modelAnswer?: string; wordLimit?: number;
  options?: { optionText: string; isCorrect: boolean; orderIndex: number }[];
};

function CourseForm({ courseId, onClose }: { courseId?: string; onClose: () => void }) {
  const { data: fullCourseData, isLoading: isLoadingCourse } = useCourse(courseId || '');
  const [step, setStep] = useState<CourseFormStep>(1);
  const [form, setForm] = useState({ title: '', desc: '', category: 'DPDP Compliance', difficulty: 'Beginner', durationH: '', durationM: '', status: 'Draft', certTemplate: '', thumbnailUrl: '' });
  // form.thumbnailUrl is the stable URL that gets persisted; thumbnailPreviewUrl
  // is a short-lived signed URL used only to render the <img> here — the blob
  // container is private, so the stable URL alone won't load in a browser.
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState('');
  const { mutateAsync: uploadThumbnail, isPending: uploadingThumbnail } = useUploadLmsFile();
  
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
        certTemplate: (fullCourseData as any).certificateTemplate?.name || '',
        thumbnailUrl: fullCourseData.thumbnailUrl || ''
      });
      setThumbnailPreviewUrl((fullCourseData as any).thumbnailPreviewUrl || '');

      if ((fullCourseData as any).sections && (fullCourseData as any).sections.length > 0) {
        setSections((fullCourseData as any).sections.map((s: any) => ({
          id: s.id,
          title: s.title,
          items: (s.lessons || []).map((l: any) => ({
            id: l.id, type: l.type.replace('_', '-').toLowerCase(), title: l.title, desc: l.description ?? '',
            videoSource: l.videoSource, videoUrl: l.videoUrl,
            readingContentType: l.readingContentType, readingContent: l.readingContent,
            assignmentInstructions: l.assignmentInstructions, assignmentSubmissionType: l.assignmentSubmissionType,
          }))
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
            difficulty: q.difficulty.charAt(0) + q.difficulty.slice(1).toLowerCase(),
            topic: q.topic ?? undefined,
            tfCorrectAnswer: q.tfCorrectAnswer ?? undefined,
            modelAnswer: q.modelAnswer ?? undefined,
            wordLimit: q.wordLimit ?? undefined,
            options: (q.options || []).map((o: any, i: number) => ({ optionText: o.optionText, isCorrect: o.isCorrect, orderIndex: o.orderIndex ?? i })),
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

  const { data: coursePortalRoles = [] } = useCoursePortalRoles(courseId || '');
  const { mutate: setCoursePortalRoles } = useSetCoursePortalRoles();
  const [selectedPortalRoles, setSelectedPortalRoles] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    if (courseDesignations.length > 0) {
      setSelectedDesignations(new Set(courseDesignations.map((d: any) => d.designationId)));
    }
  }, [courseDesignations]);

  React.useEffect(() => {
    if (coursePortalRoles.length > 0) {
      setSelectedPortalRoles(new Set(coursePortalRoles.map((r: any) => r.portalRole)));
    }
  }, [coursePortalRoles]);

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
      thumbnailUrl: form.thumbnailUrl || undefined,
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
          setCoursePortalRoles({ courseId: courseId, targets: Array.from(selectedPortalRoles).map(role => ({ portalRole: role, isMandatory: true })) });
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
            if (selectedPortalRoles.size > 0) {
              setCoursePortalRoles({ courseId: res.data.id, targets: Array.from(selectedPortalRoles).map(role => ({ portalRole: role, isMandatory: true })) });
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
  const [showBankPicker, setShowBankPicker] = useState(false);
  const totalMarks = quizQuestions.reduce((s, q) => s + q.marks, 0);

  const [contentModal, setContentModal] = useState<{ type: ContentModal['type']; sectionId: string | null }>({ type: null, sectionId: null });

  const addToSection = (sectionId: string, item: any) => {
    setSections(p => p.map(s => s.id === sectionId ? { ...s, items: [...s.items, { ...item, id: String(Date.now()) }] } : s));
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

      <div className="w-[860px] h-full bg-white border-l border-[#64748B]/20 overflow-y-auto" onClick={e => e.stopPropagation()}>
        {isLoadingCourse ? (
          <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>
        ) : (
          <>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#64748B]/20 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-4">
            <p className="text-[17px] font-bold text-slate-900">{courseId ? 'Edit Course' : 'Create Course'}</p>
            <div className="flex items-center gap-2">
              {STEPS.map((s, i) => (
                <React.Fragment key={s}>
                  <button onClick={() => setStep((i + 1) as CourseFormStep)}
                    className={`text-[13.5px] font-medium px-2.5 py-1 rounded-full transition-all ${step === i + 1 ? 'bg-[#15324a] text-white' : step > i + 1 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}>
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
                <label className="block text-[13.5px] font-medium text-slate-700 mb-1">Course Title <span className="text-slate-400">**</span></label>
                <input value={form.title} onChange={e => up('title', e.target.value)} placeholder="e.g., DPDP Compliance Fundamentals"
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 text-[15px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400" />
              </div>
              <div>
                <label className="block text-[13.5px] font-medium text-slate-700 mb-1">Description <span className="text-slate-400">**</span></label>
                <textarea rows={3} value={form.desc} onChange={e => up('desc', e.target.value)} placeholder="What will learners gain from this course?"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-[14.5px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400 resize-none" />
                <p className="text-[12.5px] text-slate-400 mt-0.5">Shown on the course card and detail page</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Category', key: 'category', opts: ['DPDP Compliance', 'Portal Usage', 'Role-Specific', 'General'] },
                  { label: 'Difficulty Level', key: 'difficulty', opts: ['Beginner', 'Intermediate', 'Advanced'] },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-[13.5px] font-medium text-slate-700 mb-1">{f.label} <span className="text-slate-400">**</span></label>
                    <select value={(form as any)[f.key]} onChange={e => up(f.key, e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-slate-300 text-[14.5px] text-slate-900 focus:outline-none focus:border-slate-400 bg-white">
                      {f.opts.map(o => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                ))}
                <div>
                  <label className="block text-[13.5px] font-medium text-slate-700 mb-1">Estimated Duration <span className="text-slate-400">**</span></label>
                  <div className="flex gap-2">
                    <input value={form.durationH} onChange={e => up('durationH', e.target.value)} placeholder="0" type="number" min={0}
                      className="w-20 h-10 px-3 rounded-lg border border-slate-300 text-[14.5px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400" />
                    <span className="self-center text-[14px] text-slate-500">hrs</span>
                    <input value={form.durationM} onChange={e => up('durationM', e.target.value)} placeholder="0" type="number" min={0} max={59}
                      className="w-20 h-10 px-3 rounded-lg border border-slate-300 text-[14.5px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400" />
                    <span className="self-center text-[14px] text-slate-500">min</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[13.5px] font-medium text-slate-700 mb-1">Certificate Template</label>
                  <select value={form.certTemplate} onChange={e => up('certTemplate', e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 text-[14.5px] text-slate-900 focus:outline-none focus:border-slate-400 bg-white">
                    <option value="">No certificate</option>
                    {certTemplates.map((t: any) => <option key={t.id} value={t.name}>{t.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[13.5px] font-medium text-slate-700 mb-1">Thumbnail</label>
                <label className="h-24 px-3 rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-[14px] text-slate-400 cursor-pointer hover:border-slate-400 hover:text-slate-600 transition-colors overflow-hidden">
                  <input type="file" accept="image/*" className="hidden" onChange={async e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const uploaded = await uploadThumbnail({ file, folder: 'thumbnails' });
                    up('thumbnailUrl', uploaded.fileUrl);
                    setThumbnailPreviewUrl(uploaded.previewUrl);
                  }} />
                  {uploadingThumbnail ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : thumbnailPreviewUrl ? (
                    <img src={thumbnailPreviewUrl} alt="Course thumbnail" className="h-full w-full object-cover rounded" />
                  ) : (
                    <>
                      <Image className="w-5 h-5 mb-1" />
                      Drag and drop or click to upload. Recommended: 1280×720px
                    </>
                  )}
                </label>
              </div>
              <div>
                <label className="block text-[13.5px] font-medium text-slate-700 mb-1">Target Designations</label>
                <div className="space-y-2 max-h-40 overflow-y-auto border border-[#64748B]/20 rounded-lg p-2.5">
                  {(designations as any[]).map((d: any) => (
                    <label key={d.id} className="flex items-center gap-2 text-[14.5px] text-slate-700 cursor-pointer">
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
                      <span className="text-[13px] text-slate-400">— {d.description}</span>
                    </label>
                  ))}
                  {(designations as any[]).length === 0 && <p className="text-[13px] text-slate-400 p-1">No designations available.</p>}
                </div>
              </div>
              <div>
                <label className="block text-[13.5px] font-medium text-slate-700 mb-1">Target Portal Roles</label>
                <p className="text-[12.5px] text-slate-400 mb-1.5">For "how to use this portal" guides — targets the platform role a learner holds, independent of their job-function designation above.</p>
                <div className="space-y-2 border border-[#64748B]/20 rounded-lg p-2.5">
                  {PORTAL_ROLES.map(r => (
                    <label key={r.value} className="flex items-center gap-2 text-[14.5px] text-slate-700 cursor-pointer">
                      <input type="checkbox" checked={selectedPortalRoles.has(r.value)}
                        onChange={(e) => {
                          const newSet = new Set(selectedPortalRoles);
                          if (e.target.checked) newSet.add(r.value);
                          else newSet.delete(r.value);
                          setSelectedPortalRoles(newSet);
                        }}
                        className="accent-slate-800"
                      />
                      <span className="font-medium text-slate-900">{r.label}</span>
                      <span className="text-[13px] text-slate-400 font-mono">({r.value})</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[13.5px] font-medium text-slate-700 mb-1">Status</label>
                <div className="flex gap-2">
                  {['Draft', 'Published'].map(s => (
                    <button key={s} onClick={() => up('status', s)}
                      className={`px-3 py-1.5 rounded-lg text-[14px] font-medium border transition-all ${form.status === s ? 'bg-[#15324a] text-white border-slate-800' : 'border-[#64748B]/20 text-slate-600 hover:border-slate-400'}`}>{s}</button>
                  ))}
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button onClick={() => setStep(2)} className="px-5 py-2 bg-[#15324a] hover:bg-[#1A3E5C] text-white text-[15px] font-semibold rounded-lg">Next: Build Content →</button>
              </div>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-[15px] font-bold text-slate-800">Course Sections</p>
                <button onClick={() => setContentModal({ type: 'section', sectionId: null })}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[14px] border border-dashed border-slate-300 rounded-lg text-slate-500 hover:border-slate-400 hover:text-slate-600 transition-colors">
                  <Plus className="w-3.5 h-3.5" /> Add Section
                </button>
              </div>
              {sections.map((sec, si) => (
                <div key={sec.id} className="border border-[#64748B]/20 rounded-lg overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 border-b border-[#64748B]/20">
                    <GripVertical className="w-3.5 h-3.5 text-slate-300 cursor-grab" />
                    <p className="text-[14.5px] font-semibold text-slate-800 flex-1">Section {si + 1}: {sec.title}</p>
                    <button onClick={() => setSections(p => p.filter(s => s.id !== sec.id))} className="p-1 text-slate-300 hover:text-slate-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                  {sec.items.map((item, li) => (
                    <div key={item.id} className="flex items-center gap-3 px-5 py-2.5 border-b border-slate-50 last:border-0 hover:bg-slate-50">
                      <GripVertical className="w-3 h-3 text-slate-200 cursor-grab" />
                      {TYPE_ICON[item.type] || <FileText className="w-3.5 h-3.5 text-slate-400" />}
                      <p className="text-[14px] text-slate-700 flex-1">{item.title}</p>
                      <span className="text-[12px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded capitalize">{item.type}</span>
                      <button onClick={() => setSections(p => p.map(s => s.id === sec.id ? { ...s, items: s.items.filter(i => i.id !== item.id) } : s))} className="p-1 text-slate-300 hover:text-slate-400 transition-colors"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  ))}
                  <div className="flex gap-2 px-5 py-2.5 bg-slate-50">
                    {([['video', 'Video Lesson'], ['reading', 'Reading Material'], ['assignment', 'Assignment']] as [ContentModal['type'], string][]).map(([t, label]) => (
                      <button key={t} onClick={() => setContentModal({ type: t, sectionId: sec.id })}
                        className="flex items-center gap-1 px-2 py-1 text-[12.5px] border border-dashed border-slate-300 rounded text-slate-400 hover:border-slate-400 hover:text-slate-600 transition-colors">
                        <Plus className="w-2.5 h-2.5" /> {label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {sections.length === 0 && (
                <div className="py-10 text-center text-[14px] text-slate-400">
                  <BookOpen className="w-8 h-8 mx-auto mb-2 text-slate-200" />
                  No sections yet. Add a section to start building content.
                </div>
              )}
              <div className="flex justify-between pt-2">
                <button onClick={() => setStep(1)} className="px-4 py-2 border border-slate-300 text-[15px] text-slate-600 rounded-lg hover:bg-slate-50">← Back</button>
                <button onClick={() => setStep(3)} className="px-5 py-2 bg-[#15324a] hover:bg-[#1A3E5C] text-white text-[15px] font-semibold rounded-lg">Next: Add Quiz →</button>
              </div>
            </div>
          )}

          {/* Step 3 — Quiz Builder */}
          {step === 3 && (
            <div className="space-y-4">
              {showQForm && <QuestionFormModal mode="draft" onClose={() => setShowQForm(false)} onSave={q => setQuizQuestions(p => [...p, { ...q, id: q.id ?? String(Date.now()) }])} />}
              {showBankPicker && (
                <QuestionBankPicker
                  excludeIds={quizQuestions.map(q => q.id)}
                  onClose={() => setShowBankPicker(false)}
                  onAdd={qs => setQuizQuestions(p => [...p, ...qs])}
                />
              )}
              <div>
                <p className="text-[15px] font-bold text-slate-800 mb-1">Add Quiz (Optional)</p>
                <p className="text-[14px] text-slate-500">Add a quiz learners must pass to complete this course.</p>
              </div>
              <label className="flex items-center gap-3 cursor-pointer p-3 border border-[#64748B]/20 rounded-lg hover:bg-slate-50 transition-colors">
                <div onClick={() => setIncludeQuiz(v => !v)} className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${includeQuiz ? 'bg-[#1A3E5C]' : 'bg-slate-300'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${includeQuiz ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </div>
                <span className="text-[14.5px] font-medium text-slate-700">Include a quiz for this course</span>
              </label>

              {includeQuiz && (
                <>
                  {/* Quiz settings */}
                  <div className="p-4 bg-slate-50 border border-[#64748B]/20 rounded-lg space-y-3">
                    <p className="text-[13.5px] font-bold text-slate-600 uppercase tracking-wide">Quiz Settings</p>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[13px] font-medium text-slate-600 mb-1">Quiz Title</label>
                        <input value={quizTitle} onChange={e => setQuizTitle(e.target.value)}
                          className="w-full h-9 px-3 rounded-md border border-slate-300 text-[14.5px] text-slate-900 focus:outline-none focus:border-slate-400 bg-white" />
                      </div>
                      <div>
                        <label className="block text-[13px] font-medium text-slate-600 mb-1">Pass Threshold (%)</label>
                        <div className="flex items-center gap-2">
                          <input type="number" value={passThreshold} onChange={e => setPassThreshold(Number(e.target.value))} min={0} max={100}
                            className="w-20 h-9 px-3 rounded-md border border-slate-300 text-[14.5px] text-slate-900 focus:outline-none focus:border-slate-400 bg-white" />
                          <span className="text-[13px] text-slate-400">% min to pass</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[13px] font-medium text-slate-600 mb-1">Time Limit (optional)</label>
                        <div className="flex items-center gap-2">
                          <input type="number" value={timeLimit} onChange={e => setTimeLimit(e.target.value)} placeholder="e.g., 30" min={1}
                            className="w-20 h-9 px-3 rounded-md border border-slate-300 text-[14.5px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400 bg-white" />
                          <span className="text-[13px] text-slate-400">minutes</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-1 border-t border-[#64748B]/20">
                      <span className="text-[13.5px] text-slate-500">Total Marks (auto):</span>
                      <span className="text-[15px] font-bold text-slate-800">{totalMarks}</span>
                      <span className="text-[13px] text-slate-400">· {quizQuestions.length} questions</span>
                    </div>
                  </div>

                  {/* Questions */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[14.5px] font-bold text-slate-800">{quizQuestions.length} Questions Added</p>
                      <div className="flex gap-2">
                        <button onClick={() => setShowBankPicker(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-[13.5px] border border-[#64748B]/20 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
                          + Add from Question Bank
                        </button>
                        <button onClick={() => setShowQForm(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-[13.5px] font-medium text-slate-700 border border-[#64748B]/20 rounded-lg hover:bg-slate-50 transition-colors">
                          <Plus className="w-3.5 h-3.5" /> Create New Question
                        </button>
                      </div>
                    </div>

                    {quizQuestions.map((q, idx) => (
                      <div key={q.id} className="flex items-start gap-3 p-3 border border-[#64748B]/20 rounded-lg hover:bg-slate-50 group">
                        <GripVertical className="w-4 h-4 text-slate-300 cursor-grab flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[13px] font-bold text-slate-400">Q{idx + 1}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[12px] font-semibold ${q.type === 'MCQ' ? 'bg-blue-50 text-blue-700' : q.type === 'True-False' ? 'bg-purple-50 text-purple-700' : 'bg-orange-50 text-orange-700'}`}>{q.type}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[12px] font-semibold ${q.difficulty === 'Easy' ? 'bg-green-50 text-green-700' : q.difficulty === 'Medium' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'}`}>{q.difficulty}</span>
                          </div>
                          <p className="text-[14px] text-slate-700 line-clamp-2">{q.text}</p>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="text-[13px] font-semibold text-slate-600">{q.marks} marks</span>
                          <button onClick={() => setQuizQuestions(p => p.filter(x => x.id !== q.id))}
                            className="p-1 text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {quizQuestions.length === 0 && (
                      <div className="py-8 text-center text-[14px] text-slate-400 border border-dashed border-[#64748B]/20 rounded-lg">
                        No questions added yet. Create a new question or add from the Question Bank.
                      </div>
                    )}
                  </div>
                </>
              )}

              <div className="flex justify-between pt-2 border-t border-[#64748B]/20">
                <button onClick={() => setStep(2)} className="px-4 py-2 border border-slate-300 text-[15px] text-slate-600 rounded-lg hover:bg-slate-50">← Back</button>
                <div className="flex gap-2">
                  <button onClick={() => handleSaveCourse('DRAFT')} disabled={savingCourse}
                    className="px-4 py-2 border border-slate-300 text-[15px] text-slate-600 rounded-lg hover:bg-slate-50 disabled:opacity-60 flex items-center gap-2">
                    {savingCourse ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Save as Draft
                  </button>
                  <button onClick={() => handleSaveCourse('PUBLISHED')} disabled={savingCourse}
                    className="px-5 py-2 bg-[#15324a] hover:bg-[#1A3E5C] disabled:opacity-60 text-white text-[15px] font-semibold rounded-lg flex items-center gap-2">
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
          <h2 className="text-[18px] font-bold text-slate-900" style={{ fontFamily: 'Cinzel, serif' }}>LMS Designations</h2>
          <p className="text-[14px] text-slate-400 mt-0.5">Define business roles for LMS learning paths. Tenants assign these to their users.</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-[#1A3E5C] text-white text-[15px] font-semibold rounded-lg hover:bg-[#15324a]">
          + New Designation
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl shadow-xl w-[420px] p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <p className="text-[17px] font-bold text-slate-900">{editItem ? 'Edit' : 'New'} Designation</p>
            <div>
              <label className="block text-[13.5px] font-medium text-slate-600 mb-1">Name (e.g. CISO) *</label>
              <input value={name} onChange={e => setName(e.target.value.toUpperCase())} placeholder="CISO"
                className="w-full h-9 px-3 rounded-lg border border-slate-300 text-[15px] font-mono focus:outline-none focus:border-slate-700" />
              {ROLE_SUGGESTION[name] && <p className="text-[13px] text-blue-600 mt-1">Full form: {ROLE_SUGGESTION[name]}</p>}
            </div>
            <div>
              <label className="block text-[13.5px] font-medium text-slate-600 mb-1">Description</label>
              <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2}
                placeholder="Who is this for and what courses should they take..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-[14.5px] resize-none focus:outline-none focus:border-slate-700" />
            </div>
            <div>
              <label className="block text-[13.5px] font-medium text-slate-600 mb-1">Display Order</label>
              <input type="number" value={order} onChange={e => setOrder(Number(e.target.value))} min={0}
                className="w-24 h-9 px-3 rounded-lg border border-slate-300 text-[15px] focus:outline-none focus:border-slate-700" />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-slate-300 text-[15px] text-slate-600 rounded-lg">Cancel</button>
              <button onClick={handleSave} disabled={!name.trim() || createMut.isPending || updateMut.isPending}
                className="flex-1 py-2 bg-[#1A3E5C] text-white text-[15px] font-semibold rounded-lg hover:bg-[#15324a] disabled:opacity-50">
                {editItem ? 'Save' : 'Create'} →
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-32"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
      ) : (
        <div className="bg-white border border-[#64748B]/20 rounded-xl overflow-hidden">
          <table className="w-full text-[14.5px]">
            <thead><tr className="border-b border-slate-100 bg-slate-50 text-slate-500 text-left">
              {['Designation', 'Description', 'Courses', 'Order', 'Status', ''].map(h => (
                <th key={h} className="px-4 py-3 text-[13px] font-semibold uppercase tracking-wide">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {(designations as any[]).length === 0 && (
                <tr><td colSpan={6} className="py-12 text-center text-slate-400">No designations yet. Create one above.</td></tr>
              )}
              {(designations as any[]).map((d: any) => (
                <tr key={d.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[13px]">{d.name}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 max-w-xs">{d.description ?? <span className="text-slate-300">—</span>}</td>
                  <td className="px-4 py-3">
                    <span className="text-[13px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-semibold">
                      {d._count?.courses ?? 0} courses
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{d.displayOrder}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[12px] font-bold px-2 py-0.5 rounded-full ${d.isActive ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {d.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(d)} className="text-[13.5px] px-2 py-1 border border-[#64748B]/20 rounded hover:bg-slate-50 text-slate-600">Edit</button>
                      <button onClick={() => deleteMut.mutate(d.id)} disabled={d._count?.courses > 0}
                        className="text-[13.5px] px-2 py-1 border border-red-100 rounded hover:bg-red-50 text-red-400 disabled:opacity-30 disabled:cursor-not-allowed">Del</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <p className="text-[14.5px] font-semibold text-blue-800 mb-1">How Designations Work</p>
        <p className="text-[14px] text-blue-600">
          Assign these designations to LMS courses (in the Courses tab → Edit → Target Designations).
          Tenant CO/CEO assigns a designation to each user. When assigned, users are auto-enrolled in all
          mandatory courses for that designation.
        </p>
      </div>
    </div>
  )
}

const LESSON_TYPE_ICON: Record<string, React.ReactNode> = {
  VIDEO: <Video className="w-3.5 h-3.5 text-blue-500" />,
  READING: <FileText className="w-3.5 h-3.5 text-green-500" />,
  ASSIGNMENT: <BookOpen className="w-3.5 h-3.5 text-amber-500" />,
}
const LESSON_TYPE_LABEL: Record<string, string> = { VIDEO: 'Video', READING: 'Reading', ASSIGNMENT: 'Assignment' }

function CoursePreviewModal({ courseId, onClose, onEdit }: { courseId: string; onClose: () => void; onEdit: () => void }) {
  const { data: course, isLoading } = useCourse(courseId);
  const { data: courseDesignations = [] } = useCourseDesignations(courseId);
  const { data: coursePortalRoles = [] } = useCoursePortalRoles(courseId);
  const archiveMut = useArchiveCourse();
  const deleteMut = useDeleteCourse();
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  if (isLoading) return <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50"><Loader2 className="w-8 h-8 animate-spin text-white" /></div>;
  if (!course) return null;

  const sections = (course as any).sections ?? [];
  const totalLessons = sections.reduce((s: number, sec: any) => s + (sec.lessons?.length ?? 0), 0);
  const totalQuizzes = sections.filter((sec: any) => sec.quiz).length;

  const handleArchive = () => {
    if (!confirm(`Archive "${course.title}"? It will disappear from every tenant's catalog immediately, but all enrollment history and certificates already issued for it stay intact. You can't undo this from the UI yet — ask engineering to flip it back to Published if needed.`)) return;
    archiveMut.mutate(course.id, { onSuccess: onClose });
  };
  const handleDelete = () => {
    if (!confirm(`Permanently delete "${course.title}"? This removes the course and all its content forever and cannot be undone.`)) return;
    deleteMut.mutate(course.id, { onSuccess: onClose });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-end z-50" onClick={onClose}>
      <div className="w-[900px] max-w-[95vw] h-full bg-white border-l border-[#64748B]/20 overflow-y-auto flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#64748B]/20 sticky top-0 bg-white z-20 shrink-0">
          <p className="text-[17px] font-bold text-slate-900">Course Details</p>
          <div className="flex items-center gap-2">
            {course.status === 'DRAFT' ? (
              <button onClick={handleDelete} disabled={deleteMut.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[13.5px] font-medium border border-red-200 text-red-600 rounded-md hover:bg-red-50 transition-colors disabled:opacity-50">
                <Trash2 className="w-3 h-3" /> Delete
              </button>
            ) : course.status !== 'ARCHIVED' ? (
              <button onClick={handleArchive} disabled={archiveMut.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[13.5px] font-medium border border-[#64748B]/20 text-slate-600 rounded-md hover:bg-slate-50 transition-colors disabled:opacity-50">
                <Archive className="w-3 h-3" /> Archive
              </button>
            ) : null}
            <button onClick={onEdit} className="flex items-center gap-1.5 px-3 py-1.5 text-[13.5px] font-medium border border-[#64748B]/20 rounded-md hover:bg-slate-50 transition-colors">
              <Edit2 className="w-3 h-3" /> Edit Course
            </button>
            <button onClick={onClose}><X className="w-4 h-4 text-slate-400 hover:text-slate-600" /></button>
          </div>
        </div>

        {/* Hero — a scrim sits between the thumbnail and the text so the
            title/badges stay legible no matter what the uploaded image
            contains (busy graphics, baked-in text, etc.) */}
        <div className="h-64 bg-gradient-to-br from-[#15324a] to-[#1A3E5C] relative flex items-end p-6 shrink-0 overflow-hidden">
          {(course as any).thumbnailPreviewUrl && (
            <img src={(course as any).thumbnailPreviewUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f2438] via-[#0f2438]/70 to-[#0f2438]/10" />
          <div className="relative z-10">
            <div className="flex gap-1.5 mb-2 flex-wrap">
              <span className={`text-[11.5px] font-bold px-2 py-0.5 rounded-full ${course.status === 'PUBLISHED' ? 'bg-green-500 text-white' : 'bg-amber-400 text-white'}`}>{course.status}</span>
              <span className="text-[11.5px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white">{course.difficulty}</span>
              <span className="text-[11.5px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white">{course.category?.replace('_', ' ')}</span>
            </div>
            <h2 className="text-[24px] font-bold text-white leading-tight" style={{ fontFamily: 'Cinzel, serif' }}>{course.title}</h2>
          </div>
        </div>

        <div className="p-5 space-y-5 flex-1">
          <p className="text-[14.5px] text-slate-600 leading-relaxed">{course.description}</p>

          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Duration', value: `${course.estimatedHours}h ${course.estimatedMinutes}m` },
              { label: 'Sections', value: sections.length },
              { label: 'Lessons', value: totalLessons },
              { label: 'Quizzes', value: totalQuizzes },
            ].map(s => (
              <div key={s.label} className="border border-[#64748B]/20 rounded-lg p-2.5 text-center">
                <p className="text-[16px] font-bold text-slate-800">{s.value}</p>
                <p className="text-[11.5px] text-slate-400 uppercase tracking-wide">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-4 text-[13.5px]">
            {(course as any).certificateTemplate ? (
              <span className="flex items-center gap-1.5 text-slate-600"><Award className="w-3.5 h-3.5 text-amber-500" /> {(course as any).certificateTemplate.name}</span>
            ) : (
              <span className="flex items-center gap-1.5 text-slate-400"><Award className="w-3.5 h-3.5" /> No certificate configured</span>
            )}
          </div>

          <div>
            <p className="text-[13.5px] font-bold text-slate-600 uppercase tracking-wide mb-2">Target Designations</p>
            {courseDesignations.length === 0 ? (
              <p className="text-[13.5px] text-slate-400">No designations targeted.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {courseDesignations.map((cd: any) => (
                  <span key={cd.designationId} className={`text-[12.5px] font-semibold px-2 py-1 rounded font-mono ${cd.isMandatory ? 'bg-red-50 text-red-700' : 'bg-[#D4AF37]/10 text-[#8a6d1f]'}`}>
                    {cd.designation?.name} {cd.isMandatory ? '(Required)' : '(Recommended)'}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="text-[13.5px] font-bold text-slate-600 uppercase tracking-wide mb-2">Target Portal Roles</p>
            {coursePortalRoles.length === 0 ? (
              <p className="text-[13.5px] text-slate-400">No portal roles targeted.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {coursePortalRoles.map((r: any) => (
                  <span key={r.portalRole} className={`text-[12.5px] font-semibold px-2 py-1 rounded font-mono ${r.isMandatory ? 'bg-blue-50 text-blue-700' : 'bg-[#D4AF37]/10 text-[#8a6d1f]'}`}>
                    {PORTAL_ROLES.find(pr => pr.value === r.portalRole)?.label ?? r.portalRole} {r.isMandatory ? '(Required)' : '(Recommended)'}
                  </span>
                ))}
              </div>
            )}
            {courseDesignations.length === 0 && coursePortalRoles.length === 0 && (
              <p className="text-[12.5px] text-slate-400 italic mt-1">This course is optional for everyone.</p>
            )}
          </div>

          <div>
            <p className="text-[13.5px] font-bold text-slate-600 uppercase tracking-wide mb-2">Course Curriculum</p>
            <p className="text-[12.5px] text-slate-400 mb-2">Click any lesson or quiz to preview its content exactly as a learner would see it.</p>
            <div className="border border-[#64748B]/20 rounded-lg overflow-hidden">
              {sections.length === 0 && <div className="p-4 text-center text-[14px] text-slate-400">No content added yet.</div>}
              {sections.map((sec: any, i: number) => (
                <div key={sec.id} className="border-b border-slate-100 last:border-0">
                  <div className="px-4 py-2 bg-slate-50/70">
                    <p className="text-[14.5px] font-semibold text-slate-800">Section {i + 1}: {sec.title}</p>
                  </div>
                  {sec.lessons?.map((l: any, j: number) => {
                    const key = `lesson:${l.id}`;
                    const isOpen = expandedKey === key;
                    return (
                      <div key={l.id} className="border-t border-slate-50">
                        <button onClick={() => setExpandedKey(isOpen ? null : key)}
                          className="w-full px-5 py-2 flex items-center gap-2 hover:bg-slate-50 text-left">
                          {LESSON_TYPE_ICON[l.type] ?? <Play className="w-3 h-3 text-blue-500" />}
                          <p className="text-[14px] text-slate-600 flex-1">{j + 1}. {l.title}</p>
                          <span className="text-[12px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-400">{LESSON_TYPE_LABEL[l.type] ?? l.type}</span>
                          <ChevronDown className={`w-3.5 h-3.5 text-slate-300 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isOpen && <AdminLessonContentPreview lesson={l} />}
                      </div>
                    );
                  })}
                  {sec.quiz && (() => {
                    const key = `quiz:${sec.id}`;
                    const isOpen = expandedKey === key;
                    return (
                      <div className="border-t border-slate-50">
                        <button onClick={() => setExpandedKey(isOpen ? null : key)}
                          className="w-full px-5 py-2 flex items-center gap-2 hover:bg-slate-50 text-left">
                          <Award className="w-3.5 h-3.5 text-amber-500" />
                          <p className="text-[14px] text-slate-600 flex-1">{sec.quiz.title}</p>
                          <span className="text-[12px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-400">{sec.quiz.questions?.length ?? 0} questions · {sec.quiz.passThreshold}% to pass</span>
                          <ChevronDown className={`w-3.5 h-3.5 text-slate-300 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isOpen && <AdminQuizContentPreview quiz={sec.quiz} />}
                      </div>
                    );
                  })()}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Read-only content preview for a single lesson — same content types
// LessonViewer (tenant) renders, no mark-complete/submission actions here.
function AdminLessonContentPreview({ lesson }: { lesson: any }) {
  if (lesson.type === 'VIDEO') {
    return (
      <div className="px-5 py-3 bg-slate-50/70 space-y-2">
        {lesson.videoPreviewUrl ? (
          /youtube\.com|youtu\.be|vimeo\.com/.test(lesson.videoPreviewUrl) ? (
            <div className="aspect-video w-full max-w-md rounded-lg overflow-hidden bg-black border border-[#64748B]/20">
              <iframe src={lesson.videoPreviewUrl} className="w-full h-full" allowFullScreen title={lesson.title} />
            </div>
          ) : (
            <video src={lesson.videoPreviewUrl} controls className="w-full max-w-md rounded-lg bg-black border border-[#64748B]/20" />
          )
        ) : (
          <p className="text-[13px] text-slate-400 italic">No video added yet.</p>
        )}
        {lesson.description && <p className="text-[13px] text-slate-500">{lesson.description}</p>}
      </div>
    );
  }
  if (lesson.type === 'READING') {
    return (
      <div className="px-5 py-3 bg-slate-50/70">
        {lesson.readingContentType === 'FILE' && lesson.readingPreviewUrl ? (
          <a href={lesson.readingPreviewUrl} target="_blank" rel="noreferrer" className="text-[13.5px] text-[#1A3E5C] underline font-medium inline-flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" /> Open reading material
          </a>
        ) : lesson.readingContent ? (
          <div className="text-[13.5px] text-slate-600 bg-white border border-slate-200 rounded-lg p-3 max-h-48 overflow-y-auto">
            {lesson.readingContent.split(/\n\s*\n/).map((p: string, i: number) => (
              <p key={i} className="mb-2 last:mb-0 whitespace-pre-wrap">{p}</p>
            ))}
          </div>
        ) : (
          <p className="text-[13px] text-slate-400 italic">No reading content added yet.</p>
        )}
      </div>
    );
  }
  // ASSIGNMENT
  return (
    <div className="px-5 py-3 bg-slate-50/70">
      <p className="text-[13.5px] text-slate-600 whitespace-pre-wrap">{lesson.assignmentInstructions || 'No instructions provided.'}</p>
      <p className="text-[12px] text-slate-400 mt-1.5">Submission type: {lesson.assignmentSubmissionType?.replace('_', ' ') ?? '—'}</p>
    </div>
  );
}

// Read-only content preview for a quiz — shown to the author, so correct
// answers ARE revealed here (unlike the sanitized learner-facing payload).
function AdminQuizContentPreview({ quiz }: { quiz: any }) {
  if (!quiz.questions || quiz.questions.length === 0) {
    return <div className="px-5 py-3 bg-slate-50/70"><p className="text-[13px] text-slate-400 italic">No questions added yet.</p></div>;
  }
  return (
    <div className="px-5 py-3 bg-slate-50/70 space-y-3">
      {quiz.questions.map((q: any, i: number) => (
        <div key={q.id} className="text-[13.5px]">
          <p className="text-slate-700 font-medium">{i + 1}. {q.questionText} <span className="text-slate-400 font-normal">({q.marks} marks)</span></p>
          {q.type === 'MCQ' && (
            <ul className="mt-1 ml-4 space-y-0.5">
              {q.options?.map((o: any) => (
                <li key={o.id} className={`flex items-center gap-1.5 ${o.isCorrect ? 'text-green-600 font-medium' : 'text-slate-500'}`}>
                  {o.isCorrect ? <Check className="w-3 h-3 flex-shrink-0" /> : <span className="w-3 flex-shrink-0" />}
                  {o.optionText}
                </li>
              ))}
            </ul>
          )}
          {q.type === 'TRUE_FALSE' && (
            <p className="mt-1 ml-4 text-green-600 font-medium flex items-center gap-1.5"><Check className="w-3 h-3" /> Correct answer: {q.tfCorrectAnswer ? 'True' : 'False'}</p>
          )}
          {q.type === 'DESCRIPTIVE' && q.modelAnswer && (
            <p className="mt-1 ml-4 text-slate-500 italic">Model answer: {q.modelAnswer}</p>
          )}
        </div>
      ))}
    </div>
  );
}

//  Analytics Tab
function AnalyticsTab() {
  const { data, isLoading } = useLmsAnalytics();
  const totals = data?.totals ?? { enrollments: 0, completions: 0, avgQuizScore: 0 };
  const trend = data?.trend ?? [];
  const perCourse = data?.perCourse ?? [];

  if (isLoading) return <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Enrollments', value: totals.enrollments, color: '#3B82F6' },
          { label: 'Total Completions', value: totals.completions, color: '#10B981' },
          { label: 'Avg Quiz Score', value: `${totals.avgQuizScore}%`, color: '#8B5CF6' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-[#64748B]/20 rounded-lg overflow-hidden">
            <div className="h-0.5 w-full" style={{ background: s.color }} />
            <div className="p-4">
              <p className="text-[13px] font-semibold text-slate-400 uppercase tracking-wide mb-1">{s.label}</p>
              <p className="text-[34px] font-bold text-slate-900" style={{ fontFamily: 'Cinzel, serif' }}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-white border border-[#64748B]/20 rounded-lg p-4">
        <p className="text-[15px] font-semibold text-slate-800 mb-3">Enrollment Trend (Last 6 Months)</p>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={trend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
            <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6 }} />
            <Line type="monotone" dataKey="enrollments" stroke="#EF4444" strokeWidth={2} dot={false} name="Enrollments" />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="bg-white border border-[#64748B]/20 rounded-lg overflow-hidden">
        <div className="px-4 py-2.5 border-b border-slate-100">
          <p className="text-[15px] font-semibold text-slate-800">Per-Course Analytics</p>
        </div>
        <table className="w-full text-[14px]">
          <thead><tr className="border-b border-slate-100 bg-slate-50 text-left text-slate-500">
            {['Course', 'Duration', 'Enrollments', 'Completions', 'Completion Rate'].map(h => (
              <th key={h} className="px-4 py-2.5 text-[13px] font-semibold uppercase tracking-wide">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {perCourse.map(c => (
              <tr key={c.courseId} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-2.5 font-medium text-slate-800 max-w-[200px] truncate">{c.title}</td>
                <td className="px-4 py-2.5 text-slate-500">{c.duration}</td>
                <td className="px-4 py-2.5 text-slate-600">{c.enrollments}</td>
                <td className="px-4 py-2.5 text-slate-600">{c.completions}</td>
                <td className="px-4 py-2.5 text-slate-600">{c.enrollments > 0 ? Math.round((c.completions / c.enrollments) * 100) : 0}%</td>
              </tr>
            ))}
            {perCourse.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No published courses yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AdminLMSPage() {
  const [activeTab, setActiveTab] = useState<'Courses' | 'Question Bank' | 'Analytics' | 'Certificates' | 'Designations'>('Courses');
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState<any>(null);
  const [previewCourse, setPreviewCourse] = useState<any>(null);
  const [showQForm, setShowQForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<any>(null);
  const [showCertBuilder, setShowCertBuilder] = useState(false);
  const [editingCertTemplate, setEditingCertTemplate] = useState<any | null>(null);
  const [search, setSearch] = useState('');
  const [qTypeFilter, setQTypeFilter] = useState('All');
  const [qDiffFilter, setQDiffFilter] = useState('All');
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const deleteQuestionMut = useDeleteQuestion();

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
      {previewCourse && (
        <CoursePreviewModal
          courseId={previewCourse.id}
          onClose={() => setPreviewCourse(null)}
          onEdit={() => { setEditingCourse(previewCourse); setPreviewCourse(null); }}
        />
      )}
      {(showQForm || editingQuestion) && (
        <QuestionFormModal
          initial={editingQuestion}
          onClose={() => { setShowQForm(false); setEditingQuestion(null); }}
          onSave={() => {}}
        />
      )}
      {showCertBuilder && (
        <CertTemplateBuilder
          template={editingCertTemplate}
          onClose={() => { setShowCertBuilder(false); setEditingCertTemplate(null); }}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-bold text-slate-900" style={{ fontFamily: 'Cinzel, serif' }}>LMS Content</h1>
          <p className="text-[14px] text-slate-400 mt-0.5">Learning Management System · {courses.filter((c: any) => c.status === 'PUBLISHED').length} published courses · {questions.length} questions</p>
        </div>
        {activeTab === 'Courses' && (
          <button onClick={() => setShowCourseForm(true)} className="flex items-center gap-2 px-3.5 py-2 bg-[#15324a] hover:bg-[#1A3E5C] text-white text-[15px] font-medium rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> Create Course
          </button>
        )}
        {activeTab === 'Question Bank' && (
          <button onClick={() => setShowQForm(true)} className="flex items-center gap-2 px-3.5 py-2 bg-[#15324a] hover:bg-[#1A3E5C] text-white text-[15px] font-medium rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> Add Question
          </button>
        )}
        {activeTab === 'Certificates' && (
          <button onClick={() => setShowCertBuilder(true)} className="flex items-center gap-2 px-3.5 py-2 bg-[#15324a] hover:bg-[#1A3E5C] text-white text-[15px] font-medium rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> Create Template
          </button>
        )}
      </div>

      <div className="flex border-b border-[#64748B]/20 gap-0">
        {(['Courses', 'Question Bank', 'Analytics', 'Certificates', 'Designations'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 text-[14.5px] font-medium border-b-2 transition-colors -mb-px ${activeTab === tab ? 'border-[#1A3E5C] text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
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
            <div key={c.id} onClick={() => setPreviewCourse(c)}
              className="bg-white border border-[#64748B]/20 rounded-lg overflow-hidden hover:shadow-md hover:border-[#64748B]/40 transition-all cursor-pointer">
              <div className="h-28 bg-slate-50 border-b border-slate-100 flex items-center justify-center overflow-hidden">
                {c.thumbnailPreviewUrl ? (
                  <img src={c.thumbnailPreviewUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <BookOpen className="w-12 h-12 text-slate-200" />
                )}
              </div>
              <div className="p-3.5">
                <div className="flex items-start gap-2 mb-1">
                  <span className={`text-[12px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${c.status === 'PUBLISHED' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>{c.status}</span>
                  <span className="text-[12px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-medium flex-shrink-0">{c.difficulty}</span>
                </div>
                <p className="text-[15px] font-bold text-slate-900 leading-tight mb-1">{c.title}</p>
                <p className="text-[12.5px] text-slate-400 mb-2">{c._count?.sections ?? 0} sections · {c.estimatedHours}h {c.estimatedMinutes}m</p>
                <div className="flex gap-2">
                  <button onClick={e => { e.stopPropagation(); setEditingCourse(c); }} className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-[13px] font-medium border border-[#64748B]/20 rounded-md hover:bg-slate-50 transition-colors"><Edit2 className="w-3 h-3" /> Edit</button>
                  <button onClick={e => { e.stopPropagation(); setPreviewCourse(c); }} className="flex items-center gap-1.5 px-2.5 py-1.5 text-[13px] font-medium border border-[#64748B]/20 rounded-md hover:bg-slate-50 transition-colors"><Eye className="w-3 h-3" /> Preview</button>
                </div>
              </div>
            </div>
          ))}
          {courses.length === 0 && <div className="col-span-3 py-16 text-center text-[14px] text-slate-400"><BookOpen className="w-8 h-8 mx-auto mb-2 text-slate-200" />No courses yet. Create your first course.</div>}
        </div>
      )}

      {/* Question Bank Tab */}
      {activeTab === 'Question Bank' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 bg-white border border-[#64748B]/20 rounded-lg p-2.5">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search questions…"
                className="w-full pl-8 pr-3 h-8 rounded-md border border-[#64748B]/20 text-[14.5px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400" />
            </div>
            <select value={qTypeFilter} onChange={e => setQTypeFilter(e.target.value)} className="h-8 px-2 rounded-md border border-[#64748B]/20 text-[14px] text-slate-700 focus:outline-none focus:border-slate-400 bg-white">
              {['All', 'MCQ', 'True-False', 'Descriptive'].map(o => <option key={o}>{o}</option>)}
            </select>
            <select value={qDiffFilter} onChange={e => setQDiffFilter(e.target.value)} className="h-8 px-2 rounded-md border border-[#64748B]/20 text-[14px] text-slate-700 focus:outline-none focus:border-slate-400 bg-white">
              {['All', 'Easy', 'Medium', 'Hard'].map(o => <option key={o}>{o}</option>)}
            </select>
            <span className="ml-auto text-[13px] text-slate-400">{questions.length} questions</span>
          </div>
          {questionsLoading
            ? <div className="flex items-center justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
            : <div className="bg-white border border-[#64748B]/20 rounded-lg overflow-hidden">
            <table className="w-full text-[14px]">
              <thead><tr className="border-b border-slate-100 bg-slate-50 text-left text-slate-500">
                {['Question', 'Type', 'Difficulty', 'Marks', 'Topic', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-[13px] font-semibold uppercase tracking-wide">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {questions.map((q: any) => (
                  <tr key={q.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3 max-w-[300px]"><p className="truncate text-slate-800 font-medium">{q.questionText}</p></td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-[12.5px] font-semibold ${TYPE_COLORS[q.type] || 'bg-slate-100 text-slate-600'}`}>{q.type}</span></td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-[12.5px] font-semibold ${DIFF_COLORS[q.difficulty] || ''}`}>{q.difficulty}</span></td>
                    <td className="px-4 py-3 font-semibold text-slate-700">{q.marks}</td>
                    <td className="px-4 py-3 text-slate-500">{q.topic ?? '—'}</td>
                    <td className="px-4 py-3"><div className="flex gap-1.5">
                      <button onClick={() => setEditingQuestion({
                        id: q.id,
                        text: q.questionText,
                        type: q.type === 'TRUE_FALSE' ? 'True-False' : q.type.charAt(0) + q.type.slice(1).toLowerCase(),
                        marks: q.marks,
                        difficulty: q.difficulty.charAt(0) + q.difficulty.slice(1).toLowerCase(),
                        topic: q.topic ?? undefined,
                        tfCorrectAnswer: q.tfCorrectAnswer ?? undefined,
                        modelAnswer: q.modelAnswer ?? undefined,
                        wordLimit: q.wordLimit ?? undefined,
                        options: (q.options || []).map((o: any, i: number) => ({ optionText: o.optionText, isCorrect: o.isCorrect, orderIndex: o.orderIndex ?? i })),
                      })} className="p-1 text-slate-400 hover:text-amber-600 transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button
                        onClick={() => { if (confirm('Delete this question? This cannot be undone.')) deleteQuestionMut.mutate(q.id); }}
                        disabled={deleteQuestionMut.isPending}
                        className="p-1 text-slate-400 hover:text-rose-500 transition-colors disabled:opacity-40"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div></td>
                  </tr>
                ))}
                {questions.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-[14px] text-slate-400">No questions found.</td></tr>}
              </tbody>
            </table>
          </div>}
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'Analytics' && (
        <AnalyticsTab />
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
                <p className="text-[16px] font-bold text-slate-900" style={{ fontFamily: 'Cinzel, serif' }}>Certificate Templates</p>
                <p className="text-[13.5px] text-slate-400">Design templates assigned to courses. Org logos auto-populate per tenant.</p>
              </div>
            </div>
            {certLoading
              ? <div className="flex items-center justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
              : <div className="grid grid-cols-3 gap-4">
              {(certTemplates as any[]).map(t => (
                <div key={t.id} className="bg-white border border-[#64748B]/20 rounded-lg overflow-hidden hover:shadow-sm transition-shadow">
                  <div className="h-28 bg-slate-50 border-b border-slate-100 flex items-center justify-center">
                    <div className="w-20 h-14 bg-white border border-[#64748B]/20 rounded flex items-center justify-center">
                      <Award className="w-6 h-6 text-slate-400" />
                    </div>
                  </div>
                  <div className="p-3.5">
                    <p className="text-[15px] font-bold text-slate-900 mb-0.5">{t.name}</p>
                    <p className="text-[12.5px] text-slate-400 mb-3">{t.layout} layout · Used by {t._count?.courses ?? 0} course{(t._count?.courses ?? 0) !== 1 ? 's' : ''}</p>
                    <button onClick={() => { setEditingCertTemplate(t); setShowCertBuilder(true); }} className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-[13px] font-medium border border-[#64748B]/20 rounded-md hover:bg-slate-50 transition-colors">
                      <Edit2 className="w-3 h-3" /> Edit Template
                    </button>
                  </div>
                </div>
              ))}
              <button onClick={() => { setEditingCertTemplate(null); setShowCertBuilder(true); }} className="bg-white border-2 border-dashed border-[#64748B]/20 rounded-lg p-4 flex flex-col items-center justify-center text-[14px] text-slate-400 hover:border-slate-400 hover:text-slate-600 transition-colors cursor-pointer min-h-[160px]">
                <Plus className="w-6 h-6 mb-2" />
                Create New Template
              </button>
            </div>}
          </div>

          {/* Part 2: Issuance Log */}
          <CertificateIssuanceLog revokeId={revokeId} setRevokeId={setRevokeId} />
        </div>
      )}
    </div>
  );
}

//  Certificate Issuance Log
function CertificateIssuanceLog({ revokeId, setRevokeId }: { revokeId: string | null; setRevokeId: (id: string | null) => void }) {
  const { data: certs = [], isLoading } = useIssuedCertificates();
  const revokeMut = useRevokeCertificate();
  const [orgFilter, setOrgFilter] = useState('All Orgs');
  const [reason, setReason] = useState('');

  const orgNames = ['All Orgs', ...Array.from(new Set(certs.map(c => c.organizationName)))];
  const filtered = orgFilter === 'All Orgs' ? certs : certs.filter(c => c.organizationName === orgFilter);
  const revokeTarget = certs.find(c => c.id === revokeId);

  const handleRevoke = () => {
    if (!revokeId || reason.trim().length < 3) return;
    revokeMut.mutate({ id: revokeId, reason: reason.trim() }, {
      onSuccess: () => { setRevokeId(null); setReason(''); },
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[16px] font-bold text-slate-900" style={{ fontFamily: 'Cinzel, serif' }}>Certificate Issuance Log</p>
          <p className="text-[13.5px] text-slate-400">All certificates issued across all organizations.</p>
        </div>
        <select value={orgFilter} onChange={e => setOrgFilter(e.target.value)}
          className="h-8 px-2 rounded-md border border-[#64748B]/20 text-[14px] text-slate-700 focus:outline-none focus:border-slate-400 bg-white">
          {orgNames.map(o => <option key={o}>{o}</option>)}
        </select>
      </div>
      {revokeId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setRevokeId(null)}>
          <div className="bg-white rounded-xl border border-[#64748B]/20 shadow-xl w-[400px] p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-3"><AlertTriangle className="w-5 h-5 text-amber-500" /><p className="text-[17px] font-bold text-slate-900">Revoke Certificate?</p></div>
            <p className="text-[15px] text-slate-600 mb-3">
              This will mark <span className="font-mono">{revokeTarget?.certificateCode}</span> as revoked for {revokeTarget?.learnerName}. This action cannot be undone.
            </p>
            <div className="mb-4">
              <label className="block text-[13.5px] font-medium text-slate-700 mb-1">Reason for Revocation <span className="text-slate-400">**</span></label>
              <textarea rows={2} value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g., Academic dishonesty — re-examination required"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-[14.5px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400 resize-none" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setRevokeId(null); setReason(''); }} className="flex-1 py-2 border border-slate-300 text-[15px] text-slate-600 rounded-lg hover:bg-slate-50">Cancel</button>
              <button onClick={handleRevoke} disabled={reason.trim().length < 3 || revokeMut.isPending}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-[15px] font-bold rounded-lg flex items-center justify-center gap-2">
                {revokeMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Confirm Revoke
              </button>
            </div>
          </div>
        </div>
      )}
      {isLoading ? (
        <div className="flex items-center justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
      ) : (
        <div className="bg-white border border-[#64748B]/20 rounded-lg overflow-hidden">
          <table className="w-full text-[14px]">
            <thead><tr className="border-b border-slate-100 bg-slate-50 text-left text-slate-500">
              {['Learner', 'Organization', 'Course', 'Issue Date', 'Certificate ID', 'Status', ''].map(h => (
                <th key={h} className="px-4 py-2.5 text-[13px] font-semibold uppercase tracking-wide">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filtered.map(cert => (
                <tr key={cert.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-semibold text-slate-800">{cert.learnerName}</td>
                  <td className="px-4 py-2.5 text-slate-500">{cert.organizationName}</td>
                  <td className="px-4 py-2.5 text-slate-600 max-w-[180px] truncate">{cert.courseTitle}</td>
                  <td className="px-4 py-2.5 text-slate-500">{new Date(cert.issuedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  <td className="px-4 py-2.5"><span className="font-mono text-[12.5px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">{cert.certificateCode}</span></td>
                  <td className="px-4 py-2.5">
                    <span className={`px-2 py-0.5 rounded text-[12.5px] font-semibold ${!cert.isRevoked ? 'bg-green-50 text-green-700' : 'bg-rose-50 text-rose-700'}`}>{cert.isRevoked ? 'Revoked' : 'Active'}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    {!cert.isRevoked && (
                      <button onClick={() => setRevokeId(cert.id)} className="text-[13px] text-slate-400 hover:text-slate-800 font-medium border border-[#64748B]/20 px-2 py-0.5 rounded hover:bg-slate-50 transition-colors">Revoke</button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No certificates issued yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}