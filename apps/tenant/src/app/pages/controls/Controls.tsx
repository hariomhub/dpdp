import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  ChevronDown, ChevronRight, Shield, Search, Plus, Lock, Edit2, Trash2,
  Eye, X, Check
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { CONTROLS } from '../../data/mockData';

const REGULATIONS = [
  { id: 'DPDP', name: 'DPDP Act 2023', color: '#3B82F6', controls: CONTROLS.length, compliant: 72 },
  { id: 'RBI', name: 'RBI Data Localisation', color: '#10B981', controls: 12, compliant: 58 },
  { id: 'SEBI', name: 'SEBI Cybersecurity', color: '#8B5CF6', controls: 8, compliant: 44 },
];

const DPDP_CHAPTERS = [
  'Chapter 1 — Preliminary',
  'Chapter 2 — Obligations of Data Fiduciary',
  'Chapter 3 — Rights of Data Principal',
  'Chapter 4 — Special Provisions',
  'Chapter 5 — Data Protection Board',
  'Chapter 6 — Powers and Functions',
  'Chapter 7 — Appeals',
  'Chapter 8 — Penalties',
  'Chapter 10 — Miscellaneous',
];
const RBI_CHAPTERS = ['Chapter 1 — Scope and Applicability', 'Chapter 2 — Data Storage Requirements', 'Chapter 3 — Cross-border Transfer Restrictions', 'Chapter 4 — Audit and Reporting', 'Chapter 5 — Enforcement'];
const SEBI_CHAPTERS = ['Chapter 1 — Introduction', 'Chapter 2 — Governance', 'Chapter 3 — Risk Management', 'Chapter 4 — Incident Response', 'Chapter 5 — Audit Trail', 'Chapter 6 — Business Continuity', 'Chapter 7 — Vendor Management', 'Chapter 8 — Compliance Reporting'];
const REG_CHAPTERS: Record<string, string[]> = { DPDP: DPDP_CHAPTERS, RBI: RBI_CHAPTERS, SEBI: SEBI_CHAPTERS };

const CHAPTERS: Record<string, typeof CONTROLS> = {
  'Chapter 2 — Obligations of Data Fiduciary': CONTROLS.filter(c => c.chapter === 'Chapter 2'),
  'Chapter 3 — Rights of Data Principal': CONTROLS.filter(c => c.chapter === 'Chapter 3'),
  'Chapter 4 — Special Obligations': CONTROLS.filter(c => c.chapter === 'Chapter 4'),
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  Compliant: { bg: '#052E1A', text: '#22C55E' },
  'In Progress': { bg: '#052A3D', text: '#38BDF8' },
  'Non-Compliant': { bg: '#2A0505', text: '#F87171' },
  'Not Started': { bg: '#0F1729', text: '#64748B' },
  Draft: { bg: '#1A1200', text: '#F59E0B' },
  Published: { bg: '#052E1A', text: '#22C55E' },
};

function StatusChip({ status }: { status: string }) {
  const s = STATUS_COLORS[status] || { bg: '#1e293b', text: '#94a3b8' };
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-semibold"
      style={{ background: s.bg, color: s.text, border: `1px solid ${s.text}30` }}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.text }} />
      {status}
    </span>
  );
}

const EVIDENCE_TYPES = ['File', 'Screenshot', 'Configuration Export', 'Document', 'External Link', 'Text Note', 'Log'];
type ActionEntry = { id: string; title: string; desc: string; evidenceTypes: string[]; dueDays: number; priority: string };

