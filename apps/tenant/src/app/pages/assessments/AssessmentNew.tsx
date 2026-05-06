import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { Check, ChevronRight, ChevronDown, Shield, CheckSquare2, Plus, X } from 'lucide-react';
import { ASSETS, CONTROLS } from '../../data/mockData';

const DEPARTMENTS = ['Engineering', 'Finance', 'HR', 'Marketing', 'Sales'];
const REGULATIONS = [
  { id: 'DPDP', name: 'DPDP Act 2023', authority: 'Ministry of Electronics and IT, Govt. of India', color: '#3B82F6', icon: '🛡️', controlCount: 68 },
  { id: 'RBI', name: 'RBI Data Localisation', authority: 'Reserve Bank of India', color: '#10B981', icon: '🏦', controlCount: 24 },
  { id: 'SEBI', name: 'SEBI Cybersecurity Framework', authority: 'Securities and Exchange Board of India', color: '#8B5CF6', icon: '📈', controlCount: 38 },
];

const DEPT_ASSETS: Record<string, typeof ASSETS> = {
  Engineering: ASSETS.filter(a => a.department === 'Engineering'),
  Finance: [{ ...ASSETS[2], id: 'AST-FIN-001', name: 'Payment Gateway', department: 'Finance', type: 'Data Flow', compliance: 'Non-Compliant', compliantControls: 3, totalControls: 10, openActions: 6 }],
  HR: [{ ...ASSETS[1], id: 'AST-HR-001', name: 'HR Management System', department: 'HR', type: 'System / Application', compliance: 'Fully Compliant', compliantControls: 14, totalControls: 14, openActions: 0 }],
  Marketing: [{ ...ASSETS[4], id: 'AST-MKT-001', name: 'Consent Banner', department: 'Marketing', type: 'Consent Mechanism', compliance: 'Fully Compliant', compliantControls: 6, totalControls: 6, openActions: 0 }],
  Sales: [{ ...ASSETS[5], id: 'AST-SAL-001', name: 'CRM Portal', department: 'Sales', type: 'System / Application', compliance: 'Not Started', compliantControls: 0, totalControls: 16, openActions: 1 }],
};

const CHAPTER_GROUPS: { chapter: string; controls: typeof CONTROLS }[] = [
  { chapter: 'Chapter 2 — Obligations of Data Fiduciary', controls: CONTROLS.filter(c => c.chapter === 'Chapter 2') },
  { chapter: 'Chapter 3 — Rights of Data Principal', controls: CONTROLS.filter(c => c.chapter === 'Chapter 3') },
  { chapter: 'Chapter 4 — Special Obligations', controls: CONTROLS.filter(c => c.chapter === 'Chapter 4') },
];

