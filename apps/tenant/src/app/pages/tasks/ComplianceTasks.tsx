import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, CheckCircle2, Clock, ArrowRight, Search,
  User, Upload, Eye, ThumbsUp, ThumbsDown, X, FileText,
  Database, Shield, ChevronRight, Edit2, Loader2, Check, RefreshCw, Trash2, Link as LinkIcon, SlidersHorizontal
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { apiOrigin } from '../../../lib/api-client';
import {
  useListTasks, useTaskDetail, useStartTask, useSubmitTask,
  useReviewTask, useSignoffTask, useRejectFinalTask, useAssignTask,
  useAssignableUsers, useDeleteEvidence, type Task, type Action, type Evidence, type ActionEvidence, type GapFinding,
} from '../../../hooks/useTasks';
import { useAvailableAssets, useAssessmentsList } from '../../../hooks/useAssessments';
import { useListDepartments } from '../../../hooks/useOrg';
import { EvidenceUploadModal } from './EvidenceUploadModal';
import { GapFindingModal } from './GapFindingModal';
import { EditEvidenceModal, type EditableEvidence } from './EditEvidenceModal';

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
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[12.5px] font-semibold"
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

type ViewableEvidence = Pick<Evidence, 'type' | 'linkUrl' | 'fileUrl' | 'title' | 'textContent'>;

function viewEvidence(ev: ViewableEvidence, onShowText: (title: string, text: string) => void) {
  if (ev.type === 'TEXT_NOTE') { onShowText(ev.title, ev.textContent ?? ''); return; }
  const url = ev.type === 'LINK' ? ev.linkUrl : ev.fileUrl ? `${apiOrigin}${ev.fileUrl}` : null;
  if (url) window.open(url, '_blank', 'noopener,noreferrer');
}

function TextNoteModal({ title, text, onClose }: { title: string; text: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-[420px]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#D4AF37]/35">
          <p className="text-[17px] font-bold text-slate-900 truncate">{title}</p>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400" /></button>
        </div>
        <div className="p-4 max-h-80 overflow-y-auto">
          <p className="text-[15.5px] text-slate-700 whitespace-pre-wrap">{text || '—'}</p>
        </div>
      </div>
    </div>
  );
}