function CustomControlForm({ onClose, onSave }: { onClose: () => void; onSave: (ctrl: any) => void }) {
  const [form, setForm] = useState({ title: '', desc: '', regs: [] as string[], chapter: '', applicableTo: 'Both', status: 'Draft' });
  const [actions, setActions] = useState<ActionEntry[]>([{ id: '1', title: '', desc: '', evidenceTypes: [], dueDays: 30, priority: 'High' }]);
  const up = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));
  const toggleArr = (arr: string[], val: string) => arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];
  const addAction = () => setActions(p => [...p, { id: String(Date.now()), title: '', desc: '', evidenceTypes: [], dueDays: 30, priority: 'High' }]);
  const upAction = (id: string, k: string, v: any) => setActions(p => p.map(a => a.id === id ? { ...a, [k]: v } : a));

  // Build chapter list based on selected regulations
  const availableChapters = form.regs.length === 0
    ? null // free text when no regulation
    : form.regs.length === 1
      ? (REG_CHAPTERS[form.regs[0]] || [])
      : form.regs.flatMap(r => (REG_CHAPTERS[r] || []).map(c => `[${r}] ${c}`));

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-end z-50" onClick={onClose}>
      <div className="w-[860px] h-full bg-white border-l border-slate-200 overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 sticky top-0 bg-white z-10">
          <p className="text-[15px] font-bold text-slate-900">Create Custom Control</p>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400 hover:text-slate-700" /></button>
        </div>
        <div className="p-5 space-y-5">
          <div className="space-y-4">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Control Details</p>
            <div>
              <label className="block text-[11.5px] font-medium text-slate-700 mb-1">Control Title <span className="text-red-500">*</span></label>
              <input value={form.title} onChange={e => up('title', e.target.value)} placeholder="e.g., Implement valid consent mechanism"
                className="w-full h-10 px-3 rounded-lg border border-slate-300 text-[13px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-[11.5px] font-medium text-slate-700 mb-1">Description <span className="text-red-500">*</span></label>
              <textarea rows={3} value={form.desc} onChange={e => up('desc', e.target.value)} placeholder="Full description of what this control requires and why it is necessary."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-[12.5px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 resize-none" />
            </div>
            <div>
              <label className="block text-[11.5px] font-medium text-slate-700 mb-2">Regulation(s)</label>
              <div className="flex gap-2">
                {REGULATIONS.map(r => (
                  <button key={r.id} onClick={() => { up('regs', toggleArr(form.regs, r.id)); up('chapter', ''); }}
                    className={`px-3 py-1.5 rounded-full text-[11.5px] font-semibold border-2 transition-all ${form.regs.includes(r.id) ? 'text-white border-current' : 'border-slate-200 text-slate-600 hover:border-slate-400'}`}
                    style={form.regs.includes(r.id) ? { background: r.color, borderColor: r.color } : {}}>
                    {r.id}
                  </button>
                ))}
              </div>
              <p className="text-[10.5px] text-slate-400 mt-1">Optional — leave empty for internal controls with no regulation mapping.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11.5px] font-medium text-slate-700 mb-1">Chapter / Section Reference</label>
                {availableChapters === null ? (
                  // No regulation selected — free text fallback
                  <input value={form.chapter} onChange={e => up('chapter', e.target.value)} placeholder="e.g., Section 4(1)(a) or Internal Policy Ref"
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 text-[12.5px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500" />
                ) : (
                  // Regulation(s) selected — structured dropdown
                  <select value={form.chapter} onChange={e => up('chapter', e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 text-[12.5px] text-slate-900 focus:outline-none focus:border-blue-500 bg-white">
                    <option value="">Select chapter…</option>
                    {availableChapters.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                )}
              </div>
              <div>
                <label className="block text-[11.5px] font-medium text-slate-700 mb-2">Applicable To <span className="text-red-500">*</span></label>
                <div className="flex gap-3 pt-1">
                  {['Data Fiduciary', 'Significant DF', 'Both'].map(v => (
                    <label key={v} className="flex items-center gap-1.5 cursor-pointer text-[12px] text-slate-700">
                      <input type="radio" name="applicable" checked={form.applicableTo === v} onChange={() => up('applicableTo', v)} className="accent-blue-600" />
                      {v}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <label className="block text-[11.5px] font-medium text-slate-700 mb-2">Status</label>
              <div className="flex gap-3">
                {['Draft', 'Published'].map(s => (
                  <label key={s} className="flex items-center gap-1.5 cursor-pointer text-[12px] text-slate-700">
                    <input type="radio" name="ctrlStatus" checked={form.status === s} onChange={() => up('status', s)} className="accent-blue-600" />
                    <span className="font-medium">{s}</span>
                    <span className="text-slate-400 text-[10.5px]">{s === 'Draft' ? '(not visible to auditors)' : '(visible and active)'}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[12.5px] font-bold text-slate-800">Pre-defined Actions</p>
                <p className="text-[11px] text-slate-400">Define actions that will automatically be created when this control is added to an assessment. At least one action is required.</p>
              </div>
              <button onClick={addAction} className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors">
                <Plus className="w-3.5 h-3.5" /> Add Action
              </button>
            </div>
            {actions.map((action, idx) => (
              <div key={action.id} className="p-4 border border-slate-200 rounded-lg bg-slate-50 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[11.5px] font-bold text-slate-600">Action {idx + 1}</p>
                  {actions.length > 1 && <button onClick={() => setActions(p => p.filter(a => a.id !== action.id))} className="text-[11px] text-red-500 hover:text-red-700 flex items-center gap-1"><Trash2 className="w-3 h-3" /> Remove</button>}
                </div>
                <input value={action.title} onChange={e => upAction(action.id, 'title', e.target.value)} placeholder="Action Title *"
                  className="w-full h-9 px-3 rounded-md border border-slate-300 text-[12.5px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 bg-white" />
                <textarea rows={2} value={action.desc} onChange={e => upAction(action.id, 'desc', e.target.value)} placeholder="Detailed steps for the IT Admin to complete this action"
                  className="w-full px-3 py-2 rounded-md border border-slate-300 text-[12px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 resize-none bg-white" />
                <div>
                  <p className="text-[11px] font-medium text-slate-600 mb-1.5">Expected Evidence Type <span className="text-red-500">*</span></p>
                  <div className="flex flex-wrap gap-1.5">
                    {EVIDENCE_TYPES.map(t => (
                      <button key={t} onClick={() => upAction(action.id, 'evidenceTypes', action.evidenceTypes.includes(t) ? action.evidenceTypes.filter((e: string) => e !== t) : [...action.evidenceTypes, t])}
                        className={`px-2 py-0.5 rounded text-[10.5px] font-medium border transition-all ${action.evidenceTypes.includes(t) ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-600 hover:border-blue-300 bg-white'}`}>{t}</button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[11px] font-medium text-slate-600 mb-1">Suggested Due Days <span className="text-red-500">*</span></p>
                    <div className="flex items-center gap-2">
                      <input type="number" value={action.dueDays} onChange={e => upAction(action.id, 'dueDays', Number(e.target.value))} min={1} max={365}
                        className="w-20 h-8 px-3 rounded-md border border-slate-300 text-[12.5px] text-slate-900 focus:outline-none focus:border-blue-500 bg-white" />
                      <span className="text-[12px] text-slate-500">days from assignment date</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-slate-600 mb-1">Priority <span className="text-red-500">*</span></p>
                    <div className="flex gap-2">
                      {['Low', 'Medium', 'High', 'Critical'].map(p => (
                        <button key={p} onClick={() => upAction(action.id, 'priority', p)}
                          className={`px-2.5 py-1 rounded text-[10.5px] font-medium border transition-all ${action.priority === p ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-600 hover:border-blue-300 bg-white'}`}>{p}</button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 pt-3 border-t border-slate-200">
            <button onClick={onClose} className="px-4 py-2 border border-slate-300 text-[13px] text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
            <button onClick={() => {
              onSave({ id: `CC-${Date.now()}`, title: form.title, chapter: form.chapter || 'Custom', applicableTo: form.applicableTo, status: form.status, linkedActions: actions.length, description: form.desc });
              onClose();
            }} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-semibold rounded-lg transition-colors">Save Control →</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ControlsPage() {
  const navigate = useNavigate();
  const { role } = useApp();
  const [activeTab, setActiveTab] = useState('Platform Controls');
  const [search, setSearch] = useState('');
  const [filterReg, setFilterReg] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterApplicable, setFilterApplicable] = useState('All');
  const [expandedRegs, setExpandedRegs] = useState<Set<string>>(new Set(['DPDP']));
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set(['DPDP-Chapter 2 — Obligations of Data Fiduciary']));
  const [showCustomForm, setShowCustomForm] = useState(false);
  // FIX 5c: local state so new controls appear immediately
  const [customControls, setCustomControls] = useState([
    { id: 'CC-001', title: 'Internal Data Access Policy Compliance', chapter: 'Custom', applicableTo: 'Both', status: 'Draft', linkedActions: 1, description: 'Custom control for ensuring internal data access follows least-privilege principle.' },
  ]);
  const canManage = role === 'ceo' || role === 'co';

  const toggleReg = (id: string) => setExpandedRegs(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleChapter = (key: string) => setExpandedChapters(p => { const n = new Set(p); n.has(key) ? n.delete(key) : n.add(key); return n; });
  const toggleRegFilter = (id: string) => setFilterReg(p => p.includes(id) ? p.filter(r => r !== id) : [...p, id]);

  const filteredControls = (chapter: typeof CONTROLS) => chapter.filter(c => {
    const matchSearch = search === '' || c.title.toLowerCase().includes(search.toLowerCase()) || c.id.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'All' || c.status === filterStatus;
    const matchApplicable = filterApplicable === 'All' || c.applicableTo === filterApplicable || (filterApplicable === 'Both' && c.applicableTo === 'Both');
    return matchSearch && matchStatus && matchApplicable;
  });

  return (
    <div className="space-y-4">
      {showCustomForm && <CustomControlForm onClose={() => setShowCustomForm(false)} onSave={ctrl => setCustomControls(p => [ctrl, ...p])} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-bold text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>Controls Library</h1>
          <p className="text-[12px] text-slate-400 mt-0.5">Platform controls are defined by the compliance team. You can create custom controls for your organization.</p>
        </div>
        {activeTab === 'Custom Controls' && canManage && (
          <button onClick={() => setShowCustomForm(true)} className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-medium rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> Create Custom Control
          </button>
        )}
      </div>

      {/* Main Tabs */}
      <div className="flex border-b border-slate-200 gap-0">
        {['Platform Controls', 'Custom Controls'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 text-[12.5px] font-medium border-b-2 transition-colors -mb-px ${activeTab === tab ? 'border-blue-500 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            {tab}
          </button>
        ))}
      </div>

      {/* Platform Controls Tab */}
      {activeTab === 'Platform Controls' && (
        <div className="space-y-3">
          {/* Filter Bar */}
          <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search controls by title or ID..."
                  className="w-full pl-8 pr-3 h-8 rounded-md border border-slate-200 text-[12.5px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500" />
              </div>
              <div className="flex gap-2">
                {REGULATIONS.map(r => (
                  <button key={r.id} onClick={() => toggleRegFilter(r.id)}
                    className={`px-3 py-1 rounded-full text-[11.5px] font-semibold border transition-all ${filterReg.includes(r.id) ? 'text-white' : 'border-slate-200 text-slate-600 hover:border-slate-400'}`}
                    style={filterReg.includes(r.id) ? { background: r.color, borderColor: r.color } : {}}>
                    {r.id}
                  </button>
                ))}
              </div>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="h-8 px-2 rounded-md border border-slate-200 text-[12px] text-slate-700 focus:outline-none focus:border-blue-500 bg-white">
                {['All', 'Compliant', 'In Progress', 'Non-Compliant', 'Not Started'].map(s => <option key={s}>{s}</option>)}
              </select>
              <select value={filterApplicable} onChange={e => setFilterApplicable(e.target.value)}
                className="h-8 px-2 rounded-md border border-slate-200 text-[12px] text-slate-700 focus:outline-none focus:border-blue-500 bg-white">
                {['All', 'Data Fiduciary', 'Significant Data Fiduciary', 'Both'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Grouped by Regulation → Chapter */}
          {REGULATIONS.filter(r => filterReg.length === 0 || filterReg.includes(r.id)).map(reg => {
            const regExpanded = expandedRegs.has(reg.id);
            return (
              <div key={reg.id} className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <button onClick={() => toggleReg(reg.id)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                  {regExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                  <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: `${reg.color}18` }}>
                    <Shield style={{ width: 14, height: 14, color: reg.color }} />
                  </div>
                  <div className="flex-1 text-left">
                    <span className="text-[13px] font-bold text-slate-800">{reg.name}</span>
                    <span className="text-[11px] text-slate-400 ml-2">· <span className="font-mono text-[10.5px] font-bold" style={{ color: reg.color }}>{reg.id}</span> · {reg.controls} controls · {reg.compliant}% compliant</span>
                  </div>
                </button>

                {regExpanded && Object.entries(CHAPTERS).map(([chapter, chapterControls]) => {
                  if (chapterControls.length === 0) return null;
                  const filtered = filteredControls(chapterControls);
                  if (filtered.length === 0) return null;
                  const chapterKey = `${reg.id}-${chapter}`;
                  const chExpanded = expandedChapters.has(chapterKey);
                  return (
                    <div key={chapter} className="border-t border-slate-100">
                      <button onClick={() => toggleChapter(chapterKey)} className="w-full flex items-center gap-3 px-6 py-2.5 hover:bg-slate-50 transition-colors">
                        {chExpanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                        <span className="text-[12px] font-semibold text-slate-700 flex-1 text-left">{chapter} ({filtered.length} controls)</span>
                      </button>
                      {chExpanded && filtered.map(ctrl => (
                        <div key={ctrl.id} className="border-t border-slate-50 mx-4 mb-2">
                          <div className="flex items-start gap-4 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-mono text-[10.5px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold flex-shrink-0">{ctrl.id}</span>
                                <p className="text-[12.5px] font-semibold text-slate-800 truncate">{ctrl.title}</p>
                              </div>
                              <p className="text-[11px] text-slate-500 mb-2 line-clamp-2">{ctrl.description}</p>
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1 text-[11px] text-slate-500">
                                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />3/4 Compliant
                                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 ml-1" />1/4 Non-Compliant
                                </div>
                                <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-medium">{ctrl.applicableTo === 'Data Fiduciary' ? 'DF' : ctrl.applicableTo === 'Significant Data Fiduciary' ? 'SDF' : 'Both'}</span>
                                <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded font-medium">{ctrl.linkedActions} actions</span>
                              </div>
                            </div>
                            <button onClick={() => navigate(`/org/controls/${ctrl.id}`)} className="flex items-center gap-1 px-2.5 py-1.5 text-[11.5px] font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors flex-shrink-0">
                              View <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* Custom Controls Tab */}
      {activeTab === 'Custom Controls' && (
        <div className="space-y-3">
          {customControls.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-lg py-16 text-center">
              <Shield className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-[14px] font-semibold text-slate-600">No custom controls yet.</p>
              <p className="text-[12px] text-slate-400 mt-1 mb-4">Create controls specific to your organization's compliance needs.</p>
              {canManage && <button onClick={() => setShowCustomForm(true)} className="px-4 py-2 bg-blue-600 text-white text-[13px] font-medium rounded-lg hover:bg-blue-700 transition-colors">+ Create Custom Control</button>}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-[12px]">
                <thead><tr className="border-b border-slate-100 bg-slate-50 text-slate-500 text-left">
                  {['Control ID', 'Title', 'Status', 'Applicable To', 'Actions'].map(h => <th key={h} className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide">{h}</th>)}
                </tr></thead>
                <tbody>
                  {customControls.map(c => (
                    <tr key={c.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10.5px] text-slate-700 bg-slate-100 px-2 py-0.5 rounded font-bold">{c.id}</span>
                          <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-bold">CUSTOM</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{c.title}</td>
                      <td className="px-4 py-3"><StatusChip status={c.status} /></td>
                      <td className="px-4 py-3 text-slate-500">{c.applicableTo}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          <button className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors border border-slate-200 rounded hover:border-blue-300"><Eye className="w-3.5 h-3.5" /></button>
                          {canManage && <>
                            <button className="p-1.5 text-slate-400 hover:text-amber-600 transition-colors border border-slate-200 rounded hover:border-amber-300"><Edit2 className="w-3.5 h-3.5" /></button>
                            <button className="p-1.5 text-slate-400 hover:text-red-500 transition-colors border border-slate-200 rounded hover:border-red-300"><Trash2 className="w-3.5 h-3.5" /></button>
                          </>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}