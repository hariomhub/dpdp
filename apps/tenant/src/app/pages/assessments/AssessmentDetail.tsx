import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, AlertTriangle, X } from 'lucide-react';
import { StatusChip, MonoBadge, TabNav, Btn, Card, MetricCard, ProgressBar, PriorityChip } from '../../components/shared/DesignSystem';
import { useApp } from '../../context/AppContext';
import { useAssessmentDetail } from '../../../hooks/useAssessments';

export function AssessmentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role } = useApp();
  const [activeTab, setActiveTab] = useState('Controls');
  const [showCloseModal, setShowCloseModal] = useState(false);
  const isCO = role === 'co';

  const { data: assessment, isLoading, error } = useAssessmentDetail(id);

  if (isLoading) {
    return <div className="py-24 text-center text-slate-500">Loading assessment details...</div>;
  }

  if (error || !assessment) {
    return (
      <div className="py-24 text-center">
        <p className="text-red-500 mb-4">Assessment not found or failed to load.</p>
        <Btn onClick={() => navigate('/org/assessments')}>Return to Assessments</Btn>
      </div>
    );
  }

  const assAssets = assessment.assets.map((a: any) => a.asset);
  
  // Exclude ignored controls from calculation
  const validControls = assessment.controls.filter((c: any) => !c.isExcluded);
  const totalValidControls = validControls.length;
  const compliantControls = validControls.filter((c: any) => c.complianceStatus === 'COMPLIANT').length;
  const inProgressControls = validControls.filter((c: any) => c.complianceStatus === 'IN_PROGRESS').length;
  const nonCompliant = totalValidControls - compliantControls - inProgressControls;
  
  const pct = totalValidControls > 0 ? Math.round((compliantControls / totalValidControls) * 100) : 0;

  const chapters = [...new Set(validControls.map((c: any) => c.chapter))];

  const endDate = new Date(assessment.endDate);
  const now = new Date();
  const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  return (
    <div>
      <button onClick={() => navigate('/org/assessments')} className="flex items-center gap-1.5 text-[13px] text-slate-500 hover:text-slate-800 mb-3">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Assessments
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-[20px] font-bold text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>{assessment.name}</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <StatusChip status={assessment.status === 'ACTIVE' ? 'In Progress' : assessment.status} />
            <span className="text-[12px] text-slate-400">
              {new Date(assessment.startDate).toLocaleDateString()} → {new Date(assessment.endDate).toLocaleDateString()}
            </span>
            {assAssets.map((a: any) => (
              <span key={a.id} className="text-[11px] px-1.5 py-0.5 bg-slate-100 border border-slate-200 text-slate-600 rounded">{a.name}</span>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          {isCO && assessment.status === 'ACTIVE' && (
            <>
              <Btn variant="secondary">Edit</Btn>
              <Btn variant="danger" onClick={() => setShowCloseModal(true)}>Close Assessment</Btn>
            </>
          )}
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 min-w-0">
          {/* KPI Row */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            <MetricCard label="Total Controls" value={totalValidControls} accentColor="#3B82F6" />
            <MetricCard label="Compliant" value={compliantControls} accentColor="#22C55E" />
            <MetricCard label="In Progress" value={inProgressControls} accentColor="#84CC16" />
            <MetricCard label="Non-Compliant" value={nonCompliant} accentColor="#F87171" />
          </div>
          <div className="mb-4">
            <div className="flex justify-between text-[12px] mb-1">
              <span className="text-slate-500">Overall compliance</span>
              <span className="font-semibold text-slate-800">{pct}%</span>
            </div>
            <ProgressBar compliant={compliantControls} inProgress={inProgressControls} total={totalValidControls} />
          </div>

          <TabNav tabs={['Controls', 'Actions', 'Audit Trail']} active={activeTab} onChange={setActiveTab} />

          {activeTab === 'Controls' && (
            <div className="space-y-2">
              {chapters.map((chapter: any) => (
                <div key={chapter} className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{chapter}</span>
                  </div>
                  {validControls.filter((c: any) => c.chapter === chapter).map((ctrl: any) => (
                    <div key={ctrl.id} className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/org/controls/${ctrl.id}`)}>
                      <MonoBadge>{assessment.regulationDetails?.shortCode}-{ctrl.title.substring(0,4)}</MonoBadge>
                      <span className="flex-1 text-[12.5px] text-slate-700">{ctrl.title}</span>
                      <StatusChip status={ctrl.complianceStatus} />
                      {isCO && <Btn size="sm" variant="secondary" onClick={e => { e.stopPropagation(); navigate('/org/actions/new'); }}>Create Action</Btn>}
                    </div>
                  ))}
                </div>
              ))}
              {chapters.length === 0 && (
                <div className="text-center py-12 text-slate-400 text-[13px]">No controls mapped to this assessment.</div>
              )}
            </div>
          )}

          {activeTab === 'Actions' && (
            <div className="space-y-2">
              {assessment.complianceTasks.map((action: any) => (
                <div key={action.id} onClick={() => navigate(`/org/actions/${action.id}`)}
                  className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                  <PriorityChip priority={action.priority} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12.5px] font-medium text-slate-800 truncate">{action.title}</p>
                    <p className="text-[11px] text-slate-400">{action.asset?.name} · {action.assignedTo?.name || 'Unassigned'}</p>
                  </div>
                  <StatusChip status={action.status} />
                </div>
              ))}
              {assessment.complianceTasks.length === 0 && (
                <div className="text-center py-12 text-slate-400 text-[13px]">No actions created yet.</div>
              )}
            </div>
          )}

          {activeTab === 'Audit Trail' && (
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <div className={`flex gap-3 px-4 py-3 border-b border-slate-100`}>
                <p className="text-[11px] font-mono text-slate-400 w-40 flex-shrink-0">{new Date(assessment.createdAt).toLocaleString()}</p>
                <p className="text-[12.5px] text-slate-700"><strong className="font-semibold">System</strong> <span className="text-slate-500">created this assessment</span></p>
              </div>
              <div className={`flex gap-3 px-4 py-3`}>
                <p className="text-[11px] font-mono text-slate-400 w-40 flex-shrink-0">{new Date(assessment.createdAt).toLocaleString()}</p>
                <p className="text-[12.5px] text-slate-700"><strong className="font-semibold">System</strong> <span className="text-slate-500">mapped {totalValidControls} controls and excluded {assessment.controls.filter((c:any) => c.isExcluded).length}</span></p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-60 flex-shrink-0 space-y-3">
          <Card>
            <h3 className="text-[12px] font-semibold text-slate-700 mb-3">Assessment Scope</h3>
            <div className="space-y-3 text-[12px]">
              <div className="flex justify-between"><span className="text-slate-400">Department</span><span className="font-medium text-slate-800">{assessment.department?.name}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Regulation</span><span className="font-medium text-slate-800">{assessment.regulationDetails?.name}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Assets</span><span className="font-medium text-slate-800">{assAssets.length}</span></div>
            </div>
          </Card>
          <Card>
            <h3 className="text-[12px] font-semibold text-slate-700 mb-2">Timeline</h3>
            <div className="space-y-1.5 text-[12px]">
              <div className="flex justify-between"><span className="text-slate-400">Start</span><span className="font-medium text-slate-800">{new Date(assessment.startDate).toLocaleDateString()}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">End</span><span className="font-medium text-slate-800">{new Date(assessment.endDate).toLocaleDateString()}</span></div>
              <div className="flex justify-between">
                <span className="text-slate-400">Remaining</span>
                <span className={daysRemaining <= 7 ? 'text-red-500 font-medium' : 'text-amber-600 font-medium'}>{daysRemaining} days</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Close Assessment Modal */}
      {showCloseModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="w-96 bg-white border border-slate-200 rounded-xl shadow-2xl p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-[15px] font-semibold text-slate-900 mb-1">Close Assessment?</h3>
                <p className="text-[12px] text-slate-500 leading-relaxed">
                  Closing this assessment will make it read-only. It cannot be re-opened — a new assessment must be created for future evaluation cycles.
                </p>
              </div>
              <button onClick={() => setShowCloseModal(false)} className="text-slate-400 hover:text-slate-700 p-0.5 rounded flex-shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-2 justify-end pt-4 border-t border-slate-100">
              <Btn variant="ghost" onClick={() => setShowCloseModal(false)}>Cancel</Btn>
              <Btn variant="danger" onClick={() => { setShowCloseModal(false); navigate('/org/assessments'); }}>Close Assessment</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
