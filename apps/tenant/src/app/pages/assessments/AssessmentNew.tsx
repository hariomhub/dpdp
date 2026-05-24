import React, { useState, useMemo } from 'react';
import {
  Check, ChevronRight, Loader2, AlertTriangle,
  Database, User, Users, Shuffle, Shield
} from 'lucide-react';
import { useNavigate } from 'react-router';
import {
  useAvailableRegulations, useAvailableAssets,
  useCreateAssessment, useDeptItAdmins,
} from '../../../hooks/useAssessments';
import { useListDepartments } from '../../../hooks/useOrg';

// ─── Step Indicator ───────────────────────────────────────────────────────────
function StepIndicator({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="flex items-center justify-between mb-6">
      {steps.map((s, i) => (
        <React.Fragment key={s}>
          <div className="flex flex-col items-center gap-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold border-2 transition-all ${
              current > i + 1 ? 'bg-green-500 border-green-500 text-white'
              : current === i + 1 ? 'bg-slate-900 border-slate-900 text-white'
              : 'bg-white border-slate-300 text-slate-400'
            }`}>
              {current > i + 1 ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            <span className={`text-[10.5px] font-medium whitespace-nowrap ${current === i + 1 ? 'text-slate-900' : 'text-slate-400'}`}>{s}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={`h-px flex-1 mx-2 mb-4 transition-all ${current > i + 1 ? 'bg-green-400' : 'bg-slate-200'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

const STEPS = ['Details', 'Assets', 'Regulation', 'Assign Tasks', 'Review'];

// ─── Main Page ────────────────────────────────────────────────────────────────
export function AssessmentNewPage() {
  const navigate = useNavigate();

  // ── Data ──────────────────────────────────────────────────────────────────────
  const { data: regulations = [], isLoading: loadingRegs } = useAvailableRegulations();
  const { data: allAssets   = [], isLoading: loadingAssets } = useAvailableAssets();
  const { data: depts       = [], isLoading: loadingDepts  } = useListDepartments();
  const createMutation = useCreateAssessment();

  // ── Wizard state ──────────────────────────────────────────────────────────────
  const [step, setStep]       = useState(1);
  const [created, setCreated] = useState(false);

  // Step 1 — Details
  const [form, setForm] = useState({ name: '', desc: '', startDate: '', endDate: '', deptId: '' });
  const up = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  // Step 2 — Assets
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const deptAssets        = form.deptId ? (allAssets as any[]).filter((a: any) => a.departmentId === form.deptId) : [];
  const ownDeptAssets     = deptAssets.filter((a: any) => a._source !== 'supplier');
  const supplierDeptAssets = deptAssets.filter((a: any) => a._source === 'supplier');

  // Step 3 — Regulation + Controls
  const [selectedRegId, setSelectedRegId]         = useState('');
  const [excludedControls, setExcludedControls]   = useState<Set<string>>(new Set());
  const [exclusionReasons, setExclusionReasons]   = useState<Record<string, string>>({});
  const [expandedChapters, setExpandedChapters]   = useState<Set<string>>(new Set());

  // Step 4 — Task Assignment
  const [taskAssignments, setTaskAssignments] = useState<Record<string, string | null>>({});
  const [bulkAssignee, setBulkAssignee]       = useState('');
  const { data: itAdmins = [] } = useDeptItAdmins(form.deptId);

  // ── Derived ────────────────────────────────────────────────────────────────────
  const selectedDeptName = (depts as any[]).find((d: any) => d.id === form.deptId)?.name ?? '';
  const selectedReg      = (regulations as any[]).find((r: any) => r.id === selectedRegId);
  const allControls      = selectedReg
    ? selectedReg.chapters?.flatMap((ch: any) => ch.controls ?? []) ?? []
    : [];
  const activeControls   = allControls.filter((c: any) => !excludedControls.has(c.id));
  const selectedAssetList = ownDeptAssets.filter((a: any) => selectedAssets.has(a.id));

  // Task list preview: activeControls × selectedAssets
  const taskList = useMemo(() => {
    return activeControls.flatMap((ctrl: any) =>
      selectedAssetList.map((asset: any) => ({
        key:          `${ctrl.id}:${asset.id}`,
        controlId:    ctrl.id,
        controlTitle: ctrl.title,
        assetId:      asset.id,
        assetName:    asset.name,
      }))
    );
  }, [activeControls, selectedAssetList]);

  // ── Helpers ────────────────────────────────────────────────────────────────────
  const toggleAsset = (id: string) => setSelectedAssets(p => {
    const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n;
  });

  const applyBulkAssign = () => {
    if (!bulkAssignee && bulkAssignee !== '') return;
    const updates: Record<string, string | null> = {};
    taskList.forEach((t: any) => { updates[t.key] = bulkAssignee || null; });
    setTaskAssignments(prev => ({ ...prev, ...updates }));
  };

  const getAssignee = (key: string) =>
    key in taskAssignments ? taskAssignments[key] : '__auto__';

  const setAssignee = (key: string, val: string) =>
    setTaskAssignments(prev => ({ ...prev, [key]: val === '__auto__' ? undefined as any : (val || null) }));

  // ── Submit ─────────────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!form.name || !form.startDate || !form.endDate || !form.deptId || !selectedRegId || selectedAssets.size === 0) return;

    // Build task assignments — only include manually set ones (skip __auto__ = use delegation)
    const assignments = taskList
      .filter((t: any) => t.key in taskAssignments)
      .map((t: any) => ({ controlId: t.controlId, assetId: t.assetId, assigneeId: taskAssignments[t.key] ?? null }));

    await createMutation.mutateAsync({
      name:         form.name,
      description:  form.desc || undefined,
      departmentId: form.deptId,
      startDate:    form.startDate,
      endDate:      form.endDate,
      regulationId: selectedRegId,
      assetIds:     Array.from(selectedAssets),
      exclusions:   Array.from(excludedControls)
        .map(id => ({ controlId: id, reason: exclusionReasons[id] || 'Excluded by CO' })),
      taskAssignments: assignments.length > 0 ? assignments : undefined,
    });
    setCreated(true);
  };

  // ── Success ────────────────────────────────────────────────────────────────────
  if (created) return (
    <div className="flex flex-col items-center justify-center py-20 space-y-4">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
        <Check className="w-8 h-8 text-green-600" />
      </div>
      <h2 className="text-[20px] font-bold text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>
        Assessment Created!
      </h2>
      <p className="text-[13px] text-slate-500 text-center max-w-md">
        {taskList.length} compliance tasks have been created and assigned.
        IT Admins have been notified.
      </p>
      <div className="flex gap-3">
        <button onClick={() => navigate('/org/tasks')}
          className="px-6 py-2.5 bg-slate-900 text-white text-[13px] font-semibold rounded-lg hover:bg-slate-800">
          View Tasks →
        </button>
        <button onClick={() => navigate('/org/assessments')}
          className="px-6 py-2.5 border border-slate-300 text-slate-600 text-[13px] font-medium rounded-lg hover:bg-slate-50">
          All Assessments
        </button>
      </div>
    </div>
  );

  const canProceed = {
    1: !!(form.name && form.startDate && form.endDate && form.deptId),
    2: selectedAssets.size > 0 && Array.from(selectedAssets).some(id => ownDeptAssets.some((a: any) => a.id === id)),
    3: !!selectedRegId,
    4: true, // assignment is optional — can proceed with auto-delegation
    5: true,
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <button onClick={() => navigate('/org/assessments')}
          className="text-[12.5px] text-slate-400 hover:text-blue-600 flex items-center gap-1 mb-3">
          ← Back to Assessments
        </button>
        <h1 className="text-[22px] font-bold text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>
          New Assessment
        </h1>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <StepIndicator steps={STEPS} current={step} />

        {/* ─── Step 1: Assessment Details ─── */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-[12px] font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Assessment Name *</label>
              <input value={form.name} onChange={e => up('name', e.target.value)}
                placeholder="e.g., Q1 2026 DPDP Compliance Assessment"
                className="w-full h-10 px-3 rounded-lg border border-slate-300 text-[13px] focus:outline-none focus:border-slate-700" />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Description</label>
              <textarea value={form.desc} onChange={e => up('desc', e.target.value)} rows={2}
                placeholder="Optional description..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-[13px] resize-none focus:outline-none focus:border-slate-700" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Start Date *</label>
                <input type="date" value={form.startDate} onChange={e => up('startDate', e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 text-[13px] focus:outline-none focus:border-slate-700" />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">End Date *</label>
                <input type="date" value={form.endDate} min={form.startDate} onChange={e => up('endDate', e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 text-[13px] focus:outline-none focus:border-slate-700" />
              </div>
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Department *</label>
              {loadingDepts ? <div className="h-10 bg-slate-100 rounded-lg animate-pulse" /> : (
                <select value={form.deptId} onChange={e => { up('deptId', e.target.value); setSelectedAssets(new Set()); }}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 text-[13px] focus:outline-none focus:border-slate-700 bg-white">
                  <option value="">Select department…</option>
                  {(depts as any[]).map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              )}
              <p className="text-[11px] text-slate-400 mt-1">Assets and IT Admins will be loaded from this department.</p>
            </div>
          </div>
        )}

        {/* ─── Step 2: Select Assets ─── */}
        {step === 2 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[14px] font-bold text-slate-900">Select Assets</p>
                <p className="text-[12px] text-slate-400">Assets in <strong>{selectedDeptName}</strong> · {selectedAssets.size} selected</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setSelectedAssets(new Set(ownDeptAssets.map((a: any) => a.id)))}
                  className="text-[11.5px] text-blue-600 hover:text-blue-700 font-medium">Select all</button>
                <button onClick={() => setSelectedAssets(new Set())}
                  className="text-[11.5px] text-slate-400 hover:text-slate-600">Clear</button>
              </div>
            </div>

            {loadingAssets ? (
              <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-14 bg-slate-100 rounded-lg animate-pulse" />)}</div>
            ) : ownDeptAssets.length === 0 && supplierDeptAssets.length === 0 ? (
              <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-xl">
                <Database className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-[13px] text-slate-500">No assets found in {selectedDeptName}.</p>
                <p className="text-[11.5px] text-slate-400 mt-1">Add assets to this department in Org Settings first.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Own assets — selectable */}
                {ownDeptAssets.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11.5px] font-semibold text-slate-500 uppercase tracking-wide">Org Assets</p>
                    {ownDeptAssets.map((asset: any) => {
                      const isSelected = selectedAssets.has(asset.id);
                      return (
                        <div key={asset.id} onClick={() => toggleAsset(asset.id)}
                          className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                            isSelected ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}>
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                            isSelected ? 'bg-blue-500 border-blue-500' : 'border-slate-300'
                          }`}>
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <Database className="w-4 h-4 text-blue-400 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-[13px] font-semibold text-slate-800">{asset.name}</p>
                            <p className="text-[11px] text-slate-400">{asset.assetType?.replace(/_/g, ' ')}</p>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            asset.criticality === 'CRITICAL' ? 'bg-red-50 text-red-600' :
                            asset.criticality === 'HIGH' ? 'bg-orange-50 text-orange-600' :
                            'bg-slate-100 text-slate-500'
                          }`}>{asset.criticality}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Supplier/vendor assets — shown for reference, not selectable for task creation */}
                {supplierDeptAssets.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <p className="text-[11.5px] font-semibold text-slate-500 uppercase tracking-wide">Vendor / Supplier Assets</p>
                      <span className="text-[10px] bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded font-medium">Reference only · Tasks not created</span>
                    </div>
                    {supplierDeptAssets.map((asset: any) => (
                      <div key={asset.id}
                        className="flex items-center gap-3 p-3.5 rounded-xl border border-dashed border-slate-200 bg-slate-50 opacity-70 cursor-not-allowed">
                        <div className="w-5 h-5 rounded border-2 border-slate-200 flex-shrink-0" />
                        <Database className="w-4 h-4 text-slate-300 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-[13px] font-semibold text-slate-600">{asset.name}</p>
                          <p className="text-[11px] text-slate-400">{asset.supplierName} · {asset.assetType?.replace(/_/g, ' ')}</p>
                        </div>
                        <span className="text-[10px] text-slate-400 italic">vendor asset</span>
                      </div>
                    ))}
                  </div>
                )}

                {ownDeptAssets.length === 0 && (
                  <div className="py-8 text-center border-2 border-dashed border-slate-200 rounded-xl">
                    <Database className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-[13px] text-slate-500">No own assets in {selectedDeptName}.</p>
                    <p className="text-[11.5px] text-slate-400 mt-1">Add assets to this department in Org Settings to create compliance tasks.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ─── Step 3: Regulation + Controls ─── */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <p className="text-[14px] font-bold text-slate-900 mb-1">Select Regulation</p>
              <p className="text-[12px] text-slate-400 mb-3">Controls from this regulation will be assessed against your selected assets.</p>
              {loadingRegs ? (
                <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />)}</div>
              ) : (
                <div className="space-y-2">
                  {(regulations as any[]).map((reg: any) => (
                    <div key={reg.id} onClick={() => setSelectedRegId(reg.id)}
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        selectedRegId === reg.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
                      }`}>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        selectedRegId === reg.id ? 'bg-blue-500 border-blue-500' : 'border-slate-300'
                      }`}>
                        {selectedRegId === reg.id && <div className="w-2 h-2 bg-white rounded-full" />}
                      </div>
                      <Shield className="w-4 h-4 text-blue-400" />
                      <div className="flex-1">
                        <p className="text-[13px] font-bold text-slate-800">{reg.name}</p>
                        <p className="text-[11px] text-slate-400">{reg.shortCode} · {reg.jurisdiction}</p>
                      </div>
                      {selectedRegId === reg.id && (
                        <span className="text-[10.5px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-semibold">
                          {allControls.length} controls
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedReg && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[13px] font-bold text-slate-800">Controls</p>
                  <p className="text-[11.5px] text-slate-400">
                    {activeControls.length} active · {excludedControls.size} excluded
                  </p>
                </div>
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {selectedReg.chapters?.map((chapter: any) => (
                    <div key={chapter.id} className="border border-slate-200 rounded-lg overflow-hidden">
                      <button onClick={() => setExpandedChapters(p => {
                        const n = new Set(p); n.has(chapter.id) ? n.delete(chapter.id) : n.add(chapter.id); return n;
                      })} className="w-full flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-left">
                        <ChevronRight className={`w-3.5 h-3.5 text-slate-400 transition-transform ${expandedChapters.has(chapter.id) ? 'rotate-90' : ''}`} />
                        <span className="text-[12.5px] font-bold text-slate-700">{chapter.name}</span>
                        {chapter.title && <span className="text-[11.5px] text-slate-400">— {chapter.title}</span>}
                        <span className="text-[10px] text-slate-400 ml-auto">{chapter.controls?.length ?? 0} controls</span>
                      </button>
                      {expandedChapters.has(chapter.id) && chapter.controls?.map((ctrl: any) => {
                        const isExcluded = excludedControls.has(ctrl.id);
                        return (
                          <div key={ctrl.id} className="border-t border-slate-100">
                            <div className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50">
                              <input type="checkbox" checked={!isExcluded}
                                onChange={e => {
                                  setExcludedControls(p => {
                                    const n = new Set(p);
                                    e.target.checked ? n.delete(ctrl.id) : n.add(ctrl.id);
                                    return n;
                                  });
                                }}
                                className="accent-blue-600 w-3.5 h-3.5 flex-shrink-0" />
                              <p className={`text-[12px] flex-1 ${isExcluded ? 'text-slate-400 line-through' : 'text-slate-700 font-medium'}`}>
                                {ctrl.title}
                              </p>
                            </div>
                            {isExcluded && (
                              <div className="px-8 pb-2">
                                <input value={exclusionReasons[ctrl.id] ?? ''}
                                  onChange={e => setExclusionReasons(p => ({ ...p, [ctrl.id]: e.target.value }))}
                                  placeholder="Reason for exclusion..."
                                  className="w-full h-7 px-2 rounded border border-slate-200 text-[11.5px] text-slate-600 focus:outline-none focus:border-slate-400" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── Step 4: Task Assignment ─── */}
        {step === 4 && (
          <div className="space-y-4">
            <div>
              <p className="text-[14px] font-bold text-slate-900">Assign Tasks</p>
              <p className="text-[12px] text-slate-400 mt-0.5">
                {taskList.length} tasks will be created ({activeControls.length} controls × {selectedAssetList.length} assets).
                Assign each to a specific IT Admin or leave as "Auto" to use department delegation.
              </p>
            </div>

            {(itAdmins as any[]).length === 0 ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[12.5px] font-semibold text-amber-800">No IT Admins in {selectedDeptName}</p>
                  <p className="text-[12px] text-amber-700 mt-0.5">
                    All tasks will be created as PENDING (unassigned). You can assign them manually from the Tasks page.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Bulk assign */}
                <div className="flex items-center gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <Users className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  <p className="text-[12.5px] font-semibold text-slate-700 flex-shrink-0">Bulk assign all:</p>
                  <select value={bulkAssignee}
                    onChange={e => setBulkAssignee(e.target.value)}
                    className="flex-1 h-8 px-2 rounded-lg border border-slate-300 text-[12.5px] focus:outline-none focus:border-slate-700 bg-white">
                    <option value="">Select IT Admin…</option>
                    {(itAdmins as any[]).map((u: any) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                  <button onClick={applyBulkAssign} disabled={!bulkAssignee}
                    className="px-3 py-1.5 bg-slate-900 text-white text-[12px] font-semibold rounded-lg hover:bg-slate-800 disabled:opacity-40 flex items-center gap-1.5">
                    <Shuffle className="w-3.5 h-3.5" /> Apply to All
                  </button>
                </div>

                {/* Per-task assignment table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="grid grid-cols-[1fr_1fr_180px] bg-slate-50 border-b border-slate-200">
                    {['Control', 'Asset', 'Assign To'].map(h => (
                      <div key={h} className="px-3 py-2 text-[11px] font-bold text-slate-500 uppercase tracking-wide">{h}</div>
                    ))}
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {taskList.map((task: any) => {
                      const current = getAssignee(task.key);
                      return (
                        <div key={task.key} className="grid grid-cols-[1fr_1fr_180px] items-center hover:bg-slate-50">
                          <div className="px-3 py-2.5">
                            <p className="text-[12px] font-medium text-slate-800 line-clamp-1">{task.controlTitle}</p>
                          </div>
                          <div className="px-3 py-2.5 flex items-center gap-1.5">
                            <Database className="w-3 h-3 text-blue-400 flex-shrink-0" />
                            <p className="text-[12px] text-slate-600 truncate">{task.assetName}</p>
                          </div>
                          <div className="px-3 py-2">
                            <select
                              value={current === '__auto__' ? '__auto__' : (current ?? '')}
                              onChange={e => setAssignee(task.key, e.target.value)}
                              className="w-full h-7 px-2 rounded-md border border-slate-200 text-[11.5px] focus:outline-none focus:border-blue-400 bg-white">
                              <option value="__auto__">⚡ Auto-delegate</option>
                              <option value="">— Unassigned</option>
                              {(itAdmins as any[]).map((u: any) => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <p className="text-[11.5px] text-slate-400 flex items-center gap-1.5">
                  <span className="text-blue-500">⚡</span>
                  Auto-delegate uses the department's primary IT Admin. You can reassign tasks later from the Tasks page.
                </p>
              </>
            )}
          </div>
        )}

        {/* ─── Step 5: Review ─── */}
        {step === 5 && (
          <div className="space-y-4">
            <p className="text-[14px] font-bold text-slate-900">Review & Create</p>

            {[
              { label: 'Assessment Name', value: form.name },
              { label: 'Department', value: selectedDeptName },
              { label: 'Period', value: `${form.startDate} → ${form.endDate}` },
              { label: 'Regulation', value: selectedReg?.name ?? '—' },
              { label: 'Assets', value: `${selectedAssets.size} selected` },
              { label: 'Controls', value: `${activeControls.length} active${excludedControls.size > 0 ? ` · ${excludedControls.size} excluded` : ''}` },
              { label: 'Tasks to Create', value: `${taskList.length} tasks` },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
                <span className="text-[12.5px] text-slate-500">{label}</span>
                <span className="text-[13px] font-semibold text-slate-800">{value}</span>
              </div>
            ))}

            {/* Assignment summary */}
            {(itAdmins as any[]).length > 0 && (
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl">
                <p className="text-[12px] font-semibold text-blue-800 mb-2">Task Assignment Summary</p>
                {(() => {
                  const manual   = taskList.filter((t: any) => t.key in taskAssignments && taskAssignments[t.key] !== null);
                  const unassign = taskList.filter((t: any) => t.key in taskAssignments && taskAssignments[t.key] === null);
                  const auto     = taskList.filter((t: any) => !(t.key in taskAssignments));
                  return (
                    <div className="space-y-1 text-[12px] text-blue-700">
                      {manual.length   > 0 && <p>✅ {manual.length} manually assigned</p>}
                      {auto.length     > 0 && <p>⚡ {auto.length} will use auto-delegation</p>}
                      {unassign.length > 0 && <p>⏳ {unassign.length} left unassigned (PENDING)</p>}
                    </div>
                  );
                })()}
              </div>
            )}

            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-[12px] text-amber-700">
                Once created, the assessment and its tasks cannot be deleted. Make sure everything looks correct.
              </p>
            </div>
          </div>
        )}

        {/* ─── Navigation ─── */}
        <div className="flex items-center justify-between mt-6 pt-5 border-t border-slate-100">
          {step > 1 ? (
            <button onClick={() => setStep(s => s - 1)}
              className="px-4 py-2 border border-slate-300 text-[13px] text-slate-600 rounded-lg hover:bg-slate-50">
              ← Back
            </button>
          ) : <div />}

          {step < 5 ? (
            <button onClick={() => setStep(s => s + 1)}
              disabled={!canProceed[step as keyof typeof canProceed]}
              className="px-5 py-2 bg-slate-900 text-white text-[13px] font-semibold rounded-lg hover:bg-slate-800 disabled:opacity-40 flex items-center gap-2">
              Next <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={handleCreate}
              disabled={createMutation.isPending}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-[13px] font-semibold rounded-lg flex items-center gap-2">
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Create Assessment
            </button>
          )}
        </div>
      </div>
    </div>
  );
}