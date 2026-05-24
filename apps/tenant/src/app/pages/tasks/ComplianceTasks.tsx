import React, { useState } from 'react';
import {
  AlertTriangle, CheckCircle2, Clock, ArrowRight, Search,
  User, Upload, Eye, ThumbsUp, ThumbsDown, X, FileText,
  Database, Shield, ChevronRight, Edit2, Loader2, Check, RefreshCw
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  useListTasks, useTaskDetail, useStartTask, useSubmitTask,
  useReviewTask, useSignoffTask, useRejectFinalTask, useAssignTask,
  useAssignableUsers, type Task,
} from '../../../hooks/useTasks';

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: '#EF4444', HIGH: '#F97316', MEDIUM: '#EAB308', LOW: '#22C55E',
};

const STATUS_MAP: Record<string, { label: string; bg: string; text: string }> = {
  PENDING:            { label: 'Pending',            bg: '#1A1200', text: '#F59E0B' },
  IN_PROGRESS:        { label: 'In Progress',         bg: '#052A3D', text: '#38BDF8' },
  EVIDENCE_SUBMITTED: { label: 'Evidence Submitted',  bg: '#0A1A3D', text: '#60A5FA' },
  UNDER_REVIEW:       { label: 'Under Review',        bg: '#0A1A3D', text: '#60A5FA' },
  APPROVED_INTERNAL:  { label: 'Approved',            bg: '#052E1A', text: '#22C55E' },
  FINAL_REVIEW:       { label: 'Final Review',        bg: '#2A1A00', text: '#FBBF24' },
  COMPLIANT:          { label: 'Compliant',           bg: '#052E1A', text: '#22C55E' },
  REJECTED:           { label: 'Rejected',            bg: '#2A0505', text: '#F87171' },
  OVERDUE:            { label: 'Overdue',             bg: '#2A0000', text: '#EF4444' },
};

function getStatusDisplay(status: string, isOverdue: boolean) {
  if (isOverdue && !['COMPLIANT', 'REJECTED'].includes(status)) return STATUS_MAP.OVERDUE;
  return STATUS_MAP[status] ?? { label: status, bg: '#1e293b', text: '#94a3b8' };
}

function StatusChip({ status, isOverdue }: { status: string; isOverdue: boolean }) {
  const s = getStatusDisplay(status, isOverdue);
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-semibold"
      style={{ background: s.bg, color: s.text, border: `1px solid ${s.text}30` }}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.text }} />
      {s.label}
    </span>
  );
}

function daysLeft(dueDate: string): number {
  return Math.round((new Date(dueDate).getTime() - Date.now()) / 86_400_000);
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(diff / 86_400_000);
  if (h < 1) return 'Just now';
  if (h < 24) return `${h}h ago`;
  if (d === 1) return 'Yesterday';
  return `${d} days ago`;
}

// ─── Assign Modal ─────────────────────────────────────────────────────────────

