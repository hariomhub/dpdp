import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, Lock, Sparkles, Shield } from 'lucide-react';
import { StatusChip, MonoBadge, TabNav, Card, PriorityChip, EmptyState } from '../../components/shared/DesignSystem';
import { useControl } from '../../../hooks/useControls';
import { useListTasks } from '../../../hooks/useTasks';

const APPLICABLE_LABELS: Record<string, string> = {
  DATA_FIDUCIARY: 'Data Fiduciary',
  SIGNIFICANT_DF: 'Significant DF',
  BOTH: 'Both',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending', IN_PROGRESS: 'In Progress', EVIDENCE_SUBMITTED: 'Evidence Submitted',
  UNDER_REVIEW: 'Under Review', APPROVED_INTERNAL: 'Approved (Internal)', FINAL_REVIEW: 'Final Review',
  COMPLIANT: 'Compliant', REJECTED: 'Rejected',
};

const EVIDENCE_TYPE_LABELS: Record<string, string> = {
  FILE: 'File', SCREENSHOT: 'Screenshot', CONFIG: 'Configuration Export',
  DOCUMENT: 'Document', LINK: 'External Link', TEXT_NOTE: 'Text Note', LOG: 'Log',
};

const PRIORITY_LABELS: Record<string, string> = { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', CRITICAL: 'Critical' };

export function ControlDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Overview');

  const { data: control, isLoading, isError } = useControl(id);
  const { data: tasks = [] } = useListTasks({ controlId: id });

  const assetRows = useMemo(() => {
    const byAsset = new Map<string, { asset: any; status: string; openCount: number; updatedAt: string }>();
    for (const t of tasks) {
      const existing = byAsset.get(t.asset.id);
      if (!existing || new Date(t.updatedAt) > new Date(existing.updatedAt)) {
        byAsset.set(t.asset.id, {
          asset: t.asset,
          status: t.status,
          openCount: tasks.filter(x => x.asset.id === t.asset.id && x.status !== 'COMPLIANT').length,
          updatedAt: t.updatedAt,
        });
      }
    }
    return Array.from(byAsset.values());
  }, [tasks]);

  if (isLoading) {
    return <div className="text-center py-16 text-slate-500">Loading control...</div>;
  }
  if (isError || !control) {
    return (
      <div>
        <button onClick={() => navigate('/org/controls')} className="flex items-center gap-1.5 text-[15px] text-slate-500 hover:text-slate-800 mb-3">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Controls
        </button>
        <EmptyState icon={<Shield className="w-10 h-10" />} title="Control not found" description="This control may have been removed or you don't have access to it." />
      </div>
    );
  }

  return (
    <div>
      <button onClick={() => navigate('/org/controls')} className="flex items-center gap-1.5 text-[15px] text-slate-500 hover:text-slate-800 mb-3">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Controls
      </button>

      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <MonoBadge>{control.id.slice(0, 8)}</MonoBadge>
          <span className="text-[13px] px-2 py-0.5 rounded bg-slate-100 border border-[#D4AF37]/35 text-slate-500 flex items-center gap-1">
            {control.isCustom ? <><Sparkles className="w-2.5 h-2.5" /> Custom Control</> : <><Lock className="w-2.5 h-2.5" /> Platform Control</>}
          </span>
          <span className={`text-[13px] px-2 py-0.5 rounded font-medium ${control.applicableTo === 'BOTH' ? 'bg-[#1A3E5C]/8 text-[#1A3E5C]' : 'bg-green-50 text-green-700'}`}>
            {APPLICABLE_LABELS[control.applicableTo]}
          </span>
          <StatusChip status={control.status === 'PUBLISHED' ? 'Published' : 'Draft'} />
        </div>
        <h1 className="text-[24px] font-bold text-slate-900 mb-0.5" style={{ fontFamily: 'Cinzel, serif' }}>{control.title}</h1>
        {control.regulationMappings.length > 0 ? (
          <p className="text-[14px] text-slate-500">
            {control.regulationMappings.map((m, i) => (
              <span key={`${m.regulationId}-${i}`}>
                {i > 0 && ' · '}
                <span className="font-semibold">{m.regulation.shortCode}</span>
                {m.chapter && ` — ${m.chapter.title ?? m.chapter.name}`}
              </span>
            ))}
          </p>
        ) : (
          <p className="text-[14px] text-slate-400">Internal control — not mapped to a regulation</p>
        )}
      </div>

      <TabNav tabs={['Overview', 'Per-Asset Status', 'Actions', 'Evidence']} active={activeTab} onChange={setActiveTab} />

      {activeTab === 'Overview' && (
        <div className="space-y-3">
          <Card>
            <h3 className="text-[15px] font-semibold text-slate-800 mb-2">Description</h3>
            <p className="text-[15px] text-slate-600 leading-relaxed">{control.description}</p>
          </Card>
          <Card>
            <h3 className="text-[15px] font-semibold text-slate-800 mb-3">Pre-defined Actions ({control.predefinedActions.length})</h3>
            {control.predefinedActions.length === 0 ? (
              <p className="text-[14px] text-slate-400">No pre-defined actions configured for this control.</p>
            ) : (
              <div className="space-y-3">
                {control.predefinedActions.map(action => (
                  <div key={action.id} className="p-3 border border-slate-100 rounded-lg">
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <p className="text-[14.5px] font-semibold text-slate-800">{action.title}</p>
                      <PriorityChip priority={PRIORITY_LABELS[action.priority] ?? action.priority} />
                    </div>
                    <p className="text-[13.5px] text-slate-500 mb-2">{action.description}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {action.evidenceTypes.map(t => (
                        <span key={t} className="text-[12px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-medium">{EVIDENCE_TYPE_LABELS[t] ?? t}</span>
                      ))}
                      <span className="text-[12px] px-1.5 py-0.5 bg-[#1A3E5C]/8 text-[#1A3E5C] rounded font-medium">Due in {action.suggestedDueDays} days</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === 'Per-Asset Status' && (
        <div>
          <p className="text-[14px] text-slate-500 mb-3">Compliance status of this control per asset — the same control can be Compliant on one asset and Non-Compliant on another.</p>
          {assetRows.length === 0 ? (
            <EmptyState icon={<Shield className="w-10 h-10" />} title="Not assigned to any asset yet" description="This control has not been included in any assessment yet." />
          ) : (
            <div className="bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-[#D4AF37]/35">
                    {['Asset Name', 'Asset Type', 'Status', 'Open Actions', 'Last Updated'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-[13px] font-semibold text-slate-500 uppercase tracking-widest">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {assetRows.map(row => (
                    <tr key={row.asset.id} className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => navigate(`/org/assets/${row.asset.id}`)}>
                      <td className="px-4 py-3 text-[14.5px] font-medium text-slate-800">{row.asset.name}</td>
                      <td className="px-4 py-3 text-[14px] text-slate-500">{row.asset.assetType}</td>
                      <td className="px-4 py-3"><StatusChip status={STATUS_LABELS[row.status] ?? row.status} /></td>
                      <td className="px-4 py-3 text-[14px] text-slate-600">{row.openCount}</td>
                      <td className="px-4 py-3 text-[13px] text-slate-400">{new Date(row.updatedAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'Actions' && (
        <div className="space-y-2">
          {tasks.length > 0 ? tasks.map(task => (
            <div key={task.id} onClick={() => navigate(`/org/compliance-tasks/${task.id}`)}
              className="flex items-center gap-3 p-3 bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] hover:bg-slate-50 cursor-pointer transition-colors">
              <PriorityChip priority={PRIORITY_LABELS[task.priority] ?? task.priority} />
              <div className="flex-1">
                <p className="text-[14.5px] font-medium text-slate-800">{task.title}</p>
                <p className="text-[13px] text-slate-400">{task.asset.name} · {task.assignedTo?.name ?? 'Unassigned'}</p>
              </div>
              <StatusChip status={STATUS_LABELS[task.status] ?? task.status} />
            </div>
          )) : (
            <div className="text-center py-12 text-slate-400 text-[15px]">No compliance tasks created for this control yet</div>
          )}
        </div>
      )}

      {activeTab === 'Evidence' && (
        <div className="space-y-2">
          {tasks.filter(t => t.evidenceCount > 0).length > 0 ? tasks.filter(t => t.evidenceCount > 0).map(task => (
            <div key={task.id} onClick={() => navigate(`/org/compliance-tasks/${task.id}`)}
              className="flex items-center justify-between gap-3 p-3 bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] hover:bg-slate-50 cursor-pointer transition-colors">
              <div>
                <p className="text-[14.5px] font-medium text-slate-800">{task.asset.name}</p>
                <p className="text-[13px] text-slate-400">{task.title}</p>
              </div>
              <span className="text-[13px] px-2 py-0.5 bg-[#1A3E5C]/8 text-[#1A3E5C] rounded font-medium">{task.evidenceCount} evidence item{task.evidenceCount > 1 ? 's' : ''}</span>
            </div>
          )) : (
            <div className="text-center py-12 text-slate-400 text-[15px]">No evidence submitted for this control yet</div>
          )}
        </div>
      )}
    </div>
  );
}