function StepIndicator({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="flex items-center gap-0 mb-6">
      {steps.map((s, i) => (
        <React.Fragment key={s}>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md ${current === i + 1 ? 'bg-blue-50' : ''}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${current > i + 1 ? 'bg-green-500 text-white' : current === i + 1 ? 'bg-blue-600 text-white' : 'border-2 border-slate-200 text-slate-400'}`}>
              {current > i + 1 ? <Check className="w-3.5 h-3.5" /> : i + 1}
            </div>
            <span className={`text-[12px] font-medium ${current === i + 1 ? 'text-blue-700' : current > i + 1 ? 'text-green-600' : 'text-slate-400'}`}>{s}</span>
          </div>
          {i < steps.length - 1 && <div className={`h-px flex-1 mx-1 ${current > i + 1 ? 'bg-green-400' : 'bg-slate-200'}`} />}
        </React.Fragment>
      ))}
    </div>
  );
}

export function AssessmentNewPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(false);

  // Step 1 state
  const [form, setForm] = useState({ name: '', desc: '', startDate: '', endDate: '', dept: '' });
  const up = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  // Step 2 state
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const deptAssets = form.dept ? (DEPT_ASSETS[form.dept] || []) : [];
  const toggleAsset = (id: string) => setSelectedAssets(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  // Step 3 state
  const [selectedRegs, setSelectedRegs] = useState<Set<string>>(new Set(['DPDP']));
  const toggleReg = (id: string) => setSelectedRegs(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const totalControls = Array.from(selectedRegs).reduce((s, r) => s + (REGULATIONS.find(reg => reg.id === r)?.controlCount || 0), 0);

  // Step 4 state
  const [excludedControls, setExcludedControls] = useState<Set<string>>(new Set());
  const [exclusionReasons, setExclusionReasons] = useState<Record<string, string>>({});
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set(['Chapter 2 — Obligations of Data Fiduciary']));

  const toggleExclude = (id: string) => {
    setExcludedControls(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const toggleChapter = (ch: string) => setExpandedChapters(p => { const n = new Set(p); n.has(ch) ? n.delete(ch) : n.add(ch); return n; });

  const selectedCount = CONTROLS.length - excludedControls.size;
  const estimatedActions = selectedCount * 2;

  const handleCreate = () => {
    setCreating(true);
    setTimeout(() => { setCreating(false); setCreated(true); }, 2000);
  };

  const STEPS = ['Assessment Details', 'Select Assets', 'Select Regulations', 'Review Controls'];

  if (created) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-9 h-9 text-green-600" />
        </div>
        <h2 className="text-[20px] font-bold text-slate-900 mb-2" style={{ fontFamily: 'Sora, sans-serif' }}>Assessment Created Successfully</h2>
        <div className="space-y-2 text-[13px] text-slate-600 mb-5">
          <p><span className="font-bold text-slate-900">{estimatedActions}</span> compliance tasks have been created</p>
          <p className="text-green-600 font-medium">12 tasks assigned to Manish Kumar (dept IT Admin)</p>
          <p className="text-amber-600 font-medium">⚠ {estimatedActions - 12} tasks unassigned — assign manually</p>
        </div>
        <div className="flex flex-col gap-2">
          <button onClick={() => navigate('/org/assessments')} className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-bold rounded-lg transition-colors">View Assessment →</button>
          <button onClick={() => navigate('/org/compliance-tasks')} className="w-full py-2.5 border border-amber-300 text-amber-700 text-[13px] font-semibold rounded-lg hover:bg-amber-50 transition-colors">Assign Unassigned Tasks →</button>
        </div>
      </div>
    );
  }

  if (creating) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-[15px] font-semibold text-slate-700">Creating assessment and generating compliance tasks...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-[20px] font-bold text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>Create Assessment</h1>
        <p className="text-[12px] text-slate-400 mt-0.5">Set up a new compliance assessment for your organization</p>
      </div>

      <StepIndicator steps={STEPS} current={step} />

      <div className="bg-white border border-slate-200 rounded-lg p-5">
        {/* Step 1 */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-[15px] font-bold text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>Assessment Details</h2>
            <div>
              <label className="block text-[11.5px] font-medium text-slate-700 mb-1">Assessment Name <span className="text-red-500">*</span></label>
              <input value={form.name} onChange={e => up('name', e.target.value)} placeholder="e.g., DPDP Q1 Assessment 2025"
                className="w-full h-10 px-3 rounded-lg border border-slate-300 text-[13px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-[11.5px] font-medium text-slate-700 mb-1">Description <span className="text-slate-400 font-normal">(optional)</span></label>
              <textarea rows={2} value={form.desc} onChange={e => up('desc', e.target.value)} placeholder="What does this assessment cover?"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-[12.5px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11.5px] font-medium text-slate-700 mb-1">Start Date <span className="text-red-500">*</span></label>
                <input type="date" value={form.startDate} onChange={e => up('startDate', e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 text-[13px] text-slate-900 focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-[11.5px] font-medium text-slate-700 mb-1">End Date <span className="text-red-500">*</span></label>
                <input type="date" value={form.endDate} onChange={e => up('endDate', e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 text-[13px] text-slate-900 focus:outline-none focus:border-blue-500" />
              </div>
            </div>
            <div>
              <label className="block text-[11.5px] font-medium text-slate-700 mb-1">Select Department <span className="text-red-500">*</span></label>
              <select value={form.dept} onChange={e => { up('dept', e.target.value); setSelectedAssets(new Set()); }}
                className="w-full h-10 px-3 rounded-lg border border-slate-300 text-[13px] text-slate-900 focus:outline-none focus:border-blue-500 bg-white">
                <option value="">Select a department…</option>
                {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
              </select>
              <p className="text-[11px] text-slate-400 mt-1">Assessment will cover assets and suppliers in this department.</p>
            </div>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-[15px] font-bold text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>Select Assets</h2>
              <p className="text-[12px] text-slate-400">Choose which assets in <strong>{form.dept}</strong> this assessment will cover.</p>
            </div>
            {deptAssets.length === 0 ? (
              <div className="py-10 text-center text-slate-400">
                <p className="text-[13px]">No assets found in {form.dept} department.</p>
                <p className="text-[11.5px] mt-1">Add assets to this department first.</p>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11.5px] font-semibold text-slate-700">Own Assets</p>
                  <button onClick={() => setSelectedAssets(new Set(deptAssets.map(a => a.id)))} className="text-[11px] text-blue-600 hover:text-blue-700 font-medium">Select all</button>
                </div>
                <div className="space-y-2">
                  {deptAssets.map(asset => (
                    <label key={asset.id} className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${selectedAssets.has(asset.id) ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-300'}`}>
                      <input type="checkbox" checked={selectedAssets.has(asset.id)} onChange={() => toggleAsset(asset.id)} className="accent-blue-600 w-4 h-4 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-[12.5px] font-semibold text-slate-800">{asset.name}</p>
                        <p className="text-[11px] text-slate-400">{asset.type}</p>
                      </div>
                      <span className={`text-[10.5px] px-2 py-0.5 rounded font-semibold ${asset.compliance === 'Fully Compliant' ? 'bg-green-50 text-green-700' : asset.compliance === 'Partially Compliant' ? 'bg-blue-50 text-blue-700' : asset.compliance === 'Non-Compliant' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-500'}`}>{asset.compliance}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div className="pt-3 border-t border-slate-200">
              <p className="text-[12px] font-semibold text-slate-700">{selectedAssets.size} asset{selectedAssets.size !== 1 ? 's' : ''} selected</p>
              {selectedAssets.size === 0 && <p className="text-[11px] text-red-500 mt-0.5">Select at least one asset to continue.</p>}
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-[15px] font-bold text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>Select Regulations</h2>
              <p className="text-[12px] text-slate-400">Choose which regulations to assess against. All applicable controls will be loaded.</p>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {REGULATIONS.map(reg => {
                const isSelected = selectedRegs.has(reg.id);
                return (
                  <button key={reg.id} onClick={() => toggleReg(reg.id)}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-300'}`}>
                    <div className="flex items-start gap-3">
                      <span className="text-[20px]">{reg.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-mono text-[10.5px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${reg.color}18`, color: reg.color }}>{reg.id}</span>
                          {isSelected && <Check className="w-4 h-4 text-blue-600 ml-auto" />}
                        </div>
                        <p className="text-[13px] font-bold text-slate-900">{reg.name}</p>
                        <p className="text-[11px] text-slate-500">{reg.authority}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{reg.controlCount} controls applicable to selected assets</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            {selectedRegs.size > 0 && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-[12px] text-blue-800">
                  Based on <strong>{selectedAssets.size} assets</strong> and <strong>{selectedRegs.size} regulation{selectedRegs.size !== 1 ? 's' : ''}</strong> selected:
                  <strong> {totalControls} controls</strong> will be loaded in this assessment.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 4 */}
        {step === 4 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-[15px] font-bold text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>Review Controls</h2>
              <p className="text-[12px] text-slate-400">All applicable controls are selected by default. Uncheck any you don't want to include — a reason is required for each exclusion.</p>
            </div>

            {Array.from(selectedRegs).map(regId => {
              const reg = REGULATIONS.find(r => r.id === regId);
              if (!reg) return null;
              return (
                <div key={regId} className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                    <span className="text-[14px]">{reg.icon}</span>
                    <p className="text-[12.5px] font-bold text-slate-800">{reg.name}</p>
                    <span className="text-[10.5px] text-slate-400 ml-1">— {CONTROLS.length} controls</span>
                  </div>
                  {CHAPTER_GROUPS.map(({ chapter, controls: chapterControls }) => {
                    if (chapterControls.length === 0) return null;
                    const chExpanded = expandedChapters.has(chapter);
                    return (
                      <div key={chapter} className="border-t border-slate-100">
                        <button onClick={() => toggleChapter(chapter)} className="w-full flex items-center gap-2 px-4 py-2 hover:bg-slate-50 text-left">
                          {chExpanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" style={{ transform: 'none' }} /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />}
                          <span className="text-[11.5px] font-semibold text-slate-700">{chapter}</span>
                          <span className="text-[10.5px] text-slate-400">({chapterControls.length})</span>
                        </button>
                        {chExpanded && chapterControls.map(ctrl => (
                          <div key={ctrl.id}>
                            <div className={`flex items-center gap-3 px-6 py-2.5 border-t border-slate-50 hover:bg-slate-50 transition-colors ${excludedControls.has(ctrl.id) ? 'opacity-50' : ''}`}>
                              <input type="checkbox" checked={!excludedControls.has(ctrl.id)} onChange={() => toggleExclude(ctrl.id)} className="accent-blue-600 w-3.5 h-3.5 flex-shrink-0" />
                              <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold flex-shrink-0">{ctrl.id}</span>
                              <p className="text-[12px] text-slate-800 flex-1">{ctrl.title}</p>
                              <div className="flex gap-1 flex-shrink-0">
                                {[...Array(Math.min(3, ctrl.linkedActions || 0))].map((_, i) => (
                                  <span key={i} className="w-1.5 h-1.5 rounded-full bg-blue-300" />
                                ))}
                              </div>
                              <span className="text-[10px] text-slate-400 flex-shrink-0">{ctrl.linkedActions || 2} actions</span>
                            </div>
                            {excludedControls.has(ctrl.id) && (
                              <div className="px-10 pb-2.5">
                                <input value={exclusionReasons[ctrl.id] || ''} onChange={e => setExclusionReasons(p => ({ ...p, [ctrl.id]: e.target.value }))} placeholder="Reason for exclusion * (min 10 chars — logged in audit trail)"
                                  className="w-full h-8 px-3 rounded-md border border-amber-300 bg-amber-50 text-[11.5px] text-amber-900 placeholder-amber-400 focus:outline-none focus:border-amber-400" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {/* Confirm summary */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-[12px]">
              <p className="font-bold text-slate-800 mb-2">Assessment Summary</p>
              {[
                ['Assessment', form.name],
                ['Department', form.dept],
                ['Period', `${form.startDate} to ${form.endDate}`],
                ['Regulations', Array.from(selectedRegs).join(', ')],
                ['Assets in scope', `${selectedAssets.size} asset${selectedAssets.size !== 1 ? 's' : ''}`],
                ['Controls', `${selectedCount} selected, ${excludedControls.size} excluded`],
                ['Actions to be created', `~${estimatedActions}`],
              ].map(([k, v]) => (
                <div key={k} className="flex gap-3">
                  <span className="text-slate-400 w-36 flex-shrink-0">{k}</span>
                  <span className="text-slate-800 font-medium">{v}</span>
                </div>
              ))}
              <p className="text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-200">Actions will be automatically created and assigned based on department IT Admin mapping. Unassigned actions can be delegated manually.</p>
            </div>

            <p className="text-[11px] text-slate-500">{selectedCount} controls selected · {excludedControls.size} excluded · {estimatedActions} actions will be auto-created</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <button onClick={() => step > 1 ? setStep(step - 1) : navigate('/org/assessments')}
          className="px-4 py-2 border border-slate-300 text-[13px] text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">
          {step === 1 ? 'Cancel' : '← Back'}
        </button>
        {step < 4 ? (
          <button
            disabled={
              (step === 1 && (!form.name || !form.startDate || !form.endDate || !form.dept)) ||
              (step === 2 && selectedAssets.size === 0) ||
              (step === 3 && selectedRegs.size === 0)
            }
            onClick={() => setStep(step + 1)}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-[13px] font-semibold rounded-lg transition-colors">
            {step === 1 ? 'Next: Select Assets →' : step === 2 ? 'Next: Select Regulations →' : 'Next: Review Controls →'}
          </button>
        ) : (
          <button onClick={handleCreate} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-semibold rounded-lg transition-colors flex items-center gap-2">
            <CheckSquare2 className="w-4 h-4" /> Create Assessment →
          </button>
        )}
      </div>
    </div>
  );
}