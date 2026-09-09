import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Database, Monitor, ArrowLeftRight, Handshake, Globe, Server, Package, Cpu, Smartphone, HardDrive, ArrowLeft, Edit2, FileText, AlertTriangle, Wifi, WifiOff, Shield } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatusChip, MonoBadge, TabNav, Btn, Card, PriorityChip, EmptyState } from '../../components/shared/DesignSystem';
import { useListDepartments } from '../../../hooks/useOrg';
import { useListControls } from '../../../hooks/useControls';
import { useListTasks } from '../../../hooks/useTasks';
import { useAssessmentsList } from '../../../hooks/useAssessments';
import { useAuditLog } from '../../../hooks/useAuditLog';
import { ASSET_TYPE_LABELS, CRITICALITY_LABELS, ASSET_COMPLIANCE_LABELS, ASSET_STATUS_LABELS } from '../../../lib/asset-enums';

const TYPE_ICONS: Record<string, React.ReactNode> = {
  'Database / Data Store': <Database className="w-5 h-5" />,
  'SaaS (Third-Party Hosted)': <Globe className="w-5 h-5" />,
  'In-House (On-Premise)': <Server className="w-5 h-5" />,
  'In-House (Cloud Hosted)': <Monitor className="w-5 h-5" />,
  'Outsourced / Managed Service': <Handshake className="w-5 h-5" />,
  'Third-Party (Cloud Hosted)': <Package className="w-5 h-5" />,
  'API / Integration Layer': <ArrowLeftRight className="w-5 h-5" />,
  'Mobile Application': <Smartphone className="w-5 h-5" />,
  'Legacy System': <HardDrive className="w-5 h-5" />,
  'Physical / Hardware': <Cpu className="w-5 h-5" />,
};

const CRIT_COLOR: Record<string, string> = {
  Critical: 'bg-red-50 text-red-700', High: 'bg-orange-50 text-orange-700',
  Medium: 'bg-amber-50 text-amber-700', Low: 'bg-green-50 text-green-700',
};

const TASK_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending', IN_PROGRESS: 'In Progress', EVIDENCE_SUBMITTED: 'Evidence Submitted',
  UNDER_REVIEW: 'Under Review', APPROVED_INTERNAL: 'Approved (Internal)', FINAL_REVIEW: 'Final Review',
  COMPLIANT: 'Compliant', REJECTED: 'Rejected',
};

const TABS = ['Overview', 'PII Records', 'Controls', 'Assessments', 'Actions', 'Evidence', 'Audit Trail'];

