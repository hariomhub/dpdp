import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, AlertTriangle, X } from 'lucide-react';
import { StatusChip, MonoBadge, TabNav, Btn, Card, MetricCard, ProgressBar, PriorityChip } from '../../components/shared/DesignSystem';
import { ASSESSMENTS, CONTROLS, ACTIONS, ASSETS } from '../../data/mockData';
import { useApp } from '../../context/AppContext';

export function AssessmentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role } = useApp();
  const [activeTab, setActiveTab] = useState('Controls');
  const [showCloseModal, setShowCloseModal] = useState(false);
  const assessment = ASSESSMENTS.find(a => a.id === id) || ASSESSMENTS[0];
  const isCO = role === 'co';

  const assAssets = ASSETS.filter(a => assessment.assets.includes(a.id));
  const nonCompliant = assessment.totalControls - assessment.compliantControls - 8;
  const pct = Math.round((assessment.compliantControls / assessment.totalControls) * 100);

  const chapters = [...new Set(CONTROLS.map(c => c.chapter))];

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
            <StatusChip status={assessment.status === 'Active' ? 'In Progress' : assessment.status} />
            <span className="text-[12px] text-slate-400">{assessment.startDate} → {assessment.endDate}</span>
            {assAssets.map(a => (
              <span key={a.id} className="text-[11px] px-1.5 py-0.5 bg-slate-100 border border-slate-200 text-slate-600 rounded">{a.name}</span>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          {isCO && assessment.status === 'Active' && (
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
            <MetricCard label="Total Controls" value={assessment.totalControls} accentColor="#3B82F6" />
            <MetricCard label="Compliant" value={assessment.compliantControls} accentColor="#22C55E" />
            <MetricCard label="In Progress" value={8} accentColor="#84CC16" />
            <MetricCard label="Non-Compliant" value={nonCompliant} accentColor="#F87171" />
          </div>
          <div className="mb-4">
            <div className="flex justify-between text-[12px] mb-1">
              <span className="text-slate-500">Overall compliance</span>
              <span className="font-semibold text-slate-800">{pct}%</span>
            </div>
            <ProgressBar compliant={assessment.compliantControls} inProgress={8} total={assessment.totalControls} />
          </div>

          <TabNav tabs={['Controls', 'Actions', 'Evidence', 'Audit Trail']} active={activeTab} onChange={setActiveTab} />

          {activeTab === 'Controls' && (
            <div className="space-y-2">
              {chapters.map(chapter => (
                <div key={chapter} className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{chapter}</span>
                  </div>
                  {CONTROLS.filter(c => c.chapter === chapter).map(ctrl => (
                    <div key={ctrl.id} className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/org/controls/${ctrl.id}`)}>
                      <MonoBadge>{ctrl.id}</MonoBadge>
                      <span className="flex-1 text-[12.5px] text-slate-700">{ctrl.title}</span>
                      <div className="flex flex-wrap gap-1">
                        {assAssets.slice(0, 2).map(a => (
                          <span key={a.id} className="text-[10px] px-1.5 py-0.5 bg-slate-100 border border-slate-200 text-slate-400 rounded">{a.name}</span>
                        ))}
                      </div>
                      <StatusChip status={ctrl.status} />
                      {isCO && <Btn size="sm" variant="secondary" onClick={e => { e.stopPropagation(); navigate('/org/actions/new'); }}>Create Action</Btn>}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'Actions' && (
            <div className="space-y-2">
              {ACTIONS.map(action => (
                <div key={action.id} onClick={() => navigate(`/org/actions/${action.id}`)}
                  className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                  <PriorityChip priority={action.priority} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12.5px] font-medium text-slate-800 truncate">{action.title}</p>
                    <p className="text-[11px] text-slate-400">{action.assetName} · {action.assignee}</p>
                  </div>
                  <StatusChip status={action.status} />
                </div>
              ))}
            </div>
          )}

          {activeTab === 'Evidence' && (
            <div className="text-center py-12 text-slate-400 text-[13px]">Evidence for all actions in this assessment</div>
          )}

          {activeTab === 'Audit Trail' && (
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              {[
                { time: '2025-01-10 09:00', user: 'Priya Sharma', action: 'created this assessment' },
                { time: '2025-01-10 09:05', user: 'System', action: 'auto-mapped 42 controls from 3 selected assets' },
                { time: '2025-02-05 14:30', user: 'Priya Sharma', action: 'added AST-004 (AWS Cloud Infrastructure) to assessment scope' },
              ].map((e, i, arr) => (
                <div key={i} className={`flex gap-3 px-4 py-3 ${i < arr.length - 1 ? 'border-b border-slate-100' : ''}`}>
                  <p className="text-[11px] font-mono text-slate-400 w-40 flex-shrink-0">{e.time}</p>
                  <p className="text-[12.5px] text-slate-700"><strong className="font-semibold">{e.user}</strong> <span className="text-slate-500">{e.action}</span></p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-60 flex-shrink-0 space-y-3">
          <Card>
            <h3 className="text-[12px] font-semibold text-slate-700 mb-3">Per-Asset Breakdown</h3>
            <div className="space-y-3">
              {assAssets.map(asset => (
                <div key={asset.id}>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-500 truncate">{asset.name}</span>
                    <span className="font-semibold text-slate-800 flex-shrink-0 ml-2">{asset.compliantControls}/{asset.totalControls}</span>
                  </div>
                  <ProgressBar compliant={asset.compliantControls} inProgress={1} total={asset.totalControls} />
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <h3 className="text-[12px] font-semibold text-slate-700 mb-2">Timeline</h3>
            <div className="space-y-1.5 text-[12px]">
              <div className="flex justify-between"><span className="text-slate-400">Start</span><span className="font-medium text-slate-800">{assessment.startDate}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">End</span><span className="font-medium text-slate-800">{assessment.endDate}</span></div>
              <div className="flex justify-between">
                <span className="text-slate-400">Remaining</span>
                <span className={assessment.daysRemaining <= 7 ? 'text-red-500 font-medium' : 'text-amber-600 font-medium'}>{assessment.daysRemaining} days</span>
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