// Card-style trigger for the gap-finding requirement on rejection — a two-line
// label plus icon/chevron reads clearly at any length, unlike a centered button
// whose text wraps mid-word once "(required to reject)" pushes it past one line.
function GapFindingTrigger({ recorded, onClick }: { recorded: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`w-full p-2.5 rounded-lg border flex items-center gap-2.5 text-left transition-colors ${
        recorded ? 'border-green-200 bg-green-50 hover:bg-green-100' : 'border-red-200 bg-red-50/60 hover:bg-red-50'
      }`}>
      <span className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
        recorded ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
      }`}>
        {recorded ? <Check className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
      </span>
      <div className="flex-1 min-w-0">
        <p className={`text-[15px] font-semibold ${recorded ? 'text-green-700' : 'text-red-700'}`}>
          {recorded ? 'Gap Finding Recorded' : 'Record Gap Finding'}
        </p>
        <p className={`text-[13.5px] ${recorded ? 'text-green-600' : 'text-red-500'}`}>
          {recorded ? 'Tap to add another' : 'Required before you can reject'}
        </p>
      </div>
      <ChevronRight className={`w-4 h-4 flex-shrink-0 ${recorded ? 'text-green-400' : 'text-red-400'}`} />
    </button>
  );
}

// ─── Assign Modal ─────────────────────────────────────────────────────────────

function AssignModal({ taskId, current, onClose }: { taskId: string; current: string | null; onClose: () => void }) {
  const { data: users = [] }  = useAssignableUsers();
  const assignMut             = useAssignTask();
  const [selected, setSelected] = useState(current ?? '');

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-[380px]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#D4AF37]/35">
          <p className="text-[17.5px] font-bold text-slate-900">Assign Task</p>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400" /></button>
        </div>
        <div className="p-4 space-y-2 max-h-64 overflow-y-auto">
          <label className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 cursor-pointer">
            <input type="radio" checked={selected === ''} onChange={() => setSelected('')} className="accent-slate-800" />
            <span className="text-[16px] text-slate-500">Unassign (leave as PENDING)</span>
          </label>
          {(users as any[]).map((u: any) => (
            <label key={u.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 cursor-pointer">
              <input type="radio" checked={selected === u.id} onChange={() => setSelected(u.id)} className="accent-slate-800" />
              <div>
                <p className="text-[16.5px] font-medium text-slate-800">{u.name}</p>
                <p className="text-[14.5px] text-slate-400">{u.email}</p>
              </div>
            </label>
          ))}
        </div>
        <div className="flex gap-3 px-5 py-4 border-t border-[#D4AF37]/35">
          <button onClick={onClose} className="px-4 py-2 border border-slate-300 text-[16.5px] text-slate-600 rounded-lg hover:bg-slate-50">Cancel</button>
          <button
            onClick={async () => { await assignMut.mutateAsync({ id: taskId, body: { assigneeId: selected || null } }); onClose(); }}
            disabled={assignMut.isPending}
            className="flex-1 py-2 bg-slate-900 text-white text-[16.5px] font-semibold rounded-lg hover:bg-slate-800 disabled:opacity-50 flex items-center justify-center gap-2">
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
  const [uploadTarget, setUploadTarget] = useState<{ actionId?: string; productId?: string } | null>(null);
  const [editingEvidence, setEditingEvidence] = useState<EditableEvidence | null>(null);
  const [viewingText, setViewingText] = useState<{ title: string; text: string } | null>(null);
  const [gapFindingContext, setGapFindingContext] = useState<'ia' | 'ea' | null>(null);
  const [iaFindingRecorded, setIaFindingRecorded] = useState(false);
  const [eaFindingRecorded, setEaFindingRecorded] = useState(false);

  const startMut     = useStartTask();
  const submitMut    = useSubmitTask();
  const reviewMut    = useReviewTask();
  const signoffMut   = useSignoffTask();
  const rejectMut    = useRejectFinalTask();
  const deleteEvidenceMut = useDeleteEvidence();

  if (isLoading) return <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;
  if (!task) return <div className="py-20 text-center text-slate-400">Task not found.</div>;

  const isIT = role === 'it_admin';
  const isIA = role === 'internal_auditor';
  const isEA = role === 'external_auditor';
  const isCO = role === 'co' || role === 'ceo';
  const pColor = PRIORITY_COLORS[task.priority] ?? '#64748b';
  const canUpload = isIT && ['IN_PROGRESS', 'REJECTED'].includes(task.status);
  const actionsAddressed = task.control?.actions.filter(a => a.evidence.length > 0).length ?? 0;
  const actionsTotal = task.control?.actions.length ?? 0;

  return (
    <div className="space-y-4">
      {showAssign && (
        <AssignModal taskId={task.id} current={task.assignedTo?.id ?? null} onClose={() => setShowAssign(false)} />
      )}
      {uploadTarget && task.control && (
        <EvidenceUploadModal
          taskId={task.id}
          actions={task.control.actions}
          initialActionId={uploadTarget.actionId}
          initialProductId={uploadTarget.productId}
          onClose={() => setUploadTarget(null)}
        />
      )}
      {editingEvidence && (
        <EditEvidenceModal taskId={task.id} evidence={editingEvidence} onClose={() => setEditingEvidence(null)} />
      )}
      {viewingText && (
        <TextNoteModal title={viewingText.title} text={viewingText.text} onClose={() => setViewingText(null)} />
      )}
      {gapFindingContext && task.control && (
        <GapFindingModal
          taskId={task.id}
          actions={task.control.actions}
          onClose={() => setGapFindingContext(null)}
          onRecorded={() => {
            if (gapFindingContext === 'ia') setIaFindingRecorded(true);
            if (gapFindingContext === 'ea') setEaFindingRecorded(true);
          }}
        />
      )}

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[15px] text-slate-400">
        <button onClick={onBack} className="hover:text-[#D4AF37] transition-colors">Compliance Tasks</button>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-slate-800 font-medium truncate max-w-sm">{task.title}</span>
      </div>

      {/* Header */}
      <div className="bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <StatusChip status={task.status} isOverdue={task.isOverdue} />
              <span className="text-[14px] px-2 py-0.5 rounded font-semibold"
                style={{ background: `${pColor}18`, color: pColor }}>{task.priority}</span>
              <span className="text-[14px] text-slate-400 font-mono">{task.taskCode}</span>
              {task.autoAssigned && <span className="text-[13.5px] px-1.5 py-0.5 bg-[#1A3E5C]/8 text-[#1A3E5C] rounded font-semibold">Auto-delegated</span>}
            </div>
            <h1 className="text-[24px] font-bold text-slate-900" style={{ fontFamily: 'Cinzel, serif' }}>{task.title}</h1>
          </div>
          {isCO && (
            <button onClick={() => setShowAssign(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-[#D4AF37]/35 text-[15.5px] text-slate-600 rounded-lg hover:bg-slate-50">
              <User className="w-3.5 h-3.5" /> {task.assignedTo ? 'Reassign' : 'Assign'}
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-[14.5px] flex-wrap">
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
          <div className="bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] p-4 space-y-3">
            <p className="text-[16.5px] text-slate-700 leading-relaxed">{task.description}</p>
            {task.instructions && (
              <div className="p-3 bg-[#1A3E5C]/8 border border-[#D4AF37]/40 rounded-lg">
                <p className="text-[15px] font-semibold text-[#1A3E5C] mb-0.5">Instructions from CO</p>
                <p className="text-[15.5px] text-[#1A3E5C]">{task.instructions}</p>
              </div>
            )}
            {task.control?.actions && task.control.actions.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[15px] font-semibold text-slate-600">Required Actions</p>
                  <span className="text-[14px] text-slate-400">{actionsAddressed} of {actionsTotal} have evidence</span>
                </div>
                <div className="space-y-2">
                  {task.control.actions.map((action: Action, i: number) => {
                    const usedProductIds = new Set(action.evidence.map(e => e.productId).filter(Boolean));
                    return (
                    <div key={action.id} className="p-2.5 bg-slate-50 rounded-lg">
                      <div className="flex items-start gap-2.5">
                        <span className={`w-5 h-5 rounded-full text-[13px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5 ${action.evidence.length > 0 ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>
                          {action.evidence.length > 0 ? <Check className="w-3 h-3" /> : i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[15.5px] font-semibold text-slate-800">{action.title}</p>
                          <p className="text-[14.5px] text-slate-500">{action.description}</p>
                          <p className="text-[14px] text-slate-400 mt-0.5">
                            Evidence: {action.evidenceTypes?.join(', ')} · Due within {action.suggestedDueDays}d
                          </p>

                          {/* Suggested products for this action — once a product has evidence,
                              its chip switches to "done" state and re-opens the same tag to add more,
                              instead of behaving like a fresh, repeatable "mark as used" action. */}
                          {canUpload && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {action.products.map(p => {
                                const used = usedProductIds.has(p.id);
                                const count = action.evidence.filter(e => e.productId === p.id).length;
                                return (
                                  <button key={p.id} onClick={() => setUploadTarget({ actionId: action.id, productId: p.id })}
                                    title={used ? 'Add more evidence for this tool' : undefined}
                                    className={`text-[14px] px-2 py-1 rounded-md flex items-center gap-1 ${used
                                      ? 'border border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
                                      : 'border border-[#D4AF37]/35 text-slate-600 hover:border-[#1A3E5C]/30 hover:text-[#D4AF37] bg-white'}`}>
                                    {used ? <Check className="w-3 h-3" /> : '+'} {p.name}{used && count > 1 ? ` (${count})` : ''}
                                  </button>
                                );
                              })}
                              <button onClick={() => setUploadTarget({ actionId: action.id })}
                                className="text-[14px] px-2 py-1 border border-dashed border-slate-300 rounded-md text-slate-500 hover:border-[#1A3E5C]/30 hover:text-[#D4AF37] bg-white">
                                + Other tool
                              </button>
                            </div>
                          )}

                          {/* Evidence already tagged to this action */}
                          {action.evidence.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {action.evidence.map((ev: ActionEvidence) => (
                                <div key={ev.id} className="flex items-center gap-1.5 text-[14.5px] text-slate-600">
                                  <FileText className="w-3 h-3 text-[#1A3E5C]/50 flex-shrink-0" />
                                  <span className="truncate">{ev.title}</span>
                                  <span className="text-slate-400 flex-shrink-0">— {ev.productName ?? ev.otherLabel ?? 'general'}</span>
                                  <span className="flex-1" />
                                  <button onClick={() => viewEvidence(ev, (title, text) => setViewingText({ title, text }))}
                                    className="text-slate-400 hover:text-[#D4AF37] flex-shrink-0"><Eye className="w-3.5 h-3.5" /></button>
                                  {canUpload && (
                                    <button onClick={() => setEditingEvidence(ev)}
                                      className="text-slate-400 hover:text-slate-700 flex-shrink-0"><Edit2 className="w-3.5 h-3.5" /></button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Gap findings raised against this action */}
                          {action.gapFindings.length > 0 && (
                            <div className="mt-2 space-y-1.5">
                              {action.gapFindings.map(gf => (
                                <div key={gf.id} className="p-2 bg-red-50 border border-red-100 rounded-md">
                                  <p className="text-[14px] font-semibold text-red-700 flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3 flex-shrink-0" /> Gap: {gf.remediation}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Evidence list */}
          <div className="bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[16.5px] font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-400" /> Evidence
                {task.evidenceCount > 0 && <span className="text-[13.5px] bg-[#1A3E5C]/12 text-[#1A3E5C] px-1.5 rounded font-semibold">{task.evidenceCount}</span>}
              </p>
              {canUpload && (
                <button onClick={() => setUploadTarget({})}
                  className="text-[15px] text-[#1A3E5C] hover:text-[#D4AF37] flex items-center gap-1 font-medium">
                  <Upload className="w-3.5 h-3.5" /> Add Evidence
                </button>
              )}
            </div>
            {task.evidence.length === 0 ? (
              <p className="text-[15.5px] text-slate-400 py-4 text-center">No evidence uploaded yet.</p>
            ) : (
              <div className="space-y-2">
                {task.evidence.map((ev: Evidence) => (
                  <div key={ev.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-[#D4AF37]/20 hover:bg-slate-50">
                    {ev.type === 'LINK' ? <LinkIcon className="w-4 h-4 text-[#1A3E5C]/50 flex-shrink-0" /> : <FileText className="w-4 h-4 text-[#1A3E5C]/50 flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-[16px] font-medium text-slate-800 truncate">{ev.title}</p>
                      <p className="text-[14.5px] text-slate-400">{ev.type} · {relativeTime(ev.createdAt)}</p>
                      {ev.linkedActions.length > 0 && (
                        <p className="text-[14px] text-slate-400 mt-0.5 truncate">
                          Linked to: {ev.linkedActions.map(l => l.actionTitle).filter(Boolean).join(', ')}
                        </p>
                      )}
                    </div>
                    <button onClick={() => viewEvidence(ev, (title, text) => setViewingText({ title, text }))}
                      className="text-slate-400 hover:text-[#D4AF37] flex-shrink-0"><Eye className="w-4 h-4" /></button>
                    {canUpload && (
                      <>
                        <button onClick={() => setEditingEvidence(ev)}
                          className="text-slate-400 hover:text-slate-700 flex-shrink-0"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => deleteEvidenceMut.mutate({ taskId: task.id, evidenceId: ev.id })}
                          className="text-slate-300 hover:text-red-500 flex-shrink-0">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Gap findings — what auditors flagged and what to do about it */}
          {task.gapFindings.length > 0 && (
            <div className="bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] p-4 space-y-2">
              <p className="text-[16.5px] font-bold text-slate-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" /> Gap Findings
              </p>
              {task.gapFindings.map((gf: GapFinding) => (
                <div key={gf.id} className="p-3 bg-red-50 border border-red-100 rounded-lg space-y-1.5">
                  <div className="flex flex-wrap gap-1">
                    {gf.reasonCodes.map(code => (
                      <span key={code} className="text-[13.5px] font-semibold px-1.5 py-0.5 bg-red-100 text-red-700 rounded">
                        {code === 'OTHER' ? (gf.otherReason || 'Other') : code.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                  {gf.actionTitles.length > 0 && (
                    <p className="text-[14px] text-red-500">Affects: {gf.actionTitles.join(', ')}</p>
                  )}
                  <p className="text-[15.5px] text-red-800"><span className="font-semibold">Remediation: </span>{gf.remediation}</p>
                  {gf.files.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-0.5">
                      {gf.files.map(f => (
                        <a key={f.id} href={`${apiOrigin}${f.fileUrl}`} target="_blank" rel="noreferrer"
                          className="text-[14px] text-red-600 underline flex items-center gap-1">
                          <FileText className="w-3 h-3" /> {f.fileName}
                        </a>
                      ))}
                    </div>
                  )}
                  <p className="text-[14px] text-red-400">{gf.raisedByName ?? 'Reviewer'} · {relativeTime(gf.createdAt)}</p>
                </div>
              ))}
            </div>
          )}

          {/* Review notes */}
          {task.reviewNotes.length > 0 && (
            <div className="bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] p-4 space-y-2">
              <p className="text-[16.5px] font-bold text-slate-800">Reviewer Notes</p>
              {task.reviewNotes.map((n: any) => (
                <div key={n.id} className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
                  <p className="text-[15px] font-semibold text-amber-700">{n.author?.name ?? 'Reviewer'}</p>
                  <p className="text-[15.5px] text-amber-800 mt-0.5">{n.note}</p>
                  <p className="text-[14px] text-amber-500 mt-1">{relativeTime(n.createdAt)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right column — actions + metadata */}
        <div className="w-64 space-y-4 flex-shrink-0">
          {/* IT Admin actions */}
          {isIT && task.assignedTo?.id && (
            <div className="bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] p-4 space-y-2">
              <p className="text-[15px] font-semibold text-slate-600 uppercase tracking-wide">Your Actions</p>
              {task.status === 'PENDING' && (
                <button onClick={() => startMut.mutate({ id: task.id })}
                  disabled={startMut.isPending}
                  className="w-full py-2.5 bg-[#1A3E5C] hover:bg-[#15324a] text-white text-[16.5px] font-semibold rounded-lg flex items-center justify-center gap-2">
                  {startMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  Start Working
                </button>
              )}
              {task.status === 'IN_PROGRESS' && (
                <>
                  {actionsTotal > 0 && (
                    <p className="text-[14px] text-slate-400">{actionsAddressed} of {actionsTotal} actions have evidence</p>
                  )}
                  {showSubmit ? (
                    <div className="space-y-2">
                      <textarea rows={3} value={submitNote} onChange={e => setSubmitNote(e.target.value)}
                        placeholder="Optional: note for the IA reviewer…"
                        className="w-full px-3 py-2 text-[15.5px] border border-[#D4AF37]/35 rounded-lg resize-none focus:outline-none focus:border-[#1A3E5C]/40" />
                      <div className="flex gap-2">
                        <button onClick={() => setShowSubmit(false)} className="flex-1 py-1.5 border border-[#D4AF37]/35 text-[15.5px] text-slate-600 rounded-lg">Cancel</button>
                        <button onClick={async () => { await submitMut.mutateAsync({ id: task.id, body: { note: submitNote } }); setShowSubmit(false); }}
                          disabled={submitMut.isPending}
                          className="flex-1 py-1.5 bg-green-600 text-white text-[15.5px] font-semibold rounded-lg flex items-center justify-center">
                          {submitMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Submit →'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setShowSubmit(true)}
                      className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white text-[16.5px] font-semibold rounded-lg flex items-center justify-center gap-2">
                      <Upload className="w-4 h-4" /> Submit for Review
                    </button>
                  )}
                </>
              )}
              {task.status === 'REJECTED' && (
                <button onClick={() => startMut.mutate({ id: task.id })} disabled={startMut.isPending}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-[16.5px] font-semibold rounded-lg">
                  Re-open Task
                </button>
              )}
              {['EVIDENCE_SUBMITTED', 'UNDER_REVIEW', 'APPROVED_INTERNAL', 'FINAL_REVIEW', 'COMPLIANT'].includes(task.status) && (
                <p className="text-center text-[15.5px] text-slate-400 py-2">
                  {task.status === 'COMPLIANT' ? '✅ Task is compliant.' : 'Waiting for reviewer…'}
                </p>
              )}
            </div>
          )}

          {/* IA review actions */}
          {isIA && ['EVIDENCE_SUBMITTED', 'UNDER_REVIEW'].includes(task.status) && (
            <div className="bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] p-4 space-y-2">
              <p className="text-[15px] font-semibold text-slate-600 uppercase tracking-wide">Review</p>
              {showReview ? (
                <div className="space-y-2">
                  <textarea rows={2} value={reviewNote} onChange={e => setReviewNote(e.target.value)}
                    placeholder="Optional general comment…"
                    className="w-full px-3 py-2 text-[15.5px] border border-[#D4AF37]/35 rounded-lg resize-none focus:outline-none focus:border-[#1A3E5C]/40" />
                  <GapFindingTrigger recorded={iaFindingRecorded} onClick={() => setGapFindingContext('ia')} />
                  <div className="flex gap-2">
                    <button onClick={async () => { await reviewMut.mutateAsync({ id: task.id, body: { decision: 'reject', note: reviewNote } }); setShowReview(false); setIaFindingRecorded(false); }}
                      disabled={!iaFindingRecorded || reviewMut.isPending}
                      title={!iaFindingRecorded ? 'Record at least one gap finding first' : undefined}
                      className="flex-1 py-2 bg-red-500 text-white text-[15.5px] font-semibold rounded-lg flex items-center justify-center gap-1 disabled:opacity-50">
                      <ThumbsDown className="w-3.5 h-3.5" /> Reject
                    </button>
                    <button onClick={async () => { await reviewMut.mutateAsync({ id: task.id, body: { decision: 'approve', note: reviewNote } }); setShowReview(false); }}
                      disabled={reviewMut.isPending}
                      className="flex-1 py-2 bg-green-600 text-white text-[15.5px] font-semibold rounded-lg flex items-center justify-center gap-1">
                      <ThumbsUp className="w-3.5 h-3.5" /> Approve
                    </button>
                  </div>
                  <button onClick={() => { setShowReview(false); setIaFindingRecorded(false); }} className="w-full text-[15px] text-slate-400 hover:text-slate-600">Cancel</button>
                </div>
              ) : (
                <button onClick={() => setShowReview(true)}
                  className="w-full py-2.5 bg-[#1A3E5C] hover:bg-[#15324a] text-white text-[16.5px] font-semibold rounded-lg">
                  Start Review →
                </button>
              )}
            </div>
          )}

          {/* Final sign-off — External Auditor (primary), CO/CEO retain override access */}
          {(isEA || isCO) && ['APPROVED_INTERNAL', 'FINAL_REVIEW'].includes(task.status) && (
            <div className="bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] p-4 space-y-2">
              <p className="text-[15px] font-semibold text-slate-600 uppercase tracking-wide">Final Decision</p>
              <button onClick={() => signoffMut.mutate({ id: task.id })} disabled={signoffMut.isPending}
                className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white text-[16.5px] font-semibold rounded-lg flex items-center justify-center gap-2">
                {signoffMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Mark as Compliant
              </button>
              {!showReject && (
                <div className="flex items-center gap-2 py-0.5">
                  <div className="flex-1 h-px bg-slate-100" /><span className="text-[13px] text-slate-300 font-medium">OR</span><div className="flex-1 h-px bg-slate-100" />
                </div>
              )}
              {showReject ? (
                <div className="space-y-2">
                  <textarea rows={2} value={rejectNote} onChange={e => setRejectNote(e.target.value)}
                    placeholder="Optional general comment…"
                    className="w-full px-3 py-2 text-[15.5px] border border-[#D4AF37]/35 rounded-lg resize-none" />
                  <GapFindingTrigger recorded={eaFindingRecorded} onClick={() => setGapFindingContext('ea')} />
                  <div className="flex gap-2">
                    <button onClick={() => { setShowReject(false); setEaFindingRecorded(false); }} className="flex-1 py-1.5 border text-[15.5px] text-slate-600 rounded-lg">Cancel</button>
                    <button onClick={async () => { await rejectMut.mutateAsync({ id: task.id, body: { note: rejectNote } }); setShowReject(false); setEaFindingRecorded(false); }}
                      disabled={!eaFindingRecorded}
                      title={!eaFindingRecorded ? 'Record at least one gap finding first' : undefined}
                      className="flex-1 py-1.5 bg-red-500 text-white text-[15.5px] font-semibold rounded-lg disabled:opacity-50">Reject</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowReject(true)} className="w-full py-2 border border-red-200 text-red-500 text-[16px] rounded-lg hover:bg-red-50">
                  Reject & Send Back
                </button>
              )}
            </div>
          )}

          {/* Metadata */}
          <div className="bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] p-4 space-y-3">
            <p className="text-[15px] font-semibold text-slate-600 uppercase tracking-wide">Details</p>
            {[
              { label: 'Assigned To', value: task.assignedTo?.name ?? '— Unassigned' },
              { label: 'Due Date', value: new Date(task.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) },
              { label: 'Days Left', value: (() => { const d = daysLeft(task.dueDate); return d < 0 ? `${Math.abs(d)} days overdue` : `${d} days` })() },
              { label: 'Created By', value: task.createdBy?.name ?? '—' },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center">
                <span className="text-[15px] text-slate-400">{label}</span>
                <span className="text-[15.5px] font-medium text-slate-700">{value}</span>
              </div>
            ))}
          </div>

          {/* Status history */}
          {task.statusHistory.length > 0 && (
            <div className="bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] p-4">
              <p className="text-[15px] font-semibold text-slate-600 uppercase tracking-wide mb-3">Activity</p>
              <div className="space-y-2.5">
                {task.statusHistory.slice(0, 5).map((h: any) => (
                  <div key={h.id} className="flex items-start gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 flex-shrink-0" />
                    <div>
                      <p className="text-[15px] text-slate-700 font-medium">
                        {STATUS_MAP[h.fromStatus]?.label ?? h.fromStatus} → {STATUS_MAP[h.toStatus]?.label ?? h.toStatus}
                      </p>
                      <p className="text-[14px] text-slate-400">
                        {h.changedBy?.name ?? 'System'} · {relativeTime(h.createdAt)}
                      </p>
                      {h.note && <p className="text-[14.5px] text-slate-500 mt-0.5 italic">"{h.note}"</p>}
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

const ALL_STATUSES = ['All', 'PENDING', 'IN_PROGRESS', 'EVIDENCE_SUBMITTED', 'UNDER_REVIEW', 'APPROVED_INTERNAL', 'FINAL_REVIEW', 'COMPLIANT', 'REJECTED'];
const STATUS_LABELS: Record<string, string> = {
  All: 'All', PENDING: 'Pending', IN_PROGRESS: 'In Progress',
  EVIDENCE_SUBMITTED: 'Evidence Submitted', UNDER_REVIEW: 'Under Review',
  APPROVED_INTERNAL: 'Approved', FINAL_REVIEW: 'Final Review', COMPLIANT: 'Compliant', REJECTED: 'Rejected',
};

const EMPTY_FILTERS = { priority: '', assignedToId: '', assetId: '', assessmentId: '', departmentId: '', dateFrom: '', dateTo: '' };

export function ComplianceTasksPage() {
  const { role } = useApp();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [activeTab,      setActiveTab]      = useState('All');
  const [searchInput,    setSearchInput]    = useState('');
  const [search,         setSearch]         = useState('');
  const [filters,        setFilters]        = useState(EMPTY_FILTERS);
  const [overdueOnly,    setOverdueOnly]    = useState(false);
  const [showFilters,    setShowFilters]    = useState(false);

  // Debounce the search box so we're not firing a request per keystroke
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data: assignableUsers = [] } = useAssignableUsers();
  const { data: allAssets = [] } = useAvailableAssets();
  const { data: allAssessments = [] } = useAssessmentsList();
  const { data: departments = [] } = useListDepartments();

  const baseParams = useMemo(() => ({
    ...(search ? { search } : {}),
    ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== '')),
  }), [search, filters]);

  const queryParams = useMemo(() => ({
    ...baseParams,
    ...(activeTab !== 'All' ? { status: activeTab } : {}),
  }), [baseParams, activeTab]);

  const { data: tasks = [], isLoading } = useListTasks(queryParams);
  // Separate, status-unfiltered fetch (same other filters) so tab badge counts
  // stay accurate regardless of which status tab is currently active.
  const { data: allStatusTasks = [] } = useListTasks(baseParams);

  const activeFilterCount = Object.values(filters).filter(v => v !== '').length + (overdueOnly ? 1 : 0);
  const clearFilters = () => { setFilters(EMPTY_FILTERS); setOverdueOnly(false); };

  if (selectedTaskId) return <TaskDetail taskId={selectedTaskId} onBack={() => setSelectedTaskId(null)} />;

  const isIT = role === 'it_admin';
  const isIA = role === 'internal_auditor';
  const isEA = role === 'external_auditor';
  const isCO = role === 'co' || role === 'ceo';

  const filtered = (tasks as Task[]).filter(t => !overdueOnly || t.isOverdue);

  const unassigned    = (tasks as Task[]).filter(t => !t.assignedTo && activeTab === 'All');
  const needsReview   = (tasks as Task[]).filter(t => t.status === 'EVIDENCE_SUBMITTED' && activeTab === 'All');
  const needsSignoff  = (tasks as Task[]).filter(t => t.status === 'FINAL_REVIEW' && activeTab === 'All');
  const rejected      = (tasks as Task[]).filter(t => t.status === 'REJECTED' && activeTab === 'All');
  const countByTab   = (s: string) => s === 'All' ? (allStatusTasks as Task[]).length : (allStatusTasks as Task[]).filter(t => t.status === s).length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[24px] font-bold text-slate-900" style={{ fontFamily: 'Cinzel, serif' }}>Compliance Tasks</h1>
        <p className="text-[14px] text-slate-400 mt-0.5">
          {isLoading ? 'Loading…' : `${(tasks as Task[]).length} total task${(tasks as Task[]).length !== 1 ? 's' : ''}`}
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
      ) : (tasks as Task[]).length === 0 && activeFilterCount === 0 && activeTab === 'All' && !search ? (
        <div className="py-20 text-center border-2 border-dashed border-[#D4AF37]/35 rounded-xl">
          <CheckCircle2 className="w-12 h-12 text-green-200 mx-auto mb-3" />
          <p className="text-[17px] font-semibold text-slate-500">No tasks yet</p>
          <p className="text-[15px] text-slate-400 mt-1">Tasks are auto-created when an assessment is published.</p>
        </div>
      ) : (
        <>
          {/* Priority sections for CO/CEO */}
          {isCO && (
            <div className="space-y-4">
              {needsReview.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[15px] font-bold text-slate-800 flex items-center gap-2">
                      <Eye className="w-4 h-4 text-[#1A3E5C]" /> Needs IA Review
                      <span className="text-[12px] bg-[#1A3E5C]/12 text-[#1A3E5C] px-1.5 py-0.5 rounded font-semibold">{needsReview.length}</span>
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
                  <p className="text-[15px] font-bold text-slate-800 flex items-center gap-2 mb-2">
                    <User className="w-4 h-4 text-amber-500" /> Unassigned
                    <span className="text-[12px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-semibold">{unassigned.length}</span>
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
            <div className="p-4 bg-[#1A3E5C]/8 border border-[#D4AF37]/40 rounded-xl">
              <p className="text-[15px] font-semibold text-[#15324a] mb-1">
                {needsReview.length} task{needsReview.length !== 1 ? 's' : ''} waiting for your review
              </p>
              <p className="text-[14px] text-[#1A3E5C]">IT Admins have submitted evidence. Review and approve or reject.</p>
            </div>
          )}

          {/* External Auditor priority */}
          {isEA && needsSignoff.length > 0 && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-[15px] font-semibold text-amber-800 mb-1">
                {needsSignoff.length} task{needsSignoff.length !== 1 ? 's' : ''} waiting for final sign-off
              </p>
              <p className="text-[14px] text-amber-600">Internal Auditor has approved these. Review and mark compliant or reject.</p>
            </div>
          )}

          {/* All tasks table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex border-b border-[#D4AF37]/35 gap-0 overflow-x-auto">
                {ALL_STATUSES.map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className={`px-3 py-2 text-[14px] font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${activeTab === tab ? 'border-[#1A3E5C] text-[#1A3E5C]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
                    {STATUS_LABELS[tab]}
                    <span className="ml-1 text-[12px] bg-slate-100 text-slate-500 px-1 py-0.5 rounded">{countByTab(tab)}</span>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="Search tasks…"
                    className="pl-8 pr-3 h-8 w-52 rounded-md border border-[#D4AF37]/35 text-[14.5px] focus:outline-none focus:border-[#1A3E5C]" />
                </div>
                <button onClick={() => setShowFilters(s => !s)}
                  className={`flex items-center gap-1.5 h-8 px-3 rounded-md text-[13.5px] font-medium border transition-colors ${showFilters || activeFilterCount > 0 ? 'bg-[#1A3E5C] text-white border-[#1A3E5C]' : 'border-[#D4AF37]/35 text-slate-600 hover:bg-slate-50'}`}>
                  <SlidersHorizontal className="w-3.5 h-3.5" /> Filters
                  {activeFilterCount > 0 && <span className="text-[11px] bg-white/20 px-1.5 py-0.5 rounded-full">{activeFilterCount}</span>}
                </button>
              </div>
            </div>

            {showFilters && (
              <div className="bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] p-3 flex flex-wrap items-end gap-3">
                <div>
                  <label className="block text-[12px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Priority</label>
                  <select value={filters.priority} onChange={e => setFilters(f => ({ ...f, priority: e.target.value }))}
                    className="h-8 px-2 rounded-md border border-[#D4AF37]/35 text-[13.5px] text-slate-700 bg-white focus:outline-none focus:border-[#1A3E5C]">
                    <option value="">All Priorities</option>
                    {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(p => <option key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Assignee</label>
                  <select value={filters.assignedToId} onChange={e => setFilters(f => ({ ...f, assignedToId: e.target.value }))}
                    className="h-8 px-2 rounded-md border border-[#D4AF37]/35 text-[13.5px] text-slate-700 bg-white focus:outline-none focus:border-[#1A3E5C] max-w-[160px]">
                    <option value="">All Assignees</option>
                    {assignableUsers.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Department</label>
                  <select value={filters.departmentId} onChange={e => setFilters(f => ({ ...f, departmentId: e.target.value }))}
                    className="h-8 px-2 rounded-md border border-[#D4AF37]/35 text-[13.5px] text-slate-700 bg-white focus:outline-none focus:border-[#1A3E5C] max-w-[160px]">
                    <option value="">All Departments</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Asset</label>
                  <select value={filters.assetId} onChange={e => setFilters(f => ({ ...f, assetId: e.target.value }))}
                    className="h-8 px-2 rounded-md border border-[#D4AF37]/35 text-[13.5px] text-slate-700 bg-white focus:outline-none focus:border-[#1A3E5C] max-w-[160px]">
                    <option value="">All Assets</option>
                    {allAssets.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Assessment</label>
                  <select value={filters.assessmentId} onChange={e => setFilters(f => ({ ...f, assessmentId: e.target.value }))}
                    className="h-8 px-2 rounded-md border border-[#D4AF37]/35 text-[13.5px] text-slate-700 bg-white focus:outline-none focus:border-[#1A3E5C] max-w-[160px]">
                    <option value="">All Assessments</option>
                    {allAssessments.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Due From</label>
                  <input type="date" value={filters.dateFrom} onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
                    className="h-8 px-2 rounded-md border border-[#D4AF37]/35 text-[13.5px] text-slate-700 bg-white focus:outline-none focus:border-[#1A3E5C]" />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Due To</label>
                  <input type="date" value={filters.dateTo} onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))}
                    className="h-8 px-2 rounded-md border border-[#D4AF37]/35 text-[13.5px] text-slate-700 bg-white focus:outline-none focus:border-[#1A3E5C]" />
                </div>
                <button onClick={() => setOverdueOnly(o => !o)}
                  className={`h-8 px-3 rounded-md text-[13.5px] font-medium border transition-colors ${overdueOnly ? 'bg-red-50 text-red-700 border-red-200' : 'border-[#D4AF37]/35 text-slate-600 hover:bg-slate-50'}`}>
                  ⚠ Overdue only
                </button>
                {activeFilterCount > 0 && (
                  <button onClick={clearFilters} className="h-8 px-3 rounded-md text-[13.5px] font-medium text-[#1A3E5C] hover:bg-[#1A3E5C]/8 flex items-center gap-1">
                    <X className="w-3.5 h-3.5" /> Clear filters
                  </button>
                )}
              </div>
            )}

            <div className="bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] overflow-hidden">
              <table className="w-full text-[14px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-left text-slate-500">
                    {['Task', 'Asset / Dept', 'Reg', 'Assignee', 'Priority', 'Due', 'Status', 'Updated', ''].map(h => (
                      <th key={h} className="px-3 py-2.5 text-[13px] font-semibold uppercase tracking-wide whitespace-nowrap">{h}</th>
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
                          <p className="text-[12.5px] text-slate-400 truncate">{task.control?.title ?? task.taskCode}</p>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1.5">
                            <Database className="w-3 h-3 text-[#1A3E5C]/50 flex-shrink-0" />
                            <span className="text-slate-700 truncate max-w-[100px]">{task.asset.name}</span>
                          </div>
                          <p className="text-[12.5px] text-slate-400 mt-0.5">{task.department?.name ?? '—'}</p>
                        </td>
                        <td className="px-3 py-3">
                          {task.regulation
                            ? <span className="px-1.5 py-0.5 bg-[#1A3E5C]/8 text-[#1A3E5C] rounded text-[12px] font-semibold">{task.regulation.shortCode}</span>
                            : <span className="text-slate-400">—</span>}
                        </td>
                        <td className="px-3 py-3">
                          {task.assignedTo
                            ? <span className="text-slate-600">{task.assignedTo.name}</span>
                            : <span className="text-amber-500 font-medium">Unassigned</span>}
                        </td>
                        <td className="px-3 py-3">
                          <span className="text-[12.5px] font-semibold" style={{ color: pColor }}>{task.priority}</span>
                        </td>
                        <td className={`px-3 py-3 font-medium whitespace-nowrap ${task.isOverdue ? 'text-red-600' : dl <= 3 ? 'text-amber-600' : 'text-slate-600'}`}>
                          {new Date(task.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          <p className="text-[12px] font-normal">{task.isOverdue ? `${Math.abs(dl)}d overdue` : `${dl}d left`}</p>
                        </td>
                        <td className="px-3 py-3"><StatusChip status={task.status} isOverdue={task.isOverdue} /></td>
                        <td className="px-3 py-3 text-slate-400 whitespace-nowrap">{relativeTime(task.updatedAt)}</td>
                        <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                          <button onClick={() => setSelectedTaskId(task.id)}
                            className="flex items-center gap-1 px-2.5 py-1 text-[13px] font-medium text-[#1A3E5C] border border-[#D4AF37]/40 rounded-lg hover:bg-[#1A3E5C]/8">
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
    <div onClick={onClick} className="bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] p-3.5 cursor-pointer hover:shadow-sm hover:border-slate-300 transition-all">
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        {task.regulation && <span className="text-[12px] px-1.5 py-0.5 bg-[#1A3E5C]/8 text-[#1A3E5C] rounded font-semibold">{task.regulation.shortCode}</span>}
        <span className="text-[12px] text-slate-400 ml-auto">{task.department?.name ?? '—'}</span>
      </div>
      <p className="text-[14.5px] font-bold text-slate-900 leading-tight mb-1 line-clamp-2">{task.title}</p>
      <p className="text-[13px] text-slate-500 mb-1.5">{task.asset.name}</p>
      <div className="flex items-center justify-between">
        <StatusChip status={task.status} isOverdue={task.isOverdue} />
        <span className={`text-[12px] font-medium ${task.isOverdue ? 'text-red-500' : dl <= 3 ? 'text-amber-500' : 'text-slate-400'}`}>
          {task.isOverdue ? `${Math.abs(dl)}d overdue` : `${dl}d left`}
        </span>
      </div>
    </div>
  );
}