function AssignModal({ taskId, current, onClose }: { taskId: string; current: string | null; onClose: () => void }) {
  const { data: users = [] }  = useAssignableUsers();
  const assignMut             = useAssignTask();
  const [selected, setSelected] = useState(current ?? '');

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-[380px]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <p className="text-[14px] font-bold text-slate-900">Assign Task</p>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400" /></button>
        </div>
        <div className="p-4 space-y-2 max-h-64 overflow-y-auto">
          <label className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 cursor-pointer">
            <input type="radio" checked={selected === ''} onChange={() => setSelected('')} className="accent-slate-800" />
            <span className="text-[12.5px] text-slate-500">Unassign (leave as PENDING)</span>
          </label>
          {(users as any[]).map((u: any) => (
            <label key={u.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 cursor-pointer">
              <input type="radio" checked={selected === u.id} onChange={() => setSelected(u.id)} className="accent-slate-800" />
              <div>
                <p className="text-[13px] font-medium text-slate-800">{u.name}</p>
                <p className="text-[11px] text-slate-400">{u.email}</p>
              </div>
            </label>
          ))}
        </div>
        <div className="flex gap-3 px-5 py-4 border-t border-slate-200">
          <button onClick={onClose} className="px-4 py-2 border border-slate-300 text-[13px] text-slate-600 rounded-lg hover:bg-slate-50">Cancel</button>
          <button
            onClick={async () => { await assignMut.mutateAsync([taskId, { assigneeId: selected || null }] as any); onClose(); }}
            disabled={assignMut.isPending}
            className="flex-1 py-2 bg-slate-900 text-white text-[13px] font-semibold rounded-lg hover:bg-slate-800 disabled:opacity-50 flex items-center justify-center gap-2">
            {assignMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Save Assignment →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Task Detail ──────────────────────────────────────────────────────────────

function TaskDetail({ taskId, onBack }: { taskId: string; onBack: () => void }) {
  const { role } = useApp();
  const { data: task, isLoading } = useTaskDetail(taskId);
  const [reviewNote,  setReviewNote]  = useState('');
  const [submitNote,  setSubmitNote]  = useState('');
  const [showSubmit,  setShowSubmit]  = useState(false);
  const [showReview,  setShowReview]  = useState(false);
  const [showAssign,  setShowAssign]  = useState(false);
  const [showSignoff, setShowSignoff] = useState(false);
  const [showReject,  setShowReject]  = useState(false);
  const [rejectNote,  setRejectNote]  = useState('');

  const startMut     = useStartTask();
  const submitMut    = useSubmitTask();
  const reviewMut    = useReviewTask();
  const signoffMut   = useSignoffTask();
  const rejectMut    = useRejectFinalTask();

  if (isLoading) return <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;
  if (!task) return <div className="py-20 text-center text-slate-400">Task not found.</div>;

  const isIT = role === 'it_admin';
  const isIA = role === 'internal_auditor';
  const isEA = role === 'external_auditor';
  const isCO = role === 'co' || role === 'ceo';
  const pColor = PRIORITY_COLORS[task.priority] ?? '#64748b';

  return (
    <div className="space-y-4">
      {showAssign && (
        <AssignModal taskId={task.id} current={task.assignedTo?.id ?? null} onClose={() => setShowAssign(false)} />
      )}

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[12px] text-slate-400">
        <button onClick={onBack} className="hover:text-blue-600 transition-colors">Compliance Tasks</button>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-slate-800 font-medium truncate max-w-sm">{task.title}</span>
      </div>

      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <StatusChip status={task.status} isOverdue={task.isOverdue} />
              <span className="text-[10.5px] px-2 py-0.5 rounded font-semibold"
                style={{ background: `${pColor}18`, color: pColor }}>{task.priority}</span>
              <span className="text-[10.5px] text-slate-400 font-mono">{task.taskCode}</span>
              {task.autoAssigned && <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded font-semibold">Auto-delegated</span>}
            </div>
            <h1 className="text-[18px] font-bold text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>{task.title}</h1>
          </div>
          {isCO && (
            <button onClick={() => setShowAssign(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-[12px] text-slate-600 rounded-lg hover:bg-slate-50">
              <User className="w-3.5 h-3.5" /> {task.assignedTo ? 'Reassign' : 'Assign'}
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] flex-wrap">
          {[
            `Assessment: ${task.assessment.name}`,
            task.regulation ? `Reg: ${task.regulation.shortCode}` : null,
            task.department ? `Dept: ${task.department.name}` : null,
            task.control    ? `Control: ${task.control.title}` : null,
            `Asset: ${task.asset.name}`,
          ].filter(Boolean).map((item, i, arr) => (
            <React.Fragment key={i}>
              {i > 0 && <ArrowRight className="w-3 h-3 text-slate-300 flex-shrink-0" />}
              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-medium">{item}</span>
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="flex gap-4">
        {/* Left column */}
        <div className="flex-1 space-y-4">
          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
            <p className="text-[12.5px] text-slate-700 leading-relaxed">{task.description}</p>
            {task.instructions && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-[11.5px] font-semibold text-blue-700 mb-0.5">Instructions from CO</p>
                <p className="text-[12px] text-blue-600">{task.instructions}</p>
              </div>
            )}
            {task.control?.actions && task.control.actions.length > 0 && (
              <div>
                <p className="text-[11.5px] font-semibold text-slate-600 mb-2">Required Actions</p>
                <div className="space-y-2">
                  {task.control.actions.map((action: any, i: number) => (
                    <div key={action.id} className="flex items-start gap-2.5 p-2.5 bg-slate-50 rounded-lg">
                      <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                      <div>
                        <p className="text-[12px] font-semibold text-slate-800">{action.title}</p>
                        <p className="text-[11px] text-slate-500">{action.description}</p>
                        <p className="text-[10.5px] text-slate-400 mt-0.5">
                          Evidence: {action.evidenceTypes?.join(', ')} · Due within {action.suggestedDueDays}d
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Evidence list */}
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[13px] font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-400" /> Evidence
                {task.evidenceCount > 0 && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 rounded font-semibold">{task.evidenceCount}</span>}
              </p>
              {isIT && ['IN_PROGRESS', 'REJECTED'].includes(task.status) && (
                <span className="text-[11.5px] text-slate-400 flex items-center gap-1"><Upload className="w-3.5 h-3.5" /> Upload in Evidence Hub</span>
              )}
            </div>
            {task.evidence.length === 0 ? (
              <p className="text-[12px] text-slate-400 py-4 text-center">No evidence uploaded yet.</p>
            ) : (
              <div className="space-y-2">
                {task.evidence.map((ev: any) => (
                  <div key={ev.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-100 hover:bg-slate-50">
                    <FileText className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12.5px] font-medium text-slate-800 truncate">{ev.title}</p>
                      <p className="text-[11px] text-slate-400">{ev.evidenceType} · {relativeTime(ev.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Review notes */}
          {task.reviewNotes.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2">
              <p className="text-[13px] font-bold text-slate-800">Reviewer Notes</p>
              {task.reviewNotes.map((n: any) => (
                <div key={n.id} className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
                  <p className="text-[11.5px] font-semibold text-amber-700">{n.author?.name ?? 'Reviewer'}</p>
                  <p className="text-[12px] text-amber-800 mt-0.5">{n.note}</p>
                  <p className="text-[10.5px] text-amber-500 mt-1">{relativeTime(n.createdAt)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right column — actions + metadata */}
        <div className="w-64 space-y-4 flex-shrink-0">
          {/* IT Admin actions */}
          {isIT && task.assignedTo?.id && (
            <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2">
              <p className="text-[12px] font-semibold text-slate-600 uppercase tracking-wide">Your Actions</p>
              {task.status === 'PENDING' && (
                <button onClick={() => startMut.mutate([task.id] as any)}
                  disabled={startMut.isPending}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-semibold rounded-lg flex items-center justify-center gap-2">
                  {startMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  Start Working
                </button>
              )}
              {task.status === 'IN_PROGRESS' && (
                <>
                  {showSubmit ? (
                    <div className="space-y-2">
                      <textarea rows={3} value={submitNote} onChange={e => setSubmitNote(e.target.value)}
                        placeholder="Optional: note for the IA reviewer…"
                        className="w-full px-3 py-2 text-[12px] border border-slate-200 rounded-lg resize-none focus:outline-none focus:border-blue-400" />
                      <div className="flex gap-2">
                        <button onClick={() => setShowSubmit(false)} className="flex-1 py-1.5 border border-slate-200 text-[12px] text-slate-600 rounded-lg">Cancel</button>
                        <button onClick={async () => { await submitMut.mutateAsync([task.id, { note: submitNote }] as any); setShowSubmit(false); }}
                          disabled={submitMut.isPending}
                          className="flex-1 py-1.5 bg-green-600 text-white text-[12px] font-semibold rounded-lg flex items-center justify-center">
                          {submitMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Submit →'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setShowSubmit(true)}
                      className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white text-[13px] font-semibold rounded-lg flex items-center justify-center gap-2">
                      <Upload className="w-4 h-4" /> Submit for Review
                    </button>
                  )}
                </>
              )}
              {task.status === 'REJECTED' && (
                <button onClick={() => startMut.mutate([task.id] as any)} disabled={startMut.isPending}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-[13px] font-semibold rounded-lg">
                  Re-open Task
                </button>
              )}
              {['EVIDENCE_SUBMITTED', 'UNDER_REVIEW', 'APPROVED_INTERNAL', 'COMPLIANT'].includes(task.status) && (
                <p className="text-center text-[12px] text-slate-400 py-2">
                  {task.status === 'COMPLIANT' ? '✅ Task is compliant.' : 'Waiting for reviewer…'}
                </p>
              )}
            </div>
          )}

          {/* IA review actions */}
          {isIA && ['EVIDENCE_SUBMITTED', 'UNDER_REVIEW'].includes(task.status) && (
            <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2">
              <p className="text-[12px] font-semibold text-slate-600 uppercase tracking-wide">Review</p>
              {showReview ? (
                <div className="space-y-2">
                  <textarea rows={3} value={reviewNote} onChange={e => setReviewNote(e.target.value)}
                    placeholder="Add reviewer notes (required for rejection)…"
                    className="w-full px-3 py-2 text-[12px] border border-slate-200 rounded-lg resize-none focus:outline-none focus:border-blue-400" />
                  <div className="flex gap-2">
                    <button onClick={async () => { await reviewMut.mutateAsync([task.id, { decision: 'reject', note: reviewNote }] as any); setShowReview(false); }}
                      disabled={!reviewNote.trim() || reviewMut.isPending}
                      className="flex-1 py-2 bg-red-500 text-white text-[12px] font-semibold rounded-lg flex items-center justify-center gap-1 disabled:opacity-50">
                      <ThumbsDown className="w-3.5 h-3.5" /> Reject
                    </button>
                    <button onClick={async () => { await reviewMut.mutateAsync([task.id, { decision: 'approve', note: reviewNote }] as any); setShowReview(false); }}
                      disabled={reviewMut.isPending}
                      className="flex-1 py-2 bg-green-600 text-white text-[12px] font-semibold rounded-lg flex items-center justify-center gap-1">
                      <ThumbsUp className="w-3.5 h-3.5" /> Approve
                    </button>
                  </div>
                  <button onClick={() => setShowReview(false)} className="w-full text-[11.5px] text-slate-400 hover:text-slate-600">Cancel</button>
                </div>
              ) : (
                <button onClick={() => setShowReview(true)}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-semibold rounded-lg">
                  Start Review →
                </button>
              )}
            </div>
          )}

          {/* CO sign-off */}
          {isCO && task.status === 'APPROVED_INTERNAL' && (
            <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2">
              <p className="text-[12px] font-semibold text-slate-600 uppercase tracking-wide">Final Decision</p>
              <button onClick={() => signoffMut.mutate([task.id] as any)} disabled={signoffMut.isPending}
                className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white text-[13px] font-semibold rounded-lg flex items-center justify-center gap-2">
                {signoffMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Mark as Compliant
              </button>
              {showReject ? (
                <div className="space-y-2">
                  <textarea rows={2} value={rejectNote} onChange={e => setRejectNote(e.target.value)}
                    placeholder="Reason for rejection…"
                    className="w-full px-3 py-2 text-[12px] border border-slate-200 rounded-lg resize-none" />
                  <div className="flex gap-2">
                    <button onClick={() => setShowReject(false)} className="flex-1 py-1.5 border text-[12px] text-slate-600 rounded-lg">Cancel</button>
                    <button onClick={async () => { await rejectMut.mutateAsync([task.id, { note: rejectNote }] as any); setShowReject(false); }}
                      className="flex-1 py-1.5 bg-red-500 text-white text-[12px] font-semibold rounded-lg">Reject</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowReject(true)} className="w-full py-2 border border-red-200 text-red-500 text-[12.5px] rounded-lg hover:bg-red-50">
                  Reject & Send Back
                </button>
              )}
            </div>
          )}

          {/* Metadata */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
            <p className="text-[12px] font-semibold text-slate-600 uppercase tracking-wide">Details</p>
            {[
              { label: 'Assigned To', value: task.assignedTo?.name ?? '— Unassigned' },
              { label: 'Due Date', value: new Date(task.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) },
              { label: 'Days Left', value: (() => { const d = daysLeft(task.dueDate); return d < 0 ? `${Math.abs(d)} days overdue` : `${d} days` })() },
              { label: 'Created By', value: task.createdBy?.name ?? '—' },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center">
                <span className="text-[11.5px] text-slate-400">{label}</span>
                <span className="text-[12px] font-medium text-slate-700">{value}</span>
              </div>
            ))}
          </div>

          {/* Status history */}
          {task.statusHistory.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <p className="text-[12px] font-semibold text-slate-600 uppercase tracking-wide mb-3">Activity</p>
              <div className="space-y-2.5">
                {task.statusHistory.slice(0, 5).map((h: any) => (
                  <div key={h.id} className="flex items-start gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 flex-shrink-0" />
                    <div>
                      <p className="text-[11.5px] text-slate-700 font-medium">
                        {STATUS_MAP[h.fromStatus]?.label ?? h.fromStatus} → {STATUS_MAP[h.toStatus]?.label ?? h.toStatus}
                      </p>
                      <p className="text-[10.5px] text-slate-400">
                        {h.changedBy?.name ?? 'System'} · {relativeTime(h.createdAt)}
                      </p>
                      {h.note && <p className="text-[11px] text-slate-500 mt-0.5 italic">"{h.note}"</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const ALL_STATUSES = ['All', 'PENDING', 'IN_PROGRESS', 'EVIDENCE_SUBMITTED', 'UNDER_REVIEW', 'APPROVED_INTERNAL', 'COMPLIANT', 'REJECTED'];
const STATUS_LABELS: Record<string, string> = {
  All: 'All', PENDING: 'Pending', IN_PROGRESS: 'In Progress',
  EVIDENCE_SUBMITTED: 'Evidence Submitted', UNDER_REVIEW: 'Under Review',
  APPROVED_INTERNAL: 'Approved', COMPLIANT: 'Compliant', REJECTED: 'Rejected',
};

export function ComplianceTasksPage() {
  const { role } = useApp();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [activeTab,      setActiveTab]      = useState('All');
  const [search,         setSearch]         = useState('');

  const { data: tasks = [], isLoading } = useListTasks(
    activeTab !== 'All' ? { status: activeTab } : undefined
  );

  if (selectedTaskId) return <TaskDetail taskId={selectedTaskId} onBack={() => setSelectedTaskId(null)} />;

  const isIT = role === 'it_admin';
  const isIA = role === 'internal_auditor';
  const isCO = role === 'co' || role === 'ceo';

  const filtered = (tasks as Task[]).filter(t =>
    search === '' || t.title.toLowerCase().includes(search.toLowerCase()) ||
    t.asset.name.toLowerCase().includes(search.toLowerCase())
  );

  const unassigned   = (tasks as Task[]).filter(t => !t.assignedTo && activeTab === 'All');
  const needsReview  = (tasks as Task[]).filter(t => t.status === 'EVIDENCE_SUBMITTED' && activeTab === 'All');
  const rejected     = (tasks as Task[]).filter(t => t.status === 'REJECTED' && activeTab === 'All');
  const countByTab   = (s: string) => s === 'All' ? (tasks as Task[]).length : (tasks as Task[]).filter(t => t.status === s).length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[20px] font-bold text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>Compliance Tasks</h1>
        <p className="text-[12px] text-slate-400 mt-0.5">
          {isLoading ? 'Loading…' : `${(tasks as Task[]).length} total task${(tasks as Task[]).length !== 1 ? 's' : ''}`}
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
      ) : (tasks as Task[]).length === 0 ? (
        <div className="py-20 text-center border-2 border-dashed border-slate-200 rounded-xl">
          <CheckCircle2 className="w-12 h-12 text-green-200 mx-auto mb-3" />
          <p className="text-[15px] font-semibold text-slate-500">No tasks yet</p>
          <p className="text-[13px] text-slate-400 mt-1">Tasks are auto-created when an assessment is published.</p>
        </div>
      ) : (
        <>
          {/* Priority sections for CO/CEO */}
          {isCO && (
            <div className="space-y-4">
              {needsReview.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[13px] font-bold text-slate-800 flex items-center gap-2">
                      <Eye className="w-4 h-4 text-blue-500" /> Needs IA Review
                      <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-semibold">{needsReview.length}</span>
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {needsReview.slice(0, 3).map(t => (
                      <TaskCard key={t.id} task={t} onClick={() => setSelectedTaskId(t.id)} />
                    ))}
                  </div>
                </div>
              )}
              {unassigned.length > 0 && (
                <div>
                  <p className="text-[13px] font-bold text-slate-800 flex items-center gap-2 mb-2">
                    <User className="w-4 h-4 text-amber-500" /> Unassigned
                    <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-semibold">{unassigned.length}</span>
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    {unassigned.slice(0, 3).map(t => (
                      <TaskCard key={t.id} task={t} onClick={() => setSelectedTaskId(t.id)} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* IA priority */}
          {isIA && needsReview.length > 0 && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <p className="text-[13px] font-semibold text-blue-800 mb-1">
                {needsReview.length} task{needsReview.length !== 1 ? 's' : ''} waiting for your review
              </p>
              <p className="text-[12px] text-blue-600">IT Admins have submitted evidence. Review and approve or reject.</p>
            </div>
          )}

          {/* All tasks table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex border-b border-slate-200 gap-0 overflow-x-auto">
                {ALL_STATUSES.map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className={`px-3 py-2 text-[12px] font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${activeTab === tab ? 'border-blue-500 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
                    {STATUS_LABELS[tab]}
                    <span className="ml-1 text-[10px] bg-slate-100 text-slate-500 px-1 py-0.5 rounded">{countByTab(tab)}</span>
                  </button>
                ))}
              </div>
              <div className="relative ml-4 flex-shrink-0">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks…"
                  className="pl-8 pr-3 h-8 w-52 rounded-md border border-slate-200 text-[12.5px] focus:outline-none focus:border-blue-500" />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-left text-slate-500">
                    {['Task', 'Asset / Dept', 'Reg', 'Assignee', 'Priority', 'Due', 'Status', 'Updated', ''].map(h => (
                      <th key={h} className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={9} className="py-14 text-center text-slate-400">No tasks match your filters.</td></tr>
                  ) : filtered.map(task => {
                    const dl    = daysLeft(task.dueDate);
                    const pColor = PRIORITY_COLORS[task.priority] ?? '#64748b';
                    return (
                      <tr key={task.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 cursor-pointer transition-colors"
                        onClick={() => setSelectedTaskId(task.id)}>
                        <td className="px-3 py-3">
                          <p className="font-semibold text-slate-800 max-w-[200px] truncate">{task.title}</p>
                          <p className="text-[10.5px] text-slate-400 truncate">{task.control?.title ?? task.taskCode}</p>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1.5">
                            <Database className="w-3 h-3 text-blue-400 flex-shrink-0" />
                            <span className="text-slate-700 truncate max-w-[100px]">{task.asset.name}</span>
                          </div>
                          <p className="text-[10.5px] text-slate-400 mt-0.5">{task.department?.name ?? '—'}</p>
                        </td>
                        <td className="px-3 py-3">
                          {task.regulation
                            ? <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-semibold">{task.regulation.shortCode}</span>
                            : <span className="text-slate-400">—</span>}
                        </td>
                        <td className="px-3 py-3">
                          {task.assignedTo
                            ? <span className="text-slate-600">{task.assignedTo.name}</span>
                            : <span className="text-amber-500 font-medium">Unassigned</span>}
                        </td>
                        <td className="px-3 py-3">
                          <span className="text-[10.5px] font-semibold" style={{ color: pColor }}>{task.priority}</span>
                        </td>
                        <td className={`px-3 py-3 font-medium whitespace-nowrap ${task.isOverdue ? 'text-red-600' : dl <= 3 ? 'text-amber-600' : 'text-slate-600'}`}>
                          {new Date(task.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          <p className="text-[10px] font-normal">{task.isOverdue ? `${Math.abs(dl)}d overdue` : `${dl}d left`}</p>
                        </td>
                        <td className="px-3 py-3"><StatusChip status={task.status} isOverdue={task.isOverdue} /></td>
                        <td className="px-3 py-3 text-slate-400 whitespace-nowrap">{relativeTime(task.updatedAt)}</td>
                        <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                          <button onClick={() => setSelectedTaskId(task.id)}
                            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50">
                            View <ArrowRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function TaskCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const dl = daysLeft(task.dueDate);
  return (
    <div onClick={onClick} className="bg-white border border-slate-200 rounded-lg p-3.5 cursor-pointer hover:shadow-sm hover:border-slate-300 transition-all">
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        {task.regulation && <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded font-semibold">{task.regulation.shortCode}</span>}
        <span className="text-[10px] text-slate-400 ml-auto">{task.department?.name ?? '—'}</span>
      </div>
      <p className="text-[12.5px] font-bold text-slate-900 leading-tight mb-1 line-clamp-2">{task.title}</p>
      <p className="text-[11px] text-slate-500 mb-1.5">{task.asset.name}</p>
      <div className="flex items-center justify-between">
        <StatusChip status={task.status} isOverdue={task.isOverdue} />
        <span className={`text-[10px] font-medium ${task.isOverdue ? 'text-red-500' : dl <= 3 ? 'text-amber-500' : 'text-slate-400'}`}>
          {task.isOverdue ? `${Math.abs(dl)}d overdue` : `${dl}d left`}
        </span>
      </div>
    </div>
  );
}