export function AssetDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role } = useApp();
  const [activeTab, setActiveTab] = useState('Overview');
  const canManage = role === 'ceo' || role === 'co';

  const { data: departments = [], isLoading: loadingDepts } = useListDepartments();
  const { data: controls = [] } = useListControls();
  const { data: tasks = [] } = useListTasks({ assetId: id });
  const { data: assessments = [] } = useAssessmentsList();
  const { data: auditData } = useAuditLog({ targetId: id, limit: 20 });

  const asset = useMemo(() => {
    for (const d of departments) {
      const a = d.assets.find(x => x.id === id);
      if (a) return { ...a, departmentName: d.name };
    }
    return null;
  }, [departments, id]);

  const relevantAssessments = useMemo(
    () => assessments.filter((a: any) => a.assets?.some((x: any) => x.asset.id === id)),
    [assessments, id]
  );

  const assetControlIds = useMemo(() => new Set(tasks.map(t => t.control?.id).filter(Boolean)), [tasks]);
  const assetControls = useMemo(() => controls.filter(c => assetControlIds.has(c.id)), [controls, assetControlIds]);

  const compliantCount = tasks.filter(t => t.status === 'COMPLIANT').length;
  const totalTaskCount = tasks.length;
  const compliancePct = totalTaskCount > 0 ? Math.round((compliantCount / totalTaskCount) * 100) : 0;
  const openTaskCount = tasks.filter(t => t.status !== 'COMPLIANT').length;
  const inProgressCount = tasks.filter(t => !['PENDING', 'COMPLIANT', 'REJECTED'].includes(t.status)).length;
  const notStartedCount = tasks.filter(t => t.status === 'PENDING').length;
  const rejectedCount = tasks.filter(t => t.status === 'REJECTED').length;

  if (loadingDepts) {
    return <div className="text-center py-16 text-slate-500">Loading asset...</div>;
  }
  if (!asset) {
    return (
      <div>
        <button onClick={() => navigate('/org/assets')} className="flex items-center gap-1.5 text-[15px] text-slate-500 hover:text-slate-800 mb-3">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Asset Register
        </button>
        <EmptyState icon={<Database className="w-10 h-10" />} title="Asset not found" description="This asset may have been removed." />
      </div>
    );
  }

  const typeLabel = ASSET_TYPE_LABELS[asset.assetType] ?? asset.assetType;
  const critLabel = CRITICALITY_LABELS[asset.criticality] ?? asset.criticality;
  const statusLabel = ASSET_STATUS_LABELS[asset.status] ?? asset.status;
  const complianceLabel = ASSET_COMPLIANCE_LABELS[asset.compliance] ?? asset.compliance;

  return (
    <div>
      {/* Header */}
      <div className="mb-4">
        <button onClick={() => navigate('/org/assets')} className="flex items-center gap-1.5 text-[15px] text-slate-500 hover:text-slate-800 mb-3">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Asset Register
        </button>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-lg bg-slate-100 border border-[#D4AF37]/35 flex items-center justify-center text-slate-500">
              {TYPE_ICONS[typeLabel] || <Database className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <MonoBadge>{asset.assetCode}</MonoBadge>
                <span className="text-[13px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded font-medium">{typeLabel}</span>
                <StatusChip status={statusLabel} />
                <span className={`text-[12.5px] px-2 py-0.5 rounded font-semibold ${CRIT_COLOR[critLabel]}`}>{critLabel}</span>
              </div>
              <h1 className="text-[24px] font-bold text-slate-900" style={{ fontFamily: 'Cinzel, serif' }}>{asset.name}</h1>
              <p className="text-[14px] text-slate-500 mt-0.5">{asset.departmentName} · Owner: {asset.ownerName ?? 'Unassigned'}</p>
            </div>
          </div>
          {canManage && (
            <Btn variant="secondary" onClick={() => navigate(`/org/assets/${asset.id}/edit`)} icon={<Edit2 className="w-3.5 h-3.5" />}>
              Edit Asset
            </Btn>
          )}
        </div>
      </div>

      <div className="flex gap-4">
        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <TabNav tabs={TABS} active={activeTab} onChange={setActiveTab} />

          {/* ── Overview ── */}
          {activeTab === 'Overview' && (
            <div className="space-y-3">
              <Card>
                <h3 className="text-[15px] font-semibold text-slate-800 mb-2">Description</h3>
                <p className="text-[15px] text-slate-600 leading-relaxed">{asset.description || 'No description provided.'}</p>
              </Card>
              <Card>
                <h3 className="text-[15px] font-semibold text-slate-800 mb-3">Asset Details</h3>
                <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                  {[
                    ['Asset Type', typeLabel],
                    ['Department', asset.departmentName],
                    ['Owner', asset.ownerName ?? 'Unassigned'],
                    ['Status', statusLabel],
                    ['Criticality', critLabel],
                    ['Compliance', complianceLabel],
                    ['Registered', new Date(asset.createdAt).toLocaleDateString()],
                    ['Last Updated', new Date(asset.updatedAt).toLocaleDateString()],
                    ['Hosting / Data Residency', asset.hostingLocation],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <p className="text-[13px] text-slate-400 mb-0.5">{k}</p>
                      <p className="text-[15px] font-medium text-slate-800">{v}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[13px] text-slate-400 mb-0.5">Internet Facing</p>
                    <p className={`text-[15px] font-medium flex items-center gap-1.5 ${asset.internetFacing ? 'text-orange-600' : 'text-green-600'}`}>
                      {asset.internetFacing ? <><Wifi className="w-3.5 h-3.5" />Public / Internet Facing</> : <><WifiOff className="w-3.5 h-3.5" />Internal Only</>}
                    </p>
                  </div>
                  {asset.vendorName && (
                    <div>
                      <p className="text-[13px] text-slate-400 mb-0.5">Vendor / Provider</p>
                      <p className="text-[15px] font-medium text-slate-800">{asset.vendorName}</p>
                    </div>
                  )}
                </div>
              </Card>
              <Card>
                <h3 className="text-[15px] font-semibold text-slate-800 mb-2">PII Summary</h3>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-[34px] font-bold text-slate-900" style={{ fontFamily: 'Cinzel, serif' }}>{asset.piiRecords.length}</p>
                    <p className="text-[13px] text-slate-400">PII record{asset.piiRecords.length !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="flex-1 space-y-1">
                    {asset.piiRecords.length === 0 ? (
                      <p className="text-[14px] text-slate-400">No PII records for this asset.</p>
                    ) : asset.piiRecords.map(r => {
                      const sensLabel = CRITICALITY_LABELS[r.sensitivity] ?? r.sensitivity;
                      return (
                        <div key={r.id} className="flex items-center gap-2 text-[13.5px]">
                          <span className={`px-1.5 py-0.5 rounded text-[12px] font-semibold ${CRIT_COLOR[sensLabel]}`}>{sensLabel}</span>
                          <span className="text-slate-600">{r.categories.slice(0, 3).join(', ')}{r.categories.length > 3 ? ' +more' : ''}</span>
                          <span className="text-slate-400">· {Number(r.volume).toLocaleString()} principals</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* ── PII Records ── */}
          {activeTab === 'PII Records' && (
            <div className="space-y-3">
              {asset.piiRecords.length === 0 ? (
                <EmptyState icon={<Shield className="w-10 h-10" />} title="No PII records" description="No PII records for this asset yet." />
              ) : asset.piiRecords.map((rec, i) => {
                const sensLabel = CRITICALITY_LABELS[rec.sensitivity] ?? rec.sensitivity;
                return (
                  <Card key={rec.id}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-mono text-slate-400">PII-{String(i + 1).padStart(2, '0')}</span>
                        <span className={`text-[12.5px] px-2 py-0.5 rounded font-semibold ${CRIT_COLOR[sensLabel]}`}>{sensLabel} Sensitivity</span>
                        {rec.crossBorderTransfer && <span className="text-[12.5px] px-2 py-0.5 bg-amber-50 text-amber-700 rounded font-semibold">⚠ Cross-border</span>}
                        {rec.sharedWithThirdParties && <span className="text-[12.5px] px-2 py-0.5 bg-orange-50 text-orange-700 rounded font-semibold">Shared</span>}
                      </div>
                      <span className="text-[13px] text-slate-400">{Number(rec.volume).toLocaleString()} {rec.principalType} principals</span>
                    </div>
                    <div className="mb-3">
                      <p className="text-[12px] font-bold text-slate-400 uppercase tracking-wide mb-1">PII Categories</p>
                      <div className="flex flex-wrap gap-1">
                        {rec.categories.map(c => <span key={c} className="px-2 py-0.5 bg-red-50 text-red-700 rounded text-[13px] font-medium">{c}</span>)}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-[14px] border-t border-slate-100 pt-3">
                      {[
                        ['Legal Basis', rec.legalBasis],
                        ['Purpose', rec.purpose],
                        ['Retention Period', rec.retention],
                        ['Deletion Mechanism', rec.deletionMechanism || 'Not specified'],
                        ['Data Principal', rec.principalType],
                        ['Cross-border Transfer', rec.crossBorderTransfer ? `Yes → ${rec.crossBorderDestination}` : 'No — stays in India'],
                      ].map(([k, v]) => (
                        <div key={k}>
                          <p className="text-[12px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">{k}</p>
                          <p className={`font-medium text-slate-700 ${k === 'Cross-border Transfer' ? (rec.crossBorderTransfer ? 'text-amber-600' : 'text-green-600') : ''}`}>{v}</p>
                        </div>
                      ))}
                    </div>
                    {rec.sharedWithThirdParties && (
                      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2 text-[13.5px] text-orange-600">
                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                        This personal data is shared with third parties. Ensure a valid DPA is in place.
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}

          {/* ── Controls ── */}
          {activeTab === 'Controls' && (
            assetControls.length === 0 ? (
              <EmptyState icon={<Shield className="w-10 h-10" />} title="No controls mapped yet" description="Controls are mapped to this asset once it's included in an assessment." />
            ) : (
              <div className="bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] overflow-hidden">
                <table className="w-full">
                  <thead><tr className="bg-slate-50 border-b border-[#D4AF37]/35">
                    {['Control', 'Regulation', 'Status', ''].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-[13px] font-semibold text-slate-500 uppercase tracking-widest">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {assetControls.map(ctrl => {
                      const task = tasks.find(t => t.control?.id === ctrl.id);
                      const reg = ctrl.regulationMappings[0];
                      return (
                        <tr key={ctrl.id} className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer" onClick={() => navigate(`/org/controls/${ctrl.id}`)}>
                          <td className="px-4 py-3">
                            <p className="text-[15px] text-slate-800 font-medium">{ctrl.title}</p>
                          </td>
                          <td className="px-4 py-3 text-[14px] text-slate-500">{reg ? `${reg.regulation.shortCode}${reg.chapter ? ` · ${reg.chapter.title ?? reg.chapter.name}` : ''}` : 'Internal'}</td>
                          <td className="px-4 py-3">{task ? <StatusChip status={TASK_STATUS_LABELS[task.status] ?? task.status} /> : <span className="text-[13px] text-slate-400">No task yet</span>}</td>
                          <td className="px-4 py-3">{task && canManage && <Btn size="sm" variant="secondary" onClick={e => { e.stopPropagation(); navigate(`/org/compliance-tasks/${task.id}`); }}>View Task</Btn>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* ── Assessments ── */}
          {activeTab === 'Assessments' && (
            <div className="space-y-3">
              {relevantAssessments.length === 0 ? (
                <EmptyState icon={<Shield className="w-10 h-10" />} title="Not included in any assessment" description="This asset hasn't been added to a compliance assessment yet." />
              ) : relevantAssessments.map((a: any) => {
                const pct = a.totalControls > 0 ? Math.round((a.compliantControls / a.totalControls) * 100) : 0;
                return (
                  <Card key={a.id} onClick={() => navigate(`/org/assessments/${a.id}`)}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[15px] font-semibold text-slate-900">{a.name}</p>
                        <p className="text-[14px] text-slate-500 mt-0.5">{new Date(a.startDate).toLocaleDateString()} – {new Date(a.endDate).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusChip status={a.status === 'ACTIVE' ? 'In Progress' : a.status} />
                        <span className="text-[16px] font-bold text-[#1A3E5C]">{pct}%</span>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* ── Actions ── */}
          {activeTab === 'Actions' && (
            <div className="space-y-2">
              {tasks.length > 0 ? tasks.map(task => (
                <div key={task.id} onClick={() => navigate(`/org/compliance-tasks/${task.id}`)}
                  className="flex items-center gap-3 p-3 bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] hover:bg-slate-50 cursor-pointer">
                  <PriorityChip priority={task.priority.charAt(0) + task.priority.slice(1).toLowerCase()} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[14.5px] font-medium text-slate-800 truncate">{task.title}</p>
                    <p className="text-[13px] text-slate-400">{task.control?.title ?? task.taskCode} · {task.assignedTo?.name ?? 'Unassigned'}</p>
                  </div>
                  <StatusChip status={TASK_STATUS_LABELS[task.status] ?? task.status} />
                </div>
              )) : <div className="text-center py-10 text-slate-400 text-[15px]">No compliance tasks for this asset</div>}
            </div>
          )}

          {/* ── Evidence ── */}
          {activeTab === 'Evidence' && (
            <div className="space-y-2">
              {tasks.filter(t => t.evidenceCount > 0).length > 0 ? tasks.filter(t => t.evidenceCount > 0).map(task => (
                <div key={task.id} onClick={() => navigate(`/org/compliance-tasks/${task.id}`)}
                  className="flex items-center gap-3 p-3 bg-white border border-[#D4AF37]/35 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                  <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-[14.5px] font-medium text-slate-800">{task.title}</p>
                    <p className="text-[13px] text-slate-400">{task.taskCode}</p>
                  </div>
                  <span className="text-[13px] px-2 py-0.5 bg-[#1A3E5C]/8 text-[#1A3E5C] rounded font-medium">{task.evidenceCount} item{task.evidenceCount > 1 ? 's' : ''}</span>
                  <StatusChip status={TASK_STATUS_LABELS[task.status] ?? task.status} />
                </div>
              )) : <div className="text-center py-10 text-slate-400 text-[15px]">No evidence submitted for this asset yet</div>}
            </div>
          )}

          {/* ── Audit Trail ── */}
          {activeTab === 'Audit Trail' && (
            <div className="bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] overflow-hidden">
              {!auditData || auditData.rows.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-[15px]">No audit history for this asset yet</div>
              ) : auditData.rows.map((entry, i, arr) => (
                <div key={entry.id} className={`flex gap-3 px-4 py-3 ${i < arr.length - 1 ? 'border-b border-slate-100' : ''}`}>
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-[13px] font-mono text-slate-400">{new Date(entry.timestamp).toLocaleString()}</p>
                    <p className="text-[14.5px] text-slate-700 mt-0.5">
                      <strong className="font-semibold">{entry.user}</strong> <span className="text-slate-500">{entry.action.toLowerCase()}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="w-64 flex-shrink-0 space-y-3">
          <Card>
            <h3 className="text-[14px] font-semibold text-slate-700 mb-3">Compliance Score</h3>
            <div className="flex items-center justify-center my-2">
              <div className="relative w-24 h-24">
                <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
                  <circle cx="48" cy="48" r="40" fill="none" stroke="#E2E8F0" strokeWidth="8" />
                  <circle cx="48" cy="48" r="40" fill="none"
                    stroke={compliancePct >= 80 ? '#22C55E' : compliancePct >= 50 ? '#F59E0B' : '#EF4444'}
                    strokeWidth="8"
                    strokeDasharray={`${(compliancePct / 100) * 251.2} 251.2`}
                    strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[22px] font-bold text-slate-900" style={{ fontFamily: 'Cinzel, serif' }}>{compliancePct}%</span>
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              {[
                ['text-green-600', 'Compliant', compliantCount],
                ['text-[#1A3E5C]', 'In Progress', inProgressCount],
                ['text-slate-400', 'Not Started', notStartedCount],
                ['text-red-500', 'Rejected', rejectedCount],
              ].map(([color, label, val]) => (
                <div key={label as string} className="flex justify-between text-[14px]">
                  <span className={color as string}>● {label as string}</span>
                  <span className="font-medium text-slate-800">{val as number}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <h3 className="text-[14px] font-semibold text-slate-700 mb-2">Quick Stats</h3>
            <div className="space-y-1.5">
              {[
                ['Criticality', critLabel],
                ['Hosting', asset.hostingLocation],
                ['Internet Facing', asset.internetFacing ? '⚠ Yes (Public)' : '✓ Internal Only'],
                ['Open Actions', String(openTaskCount)],
                ['PII Records', String(asset.piiRecords.length)],
                ['Vendor', asset.vendorName || 'None'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between text-[14px] gap-2">
                  <span className="text-slate-500 flex-shrink-0">{k}</span>
                  <span className={`font-medium text-right ${k === 'Internet Facing' ? (asset.internetFacing ? 'text-orange-600' : 'text-green-600') : 'text-slate-800'}`}>{v}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
