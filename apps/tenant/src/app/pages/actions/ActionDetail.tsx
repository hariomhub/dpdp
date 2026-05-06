import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, Play, Upload, FileText, Link2, Image, Code, Clock, CheckCircle2, XCircle, History, Edit2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatusChip, PriorityChip, MonoBadge, Btn, Card, TextareaField } from '../../components/shared/DesignSystem';
import { ACTIONS, EVIDENCE } from '../../data/mockData';

export function ActionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role } = useApp();
  const [actionStatus, setActionStatus] = useState<string>('');
  const [reviewFeedback, setReviewFeedback] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [coDecision, setCODecision] = useState('');

  const action = ACTIONS.find(a => a.id === id) || ACTIONS[0];
  const currentStatus = actionStatus || action.status;
  const evidence = EVIDENCE.filter(e => e.action === action.id);

  const isITAdmin = role === 'it_admin';
  const isIA = role === 'internal_auditor';
  const isCO = role === 'co';
  const isEA = role === 'external_auditor';

  const TYPE_ICONS: Record<string, React.ReactNode> = {
    'File': <FileText className="w-4 h-4" />,
    'Screenshot': <Image className="w-4 h-4" />,
    'Link': <Link2 className="w-4 h-4" />,
    'Config': <Code className="w-4 h-4" />,
    'Text': <FileText className="w-4 h-4" />,
  };

  return (
    <div>
      <button onClick={() => navigate('/org/actions')} className="flex items-center gap-1.5 text-[13px] text-slate-500 hover:text-slate-800 mb-4">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Actions
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <StatusChip status={currentStatus} />
            <PriorityChip priority={action.priority} />
          </div>
          <h1 className="text-[20px] font-bold text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>{action.title}</h1>
        </div>
      </div>

      <div className="flex gap-4">
        {/* Main Content */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Context Block */}
          <Card>
            <h3 className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2.5">Compliance Chain</h3>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[12px] px-2.5 py-1.5 bg-violet-50 border border-violet-200 text-violet-700 rounded-md">📋 Q1 2025 Assessment</span>
              <span className="text-slate-400">→</span>
              <span className="text-[12px] px-2.5 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-md cursor-pointer hover:bg-blue-100 transition-colors"
                onClick={() => navigate(`/org/controls/${action.control}`)}>
                🔒 {action.controlName}
              </span>
              <span className="text-slate-400">→</span>
              <span className="text-[12px] px-2.5 py-1.5 bg-green-50 border border-green-200 text-green-700 rounded-md cursor-pointer hover:bg-green-100 transition-colors"
                onClick={() => navigate(`/org/assets/${action.asset}`)}>
                🗄️ {action.assetName}
              </span>
            </div>
          </Card>

          {/* Description */}
          <Card>
            <h3 className="text-[13px] font-semibold text-slate-800 mb-2">Description</h3>
            <p className="text-[13px] text-slate-600 leading-relaxed">{action.description}</p>
            {action.instructions && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Instructions from Compliance Officer</h4>
                <p className="text-[13px] text-slate-600 leading-relaxed">{action.instructions}</p>
              </div>
            )}
            {action.evidenceRequired && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Evidence Requirements</h4>
                <p className="text-[13px] text-slate-600 leading-relaxed italic">{action.evidenceRequired}</p>
              </div>
            )}
          </Card>

          {/* ─── IT Admin: Pending → Start Working ─── */}
          {isITAdmin && currentStatus === 'Pending' && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-[13px] font-semibold text-blue-800 mb-1.5">Your Action Required</h3>
              <p className="text-[12px] text-blue-700 mb-3">Acknowledge this task to begin working. Your Compliance Officer will be notified.</p>
              <Btn onClick={() => setActionStatus('In Progress')} icon={<Play className="w-3.5 h-3.5" />}>
                Start Working on This
              </Btn>
            </div>
          )}


          {/* Upload Modal */}
          {showUpload && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="w-[540px] bg-white border border-slate-200 rounded-xl shadow-2xl p-6">
                <h3 className="text-[16px] font-semibold text-slate-900 mb-4">Upload Evidence</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[12px] font-medium text-slate-600 mb-1.5">Evidence Title *</label>
                    <input className="w-full h-9 px-3 rounded-md bg-slate-50 border border-slate-300 text-slate-900 text-[13px] focus:outline-none focus:border-blue-500" placeholder="e.g., AES-256 Encryption Config Screenshot" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-slate-600 mb-1.5">Evidence Type *</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { icon: FileText, label: 'File (PDF/DOCX)' },
                        { icon: Image, label: 'Screenshot' },
                        { icon: Link2, label: 'URL / Link' },
                        { icon: Code, label: 'Config / Code' },
                        { icon: FileText, label: 'Text Note' },
                        { icon: Clock, label: 'Log File' },
                      ].map(t => (
                        <button key={t.label} className="flex items-center gap-2 p-2.5 border border-slate-200 bg-white rounded-md hover:border-blue-400 hover:bg-blue-50 text-left transition-colors">
                          <t.icon className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-[11px] text-slate-600">{t.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-400 cursor-pointer transition-colors bg-slate-50">
                    <Upload className="w-7 h-7 text-slate-400 mx-auto mb-2" />
                    <p className="text-[13px] text-slate-600">Drop files here or click to upload</p>
                    <p className="text-[11px] text-slate-400 mt-1">PDF, DOCX, PNG, JPG up to 50MB</p>
                  </div>
                  <textarea className="w-full px-3 py-2.5 rounded-md bg-slate-50 border border-slate-300 text-slate-900 text-[13px] focus:outline-none focus:border-blue-500 resize-none h-20" placeholder="Describe what this evidence proves..." />
                </div>
                <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-100">
                  <Btn variant="ghost" onClick={() => setShowUpload(false)}>Cancel</Btn>
                  <Btn onClick={() => { 
                    setShowUpload(false); 
                    if (!isIA) setActionStatus('Evidence Submitted'); 
                  }}>
                    {isIA ? 'Save Evidence' : 'Submit Evidence for Review'}
                  </Btn>
                </div>
              </div>
            </div>
          )}

          {/* ─── Evidence Section ─── */}
          {((isITAdmin && currentStatus === 'In Progress') || isIA || evidence.length > 0) && (
            <Card>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[13px] font-semibold text-slate-800">Evidence Submissions</h3>
                {((isITAdmin && currentStatus === 'In Progress') || isIA) && (
                  <Btn size="sm" variant="secondary" icon={<Upload className="w-3.5 h-3.5" />} onClick={() => setShowUpload(true)}>
                    Upload Evidence
                  </Btn>
                )}
              </div>
              {evidence.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-slate-300 rounded-lg bg-slate-50">
                  <Upload className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                  <p className="text-[13px] text-slate-500">No evidence uploaded yet. Upload proof to submit for review.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                {evidence.map(ev => (
                  <div key={ev.id} className="p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">{TYPE_ICONS[ev.type] || <FileText className="w-4 h-4" />}</span>
                        <div>
                          <p className="text-[13px] font-medium text-slate-800">{ev.title}</p>
                          <p className="text-[11px] text-slate-400">{ev.type} · {ev.submittedBy} · {ev.submittedDate}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <MonoBadge>{ev.version}</MonoBadge>
                        <StatusChip status={ev.status} />
                        {isIA && (
                          <button className="text-[11px] text-slate-400 hover:text-blue-600 flex items-center gap-1" onClick={() => setShowUpload(true)}>
                            <Edit2 className="w-3 h-3" /> Modify
                          </button>
                        )}
                        <button className="text-[11px] text-slate-400 hover:text-blue-600 flex items-center gap-1">
                          <History className="w-3 h-3" /> History
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                </div>
              )}
            </Card>
          )}

          {/* ─── IA Review Section ─── */}
          {isIA && (currentStatus === 'Evidence Submitted' || currentStatus === 'Under Review') && (
            <Card>
              <h3 className="text-[13px] font-semibold text-slate-800 mb-2">Internal Auditor Review</h3>
              <p className="text-[12px] text-slate-500 mb-3">Review all evidence above in context of the asset and control. You may add or modify evidence before making a decision.</p>
              <TextareaField
                label="Review Feedback"
                placeholder="Describe your findings, any gaps, or what additional evidence is needed... (Required for rejection)"
                value={reviewFeedback}
                onChange={setReviewFeedback}
                rows={3}
              />
              <div className="flex gap-3 mt-3">
                <Btn icon={<CheckCircle2 className="w-4 h-4" />}
                  onClick={() => { setActionStatus('Approved (Internal)'); }}>
                  Approve Evidence
                </Btn>
                <Btn variant="danger" icon={<XCircle className="w-4 h-4" />}
                  onClick={() => { setActionStatus('Rejected'); }}>
                  Reject & Flag Gap
                </Btn>
              </div>
            </Card>
          )}

          {/* ─── CO Decision after Rejection ─── */}
          {isCO && currentStatus === 'Rejected' && (
            <Card>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4">
                <h4 className="text-[12px] font-semibold text-amber-800 mb-1">IA Rejection Feedback</h4>
                <p className="text-[13px] text-amber-700 italic">"The demo video provided does not cover the complete age verification flow. Please include the parental consent form submission step and a test case for users under 18."</p>
                <p className="text-[11px] text-amber-600 mt-1">— Rahul Mehta (Internal Auditor) · 15 min ago</p>
              </div>

              <h3 className="text-[13px] font-semibold text-slate-800 mb-3">Choose Next Action</h3>
              <div className="space-y-2">
                {[
                  { value: 'reassign', label: 'Re-delegate to same IT Admin', desc: 'Send back to Manish Kumar with updated instructions' },
                  { value: 'new', label: 'Create new improvement action', desc: 'Start fresh with different approach' },
                  { value: 'escalate', label: 'Escalate / Note as Known Risk', desc: 'Document as accepted risk if compliance not achievable' },
                ].map(opt => (
                  <button key={opt.value} onClick={() => setCODecision(opt.value)}
                    className={`w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-all
                      ${coDecision === opt.value ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50'}`}>
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5
                      ${coDecision === opt.value ? 'border-blue-500' : 'border-slate-300'}`}>
                      {coDecision === opt.value && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-slate-800">{opt.label}</p>
                      <p className="text-[12px] text-slate-500">{opt.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
              {coDecision && (
                <div className="mt-4">
                  <textarea className="w-full px-3 py-2.5 rounded-md bg-slate-50 border border-slate-300 text-slate-900 text-[13px] focus:outline-none focus:border-blue-500 resize-none h-20"
                    placeholder={coDecision === 'reassign' ? 'Updated instructions for IT Admin...' : coDecision === 'escalate' ? 'Risk justification notes...' : 'Notes for new action...'} />
                  <Btn className="mt-3" onClick={() => navigate('/org/actions')}>Confirm Decision</Btn>
                </div>
              )}
            </Card>
          )}

          {/* ─── EA Sign-Off ─── */}
          {isEA && currentStatus === 'Final Review' && (
            <Card>
              <h3 className="text-[13px] font-semibold text-amber-700 mb-2">Final Sign-Off</h3>
              <p className="text-[12px] text-slate-600 mb-3">This action has been approved by Internal Auditor Rahul Mehta. Review all evidence and provide your final certification.</p>
              <div className="p-3 bg-green-50 border border-green-200 rounded-md mb-3">
                <p className="text-[12px] text-green-700">✓ Approved by Rahul Mehta (Internal Auditor) · 2 days ago</p>
              </div>
              <TextareaField
                placeholder="Optional notes for sign-off or reasons for rejection..."
                value={reviewFeedback}
                onChange={setReviewFeedback}
                rows={3}
                className="mb-3"
              />
              <div className="flex gap-3">
                <Btn onClick={() => setActionStatus('Compliant')} size="lg" className="flex-1 justify-center" icon={<CheckCircle2 className="w-5 h-5" />}>
                  Provide Final Sign-Off
                </Btn>
                <Btn onClick={() => setActionStatus('Rejected')} size="lg" variant="danger" className="flex-1 justify-center" icon={<XCircle className="w-5 h-5" />}>
                  Reject & Return
                </Btn>
              </div>
            </Card>
          )}

          {/* ─── Completed State ─── */}
          {currentStatus === 'Compliant' && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
              <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-2" />
              <p className="text-[15px] font-semibold text-green-700">Control Marked Compliant</p>
              <p className="text-[12px] text-slate-500 mt-1">Final sign-off received. This control is now compliant on {action.assetName}.</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-60 flex-shrink-0 space-y-3">
          <Card>
            <h3 className="text-[12px] font-semibold text-slate-700 mb-3">Status Timeline</h3>
            <div className="space-y-3">
              {[
                { status: 'Pending', user: 'Priya Sharma (CO)', time: '2025-03-01', done: true },
                { status: 'In Progress', user: 'Manish Kumar (IT)', time: '2025-03-03', done: currentStatus !== 'Pending' },
                { status: 'Evidence Submitted', user: 'Manish Kumar (IT)', time: '2025-03-08', done: ['Evidence Submitted', 'Under Review', 'Approved (Internal)', 'Final Review', 'Compliant', 'Rejected'].includes(currentStatus) },
                { status: 'Under Review', user: 'Rahul Mehta (IA)', time: '2025-03-09', done: ['Approved (Internal)', 'Final Review', 'Compliant', 'Rejected'].includes(currentStatus) },
                { status: 'Final Approval', user: 'Sunita Joshi (EA)', time: '—', done: currentStatus === 'Compliant' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className={`w-3 h-3 rounded-full border flex-shrink-0 mt-0.5 ${item.done ? 'bg-green-500 border-green-500' : 'border-slate-300 bg-white'}`} />
                  <div>
                    <p className="text-[11px] font-medium text-slate-700">{item.status}</p>
                    <p className="text-[10px] text-slate-400">{item.user}</p>
                    <p className="text-[10px] text-slate-400">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h3 className="text-[12px] font-semibold text-slate-700 mb-2">Assignee</h3>
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-[11px] font-semibold border border-orange-200">MK</span>
              <div>
                <p className="text-[12px] font-medium text-slate-800">{action.assignee}</p>
                <p className="text-[11px] text-slate-400">IT Admin</p>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="text-[12px] font-semibold text-slate-700 mb-1">Due Date</h3>
            <p className="text-[13px] font-medium text-slate-800">{action.dueDate}</p>
            <p className="text-[11px] text-red-500 mt-0.5">Overdue by 23 days</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
