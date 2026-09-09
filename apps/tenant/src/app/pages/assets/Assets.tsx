import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Database, Monitor, ArrowLeftRight, Handshake, Globe, Server, Package, Cpu, Smartphone, HardDrive, Plus, ChevronRight, ChevronDown, Building2, Wifi, WifiOff, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useListDepartments, useCreateDepartment, useCreateSupplier } from '../../../hooks/useOrg';
import { ASSET_TYPE_LABELS, CRITICALITY_LABELS, ASSET_COMPLIANCE_LABELS, ASSET_STATUS_OPTIONS, CRITICALITY_OPTIONS } from '../../../lib/asset-enums';
import { PageHeader, Btn, EmptyState, InputField, TextareaField, SelectField } from '../../components/shared/DesignSystem';

const ASSET_TABS = ['All Assets', 'By Department', 'Suppliers', 'PII Records'] as const;
type AssetTab = typeof ASSET_TABS[number];

const CRIT_STYLE: Record<string, string> = {
  Critical: 'bg-red-50 text-red-700', High: 'bg-orange-50 text-orange-700',
  Medium: 'bg-amber-50 text-amber-700', Low: 'bg-green-50 text-green-700',
};
const COMP_STYLE: Record<string, string> = {
  'Fully Compliant': 'bg-green-50 text-green-700',
  'Partially Compliant': 'bg-amber-50 text-amber-700',
  'Non-Compliant': 'bg-red-50 text-red-700',
  'Not Started': 'bg-slate-100 text-slate-500',
};

const TYPE_ICON: Record<string, React.ReactNode> = {
  'Database / Data Store': <Database className="w-4 h-4 text-[#1A3E5C]" />,
  'SaaS (Third-Party Hosted)': <Globe className="w-4 h-4 text-purple-500" />,
  'In-House (On-Premise)': <Server className="w-4 h-4 text-slate-500" />,
  'In-House (Cloud Hosted)': <Monitor className="w-4 h-4 text-[#D4AF37]" />,
  'Outsourced / Managed Service': <Handshake className="w-4 h-4 text-green-500" />,
  'Third-Party (Cloud Hosted)': <Package className="w-4 h-4 text-orange-500" />,
  'API / Integration Layer': <ArrowLeftRight className="w-4 h-4 text-teal-500" />,
  'Mobile Application': <Smartphone className="w-4 h-4 text-pink-500" />,
  'Legacy System': <HardDrive className="w-4 h-4 text-yellow-600" />,
  'Physical / Hardware': <Cpu className="w-4 h-4 text-red-400" />,
};

function AddDepartmentModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const create = useCreateDepartment();

  const handleSave = async () => {
    if (!name.trim()) return;
    await create.mutateAsync({ name: name.trim(), description: description.trim() || undefined });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="w-[420px] bg-white rounded-xl shadow-xl p-5 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <p className="text-[16px] font-bold text-slate-900">Add Department</p>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400 hover:text-slate-700" /></button>
        </div>
        <InputField label="Department Name *" value={name} onChange={setName} placeholder="e.g., Finance" />
        <TextareaField label="Description" value={description} onChange={setDescription} rows={2} placeholder="Optional" />
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 py-2 border border-slate-300 text-slate-600 text-[14.5px] font-medium rounded-lg hover:bg-slate-50">Cancel</button>
          <button onClick={handleSave} disabled={!name.trim() || create.isPending}
            className="flex-1 py-2 bg-[#1A3E5C] hover:bg-[#15324a] disabled:opacity-50 text-white text-[14.5px] font-semibold rounded-lg">
            {create.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddSupplierModal({ deptId, deptName, onClose }: { deptId: string; deptName: string; onClose: () => void }) {
  const [form, setForm] = useState({ name: '', supplierType: 'Cloud Provider', contactName: '', contactEmail: '', countryOfOperation: 'India', dpaSigned: false, criticality: 'MEDIUM', status: 'ACTIVE' });
  const up = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));
  const create = useCreateSupplier();

  const handleSave = async () => {
    if (!form.name.trim() || !form.contactEmail.trim()) return;
    await create.mutateAsync({ deptId, ...form });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="w-[480px] bg-white rounded-xl shadow-xl p-5 space-y-3" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <p className="text-[16px] font-bold text-slate-900">Add Supplier to {deptName}</p>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400 hover:text-slate-700" /></button>
        </div>
        <InputField label="Supplier Name *" value={form.name} onChange={v => up('name', v)} placeholder="e.g., Amazon Web Services" />
        <div className="grid grid-cols-2 gap-3">
          <InputField label="Supplier Type" value={form.supplierType} onChange={v => up('supplierType', v)} placeholder="Cloud Provider" />
          <InputField label="Country of Operation" value={form.countryOfOperation} onChange={v => up('countryOfOperation', v)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <InputField label="Contact Name" value={form.contactName} onChange={v => up('contactName', v)} />
          <InputField label="Contact Email *" value={form.contactEmail} onChange={v => up('contactEmail', v)} type="email" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <SelectField label="Criticality" value={form.criticality} onChange={v => up('criticality', v)} options={CRITICALITY_OPTIONS} />
          <SelectField label="Status" value={form.status} onChange={v => up('status', v)} options={ASSET_STATUS_OPTIONS} />
        </div>
        <label className="flex items-center gap-2 text-[14px] text-slate-700 pt-1">
          <input type="checkbox" checked={form.dpaSigned} onChange={e => up('dpaSigned', e.target.checked)} className="accent-[#1A3E5C]" />
          Data Processing Agreement (DPA) signed
        </label>
        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="flex-1 py-2 border border-slate-300 text-slate-600 text-[14.5px] font-medium rounded-lg hover:bg-slate-50">Cancel</button>
          <button onClick={handleSave} disabled={!form.name.trim() || !form.contactEmail.trim() || create.isPending}
            className="flex-1 py-2 bg-[#1A3E5C] hover:bg-[#15324a] disabled:opacity-50 text-white text-[14.5px] font-semibold rounded-lg">
            {create.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AssetsPage() {
  const navigate = useNavigate();
  const { role } = useApp();
  const [activeTab, setActiveTab] = useState<AssetTab>('All Assets');
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());
  const [showAddDept, setShowAddDept] = useState(false);
  const [addSupplierDept, setAddSupplierDept] = useState<{ id: string; name: string } | null>(null);
  const canManage = role === 'ceo' || role === 'co';
  const toggle = (id: string) => setExpandedDepts(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const { data: departments = [], isLoading } = useListDepartments();

  const allAssets = useMemo(() => departments.flatMap(d => d.assets.map(a => ({ ...a, departmentName: d.name, departmentId: d.id }))), [departments]);
  const allSuppliers = useMemo(() => departments.flatMap(d => d.suppliers.map(s => ({ ...s, departmentName: d.name, departmentId: d.id }))), [departments]);
  const allPii = useMemo(() => allAssets.flatMap(a => a.piiRecords.map(p => ({ ...p, assetName: a.name, assetId: a.id, department: a.departmentName }))), [allAssets]);
  const totalPII = allPii.length;

  return (
    <div className="space-y-4">
      {showAddDept && <AddDepartmentModal onClose={() => setShowAddDept(false)} />}
      {addSupplierDept && <AddSupplierModal deptId={addSupplierDept.id} deptName={addSupplierDept.name} onClose={() => setAddSupplierDept(null)} />}

      <PageHeader
        title="Asset Register"
        sub={`${allAssets.length} assets · ${departments.length} departments · ${allSuppliers.length} suppliers · ${totalPII} PII records`}
        actions={canManage ? <Btn onClick={() => navigate('/org/assets/new')} icon={<Plus className="w-4 h-4" />}>Register Asset</Btn> : undefined}
      />

      {/* Tabs */}
      <div className="flex border-b border-[#D4AF37]/35 gap-0 overflow-x-auto">
        {ASSET_TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 text-[14.5px] font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${activeTab === tab ? 'border-[#1A3E5C] text-[#1A3E5C]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            {tab}
            <span className="ml-1.5 text-[12px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-semibold">
              {tab === 'All Assets' ? allAssets.length : tab === 'By Department' ? departments.length : tab === 'Suppliers' ? allSuppliers.length : totalPII}
            </span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-slate-500">Loading assets...</div>
      ) : (
        <>
          {/* ── All Assets ────────────────────────────────────────────────────── */}
          {activeTab === 'All Assets' && (
            allAssets.length === 0 ? (
              <EmptyState icon={<Database className="w-10 h-10" />} title="No assets registered yet"
                description="Register your first asset to start tracking compliance."
                action={canManage ? <Btn onClick={() => navigate('/org/assets/new')} icon={<Plus className="w-4 h-4" />}>Register Asset</Btn> : undefined} />
            ) : (
              <div className="bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-[14px]" style={{ minWidth: 900 }}>
                    <thead><tr className="border-b border-slate-100 bg-slate-50 text-left text-slate-500">
                      {['Asset', 'Type', 'Department', 'Criticality', 'Hosting', 'Internet Facing', 'PII Records', 'Compliance', 'Owner', ''].map(h => (
                        <th key={h} className="px-3 py-2.5 text-[13px] font-semibold uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {allAssets.map(a => {
                        const typeLabel = ASSET_TYPE_LABELS[a.assetType] ?? a.assetType;
                        const critLabel = CRITICALITY_LABELS[a.criticality] ?? a.criticality;
                        const compLabel = ASSET_COMPLIANCE_LABELS[a.compliance] ?? a.compliance;
                        return (
                          <tr key={a.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 cursor-pointer" onClick={() => navigate(`/org/assets/${a.id}`)}>
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-2">
                                <span className="flex-shrink-0">{TYPE_ICON[typeLabel] || <Database className="w-4 h-4 text-slate-400" />}</span>
                                <div>
                                  <p className="font-semibold text-slate-800">{a.name}</p>
                                  <p className="text-[12px] text-slate-400 font-mono">{a.assetCode}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-3 text-slate-500 max-w-[140px]"><span className="truncate block">{typeLabel}</span></td>
                            <td className="px-3 py-3 text-slate-500">{a.departmentName}</td>
                            <td className="px-3 py-3"><span className={`text-[12.5px] px-2 py-0.5 rounded font-semibold ${CRIT_STYLE[critLabel]}`}>{critLabel}</span></td>
                            <td className="px-3 py-3 text-slate-400 text-[13px]">{a.hostingLocation}</td>
                            <td className="px-3 py-3">
                              {a.internetFacing
                                ? <span className="flex items-center gap-1 text-orange-600 text-[13px] font-medium"><Wifi className="w-3 h-3" />Public</span>
                                : <span className="flex items-center gap-1 text-green-600 text-[13px] font-medium"><WifiOff className="w-3 h-3" />Internal</span>}
                            </td>
                            <td className="px-3 py-3">
                              <span className={`text-[12.5px] px-2 py-0.5 rounded font-semibold ${a.piiRecords.length > 0 ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-400'}`}>
                                {a.piiRecords.length} record{a.piiRecords.length !== 1 ? 's' : ''}
                              </span>
                            </td>
                            <td className="px-3 py-3"><span className={`text-[12.5px] px-2 py-0.5 rounded font-semibold ${COMP_STYLE[compLabel] || 'bg-slate-100 text-slate-500'}`}>{compLabel}</span></td>
                            <td className="px-3 py-3 text-slate-500">{a.ownerName ?? <span className="text-slate-300">Unassigned</span>}</td>
                            <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                              {canManage && (
                                <button onClick={() => navigate(`/org/assets/${a.id}/edit`)} className="px-2 py-1 text-[12.5px] border border-[#D4AF37]/35 rounded text-slate-600 hover:bg-slate-50">Edit</button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}

          {/* ── By Department ─────────────────────────────────────────────────── */}
          {activeTab === 'By Department' && (
            <div className="space-y-3">
              {canManage && (
                <div className="flex justify-end">
                  <button onClick={() => setShowAddDept(true)} className="flex items-center gap-2 px-3 py-1.5 border border-[#D4AF37]/40 text-[#1A3E5C] text-[14px] font-medium rounded-lg hover:bg-[#1A3E5C]/8">
                    <Plus className="w-3.5 h-3.5" /> Add Department
                  </button>
                </div>
              )}
              {departments.length === 0 ? (
                <EmptyState icon={<Building2 className="w-10 h-10" />} title="No departments yet" description="Add a department to start organizing your assets." />
              ) : departments.map(dept => {
                const piiCount = dept.assets.reduce((s, a) => s + a.piiRecords.length, 0);
                const isOpen = expandedDepts.has(dept.id);
                return (
                  <div key={dept.id} className="bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] overflow-hidden">
                    <button onClick={() => toggle(dept.id)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left">
                      {isOpen ? <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                      <Building2 className="w-4 h-4 text-[#1A3E5C] flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-[15px] font-bold text-slate-900">{dept.name}</p>
                        {dept.description && <p className="text-[12.5px] text-slate-400">{dept.description}</p>}
                      </div>
                      <div className="flex items-center gap-3 text-[13px] text-slate-400">
                        <span>{dept.assets.length} assets</span>
                        <span>{dept.suppliers.length} suppliers</span>
                        <span className="text-red-500">{piiCount} PII records</span>
                      </div>
                    </button>
                    {isOpen && (
                      <div className="border-t border-slate-100">
                        {dept.assets.map(asset => {
                          const typeLabel = ASSET_TYPE_LABELS[asset.assetType] ?? asset.assetType;
                          const critLabel = CRITICALITY_LABELS[asset.criticality] ?? asset.criticality;
                          return (
                            <div key={asset.id} className="flex items-center gap-3 px-5 py-2.5 border-b border-slate-50 last:border-0 hover:bg-slate-50 cursor-pointer" onClick={() => navigate(`/org/assets/${asset.id}`)}>
                              <span className="flex-shrink-0">{TYPE_ICON[typeLabel] || <Database className="w-3.5 h-3.5 text-slate-400" />}</span>
                              <div className="flex-1">
                                <p className="text-[14.5px] font-semibold text-slate-800">{asset.name}</p>
                                <p className="text-[12.5px] text-slate-400">{typeLabel} · {asset.hostingLocation}</p>
                              </div>
                              {asset.vendorName && <span className="text-[12px] text-slate-400">{asset.vendorName}</span>}
                              <span className={`text-[12px] px-1.5 py-0.5 rounded font-semibold ${CRIT_STYLE[critLabel]}`}>{critLabel}</span>
                              <span className={`text-[12px] px-1.5 py-0.5 rounded font-semibold ${asset.piiRecords.length > 0 ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-400'}`}>{asset.piiRecords.length} PII</span>
                              <ChevronRight className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                            </div>
                          );
                        })}
                        {canManage && (
                          <div className="px-5 py-2 bg-slate-50">
                            <button onClick={() => navigate('/org/assets/new', { state: { deptId: dept.id } })}
                              className="flex items-center gap-1 px-2.5 py-1 text-[13px] border border-dashed border-slate-300 rounded text-slate-400 hover:border-[#1A3E5C]/40 hover:text-[#D4AF37]">
                              <Plus className="w-2.5 h-2.5" /> Add Asset to {dept.name}
                            </button>
                          </div>
                        )}
                        {canManage && (
                          <div className="px-5 py-2 bg-slate-50 border-t border-slate-100">
                            <button onClick={() => setAddSupplierDept({ id: dept.id, name: dept.name })}
                              className="flex items-center gap-1 px-2.5 py-1 text-[13px] border border-dashed border-slate-300 rounded text-slate-400 hover:border-[#1A3E5C]/40 hover:text-[#D4AF37]">
                              <Plus className="w-2.5 h-2.5" /> Add Supplier to {dept.name}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Suppliers ─────────────────────────────────────────────────────── */}
          {activeTab === 'Suppliers' && (
            <div className="space-y-3">
              {allSuppliers.length === 0 ? (
                <EmptyState icon={<Handshake className="w-10 h-10" />} title="No suppliers yet" description="Add a supplier from within a department to track third-party risk." />
              ) : allSuppliers.map(sup => {
                const critLabel = CRITICALITY_LABELS[sup.criticality] ?? sup.criticality;
                return (
                  <div key={sup.id} className="bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] p-4">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                          <Handshake className="w-4 h-4 text-slate-500" />
                        </div>
                        <div>
                          <p className="text-[15px] font-bold text-slate-900">{sup.name}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[13px] text-slate-500">
                            <span>{sup.supplierType}</span><span>·</span>
                            <span>Dept: {sup.departmentName}</span><span>·</span>
                            {sup.contactName && <><span>Contact: {sup.contactName}</span><span>·</span></>}
                            <span>{sup.contactEmail}</span><span>·</span>
                            <span>Country: {sup.countryOfOperation}</span><span>·</span>
                            <span className={`font-semibold ${CRIT_STYLE[critLabel]}`}>{critLabel} criticality</span>
                          </div>
                          {sup.dpaReference && <p className="text-[12.5px] text-slate-400 mt-0.5">Ref: {sup.dpaReference}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                        <span className={`text-[13px] px-2 py-0.5 rounded font-semibold ${sup.dpaSigned ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                          DPA: {sup.dpaSigned ? '✓ Signed' : '✗ Not Signed'}
                        </span>
                        <span className="text-[13px] px-2 py-0.5 bg-[#1A3E5C]/8 text-[#1A3E5C] rounded font-semibold">{sup.supplierAssets.length} asset{sup.supplierAssets.length !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── PII Records ───────────────────────────────────────────────────── */}
          {activeTab === 'PII Records' && (
            <div className="space-y-3">
              {allPii.length === 0 ? (
                <EmptyState icon={<Database className="w-10 h-10" />} title="No PII records yet" description="PII records are added while registering or editing an asset." />
              ) : allPii.map(rec => {
                const sensLabel = CRITICALITY_LABELS[rec.sensitivity] ?? rec.sensitivity;
                return (
                  <div key={rec.id} className="bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] p-4 cursor-pointer hover:border-[#D4AF37]/40 transition-colors" onClick={() => navigate(`/org/assets/${rec.assetId}`)}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-[15px] font-bold text-slate-900">{rec.assetName}</p>
                        <p className="text-[13px] text-slate-400">Dept: {rec.department} · {rec.principalType} data · Volume: {Number(rec.volume).toLocaleString()} principals</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[12.5px] px-2 py-0.5 rounded font-semibold ${CRIT_STYLE[sensLabel] || 'bg-slate-100 text-slate-500'}`}>{sensLabel}</span>
                        {rec.crossBorderTransfer && <span className="text-[12.5px] px-2 py-0.5 bg-amber-50 text-amber-700 rounded font-semibold">⚠ Cross-border</span>}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[13.5px]">
                      <div>
                        <p className="text-[12px] font-bold text-slate-400 uppercase tracking-wide mb-1">PII Categories</p>
                        <div className="flex flex-wrap gap-1">{rec.categories.map(c => <span key={c} className="px-1.5 py-0.5 bg-red-50 text-red-700 rounded text-[12px] font-medium">{c}</span>)}</div>
                      </div>
                      <div>
                        <p className="text-[12px] font-bold text-slate-400 uppercase tracking-wide mb-1">Legal Basis</p>
                        <p className="text-slate-700 font-medium">{rec.legalBasis}</p>
                        <p className="text-slate-500 text-[13px]">{rec.purpose.slice(0, 40)}{rec.purpose.length > 40 ? '…' : ''}</p>
                      </div>
                      <div>
                        <p className="text-[12px] font-bold text-slate-400 uppercase tracking-wide mb-1">Retention</p>
                        <p className="text-slate-700 font-medium">{rec.retention}</p>
                        <p className="text-slate-400 text-[13px]">{rec.deletionMechanism || 'Not specified'}</p>
                      </div>
                      <div>
                        <p className="text-[12px] font-bold text-slate-400 uppercase tracking-wide mb-1">Transfer & Sharing</p>
                        <p className={`font-medium text-[13px] ${rec.crossBorderTransfer ? 'text-amber-600' : 'text-green-600'}`}>{rec.crossBorderTransfer ? `⚠ Transfer to ${rec.crossBorderDestination}` : '✓ Stays in India'}</p>
                        <p className={`font-medium text-[13px] ${rec.sharedWithThirdParties ? 'text-orange-600' : 'text-slate-400'}`}>{rec.sharedWithThirdParties ? 'Shared w/ 3rd parties' : 'Not shared'}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
