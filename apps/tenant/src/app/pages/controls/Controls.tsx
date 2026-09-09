import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Shield, Plus, X, Trash2, ChevronRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useListControls, useCreateCustomControl, Control } from '../../../hooks/useControls';
import { useAvailableRegulations } from '../../../hooks/useAssessments';
import {
  PageHeader, Btn, TabNav, StatusChip, DataTable, TR, TD, MonoBadge,
  SearchInput, SelectField, InputField, TextareaField, EmptyState,
} from '../../components/shared/DesignSystem';

const APPLICABLE_LABELS: Record<string, string> = {
  DATA_FIDUCIARY: 'Data Fiduciary',
  SIGNIFICANT_DF: 'Significant DF',
  BOTH: 'Both',
};

const STATUS_LABELS: Record<string, string> = { DRAFT: 'Draft', PUBLISHED: 'Published' };

const EVIDENCE_TYPE_OPTIONS = [
  { value: 'FILE', label: 'File' },
  { value: 'SCREENSHOT', label: 'Screenshot' },
  { value: 'CONFIG', label: 'Configuration Export' },
  { value: 'DOCUMENT', label: 'Document' },
  { value: 'LINK', label: 'External Link' },
  { value: 'TEXT_NOTE', label: 'Text Note' },
  { value: 'LOG', label: 'Log' },
];

const PRIORITY_OPTIONS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

type ActionEntry = { id: string; title: string; desc: string; evidenceTypes: string[]; dueDays: number; priority: string };

function CustomControlForm({ onClose }: { onClose: () => void }) {
  const { data: regulations = [] } = useAvailableRegulations();
  const createControl = useCreateCustomControl();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [regulationId, setRegulationId] = useState('');
  const [chapterId, setChapterId] = useState('');
  const [applicableTo, setApplicableTo] = useState<'DATA_FIDUCIARY' | 'SIGNIFICANT_DF' | 'BOTH'>('BOTH');
  const [actions, setActions] = useState<ActionEntry[]>([
    { id: '1', title: '', desc: '', evidenceTypes: [], dueDays: 30, priority: 'HIGH' },
  ]);
  const [saving, setSaving] = useState(false);

  const selectedRegulation = regulations.find((r: any) => r.id === regulationId);
  const chapters = selectedRegulation?.chapters ?? [];

  const addAction = () => setActions(p => [...p, { id: String(Date.now()), title: '', desc: '', evidenceTypes: [], dueDays: 30, priority: 'HIGH' }]);
  const upAction = (id: string, k: string, v: any) => setActions(p => p.map(a => a.id === id ? { ...a, [k]: v } : a));

  const canSave = title.trim().length >= 5 && description.trim().length >= 5
    && actions.every(a => a.title.trim() && a.desc.trim() && a.evidenceTypes.length > 0);

  const handleSave = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      await createControl.mutateAsync({
        title, description, applicableTo,
        regulationMappings: regulationId ? [{ regulationId, chapterId: chapterId || undefined }] : undefined,
        predefinedActions: actions.map(a => ({
          title: a.title, description: a.desc, evidenceTypes: a.evidenceTypes,
          suggestedDueDays: a.dueDays, priority: a.priority,
        })),
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-end z-50" onClick={onClose}>
      <div className="w-[860px] max-w-full h-full bg-white border-l border-[#D4AF37]/35 overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#D4AF37]/35 sticky top-0 bg-white z-10">
          <p className="text-[17px] font-bold text-slate-900">Create Custom Control</p>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400 hover:text-slate-700" /></button>
        </div>
        <div className="p-5 space-y-5">
          <div className="space-y-4">
            <p className="text-[13px] font-bold text-slate-400 uppercase tracking-widest">Control Details</p>
            <InputField label="Control Title *" value={title} onChange={setTitle} placeholder="e.g., Implement valid consent mechanism" />
            <TextareaField label="Description *" value={description} onChange={setDescription} rows={3}
              placeholder="Full description of what this control requires and why it is necessary." />
            <div className="grid grid-cols-2 gap-4">
              <SelectField label="Regulation (optional)" value={regulationId}
                onChange={v => { setRegulationId(v); setChapterId(''); }}
                options={[{ value: '', label: 'No regulation — internal control' }, ...regulations.map((r: any) => ({ value: r.id, label: `${r.shortCode} — ${r.name}` }))]} />
              <SelectField label="Chapter" value={chapterId} onChange={setChapterId}
                options={[{ value: '', label: regulationId ? 'Select chapter…' : 'Select a regulation first' }, ...chapters.map((c: any) => ({ value: c.id, label: c.title ?? c.name }))]} />
            </div>
            <div>
              <label className="block text-[13.5px] font-medium text-slate-700 mb-2">Applicable To *</label>
              <div className="flex gap-3 pt-1">
                {(['DATA_FIDUCIARY', 'SIGNIFICANT_DF', 'BOTH'] as const).map(v => (
                  <label key={v} className="flex items-center gap-1.5 cursor-pointer text-[14px] text-slate-700">
                    <input type="radio" name="applicable" checked={applicableTo === v} onChange={() => setApplicableTo(v)} className="accent-[#1A3E5C]" />
                    {APPLICABLE_LABELS[v]}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#D4AF37]/35 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[14.5px] font-bold text-slate-800">Pre-defined Actions</p>
                <p className="text-[13px] text-slate-400">Actions that will automatically be created when this control is added to an assessment. At least one is required.</p>
              </div>
              <button onClick={addAction} className="flex items-center gap-1.5 px-3 py-1.5 text-[14px] font-medium text-[#1A3E5C] border border-[#D4AF37]/40 rounded-lg hover:bg-[#1A3E5C]/8 transition-colors">
                <Plus className="w-3.5 h-3.5" /> Add Action
              </button>
            </div>
            {actions.map((action, idx) => (
              <div key={action.id} className="p-4 border border-[#D4AF37]/35 rounded-lg bg-slate-50 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[13.5px] font-bold text-slate-600">Action {idx + 1}</p>
                  {actions.length > 1 && <button onClick={() => setActions(p => p.filter(a => a.id !== action.id))} className="text-[13px] text-red-500 hover:text-red-700 flex items-center gap-1"><Trash2 className="w-3 h-3" /> Remove</button>}
                </div>
                <input value={action.title} onChange={e => upAction(action.id, 'title', e.target.value)} placeholder="Action Title *"
                  className="w-full h-9 px-3 rounded-md border border-slate-300 text-[14.5px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#1A3E5C] bg-white" />
                <textarea rows={2} value={action.desc} onChange={e => upAction(action.id, 'desc', e.target.value)} placeholder="Detailed steps for the IT Admin to complete this action"
                  className="w-full px-3 py-2 rounded-md border border-slate-300 text-[14px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#1A3E5C] resize-none bg-white" />
                <div>
                  <p className="text-[13px] font-medium text-slate-600 mb-1.5">Expected Evidence Type *</p>
                  <div className="flex flex-wrap gap-1.5">
                    {EVIDENCE_TYPE_OPTIONS.map(t => (
                      <button key={t.value} onClick={() => upAction(action.id, 'evidenceTypes', action.evidenceTypes.includes(t.value) ? action.evidenceTypes.filter((e: string) => e !== t.value) : [...action.evidenceTypes, t.value])}
                        className={`px-2 py-0.5 rounded text-[12.5px] font-medium border transition-all ${action.evidenceTypes.includes(t.value) ? 'bg-[#1A3E5C] text-white border-[#1A3E5C]' : 'border-[#D4AF37]/35 text-slate-600 hover:border-[#1A3E5C]/30 bg-white'}`}>{t.label}</button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[13px] font-medium text-slate-600 mb-1">Suggested Due Days *</p>
                    <div className="flex items-center gap-2">
                      <input type="number" value={action.dueDays} onChange={e => upAction(action.id, 'dueDays', Number(e.target.value))} min={1} max={365}
                        className="w-20 h-8 px-3 rounded-md border border-slate-300 text-[14.5px] text-slate-900 focus:outline-none focus:border-[#1A3E5C] bg-white" />
                      <span className="text-[14px] text-slate-500">days from assignment date</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-slate-600 mb-1">Priority *</p>
                    <div className="flex gap-2">
                      {PRIORITY_OPTIONS.map(p => (
                        <button key={p} onClick={() => upAction(action.id, 'priority', p)}
                          className={`px-2.5 py-1 rounded text-[12.5px] font-medium border transition-all ${action.priority === p ? 'bg-[#1A3E5C] text-white border-[#1A3E5C]' : 'border-[#D4AF37]/35 text-slate-600 hover:border-[#1A3E5C]/30 bg-white'}`}>{p.charAt(0) + p.slice(1).toLowerCase()}</button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 pt-3 border-t border-[#D4AF37]/35">
            <button onClick={onClose} className="px-4 py-2 border border-slate-300 text-[15px] text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
            <button onClick={handleSave} disabled={!canSave || saving}
              className="flex-1 py-2 bg-[#1A3E5C] hover:bg-[#15324a] disabled:opacity-50 text-white text-[15px] font-semibold rounded-lg transition-colors">
              {saving ? 'Saving…' : 'Save Control →'}
            </button>
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
  const [filterRegulation, setFilterRegulation] = useState('All');
  const [filterApplicable, setFilterApplicable] = useState('All');
  const [showCustomForm, setShowCustomForm] = useState(false);
  const canManage = role === 'ceo' || role === 'co';

  const { data: controls = [], isLoading } = useListControls();

  const platformControls = useMemo(() => controls.filter(c => !c.isCustom), [controls]);
  const customControls = useMemo(() => controls.filter(c => c.isCustom), [controls]);

  const regulationOptions = useMemo(() => {
    const seen = new Map<string, string>();
    platformControls.forEach(c => c.regulationMappings.forEach(m => seen.set(m.regulation.shortCode, m.regulation.shortCode)));
    return Array.from(seen.keys());
  }, [platformControls]);

  const filteredPlatform = useMemo(() => platformControls.filter(c => {
    const matchSearch = search === '' || c.title.toLowerCase().includes(search.toLowerCase());
    const matchReg = filterRegulation === 'All' || c.regulationMappings.some(m => m.regulation.shortCode === filterRegulation);
    const matchApplicable = filterApplicable === 'All' || c.applicableTo === filterApplicable;
    return matchSearch && matchReg && matchApplicable;
  }), [platformControls, search, filterRegulation, filterApplicable]);

  function RegulationCell({ control }: { control: Control }) {
    if (control.regulationMappings.length === 0) return <span className="text-slate-400">Internal / unmapped</span>;
    const first = control.regulationMappings[0];
    return (
      <span>
        <span className="font-mono text-[12.5px] font-bold text-[#1A3E5C]">{first.regulation.shortCode}</span>
        {first.chapter && <span className="text-slate-400"> · {first.chapter.title ?? first.chapter.name}</span>}
        {control.regulationMappings.length > 1 && <span className="text-slate-400"> +{control.regulationMappings.length - 1} more</span>}
      </span>
    );
  }

  return (
    <div className="space-y-4">
      {showCustomForm && <CustomControlForm onClose={() => setShowCustomForm(false)} />}

      <PageHeader
        title="Controls Library"
        sub="Platform controls are defined by the compliance team. You can create custom controls for your organization."
        actions={activeTab === 'Custom Controls' && canManage ? (
          <Btn onClick={() => setShowCustomForm(true)} icon={<Plus className="w-4 h-4" />}>Create Custom Control</Btn>
        ) : undefined}
      />

      <TabNav tabs={['Platform Controls', 'Custom Controls']} active={activeTab} onChange={setActiveTab} />

      {activeTab === 'Platform Controls' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <SearchInput placeholder="Search controls by title..." value={search} onChange={setSearch} />
            <SelectField value={filterRegulation} onChange={setFilterRegulation}
              options={[{ value: 'All', label: 'All Regulations' }, ...regulationOptions.map(r => ({ value: r, label: r }))]} className="w-44" />
            <SelectField value={filterApplicable} onChange={setFilterApplicable}
              options={[{ value: 'All', label: 'All — Applicable To' }, ...Object.entries(APPLICABLE_LABELS).map(([value, label]) => ({ value, label }))]} className="w-52" />
          </div>

          {isLoading ? (
            <div className="text-center py-16 text-slate-500">Loading controls...</div>
          ) : filteredPlatform.length === 0 ? (
            <EmptyState icon={<Shield className="w-10 h-10" />} title="No controls found" description="Try adjusting your search or filters." />
          ) : (
            <DataTable headers={['Control', 'Regulation / Chapter', 'Applicable To', 'Actions', '']}>
              {filteredPlatform.map(ctrl => (
                <TR key={ctrl.id} onClick={() => navigate(`/org/controls/${ctrl.id}`)}>
                  <TD>
                    <p className="font-semibold text-slate-800">{ctrl.title}</p>
                    <p className="text-[13px] text-slate-400 line-clamp-1 mt-0.5">{ctrl.description}</p>
                  </TD>
                  <TD><RegulationCell control={ctrl} /></TD>
                  <TD>
                    <span className="text-[12px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-medium">{APPLICABLE_LABELS[ctrl.applicableTo]}</span>
                  </TD>
                  <TD>
                    <span className="text-[12px] px-1.5 py-0.5 bg-[#1A3E5C]/8 text-[#1A3E5C] rounded font-medium">{ctrl.predefinedActions.length} actions</span>
                  </TD>
                  <TD>
                    <span className="flex items-center gap-1 text-[13.5px] font-medium text-[#1A3E5C]">View <ChevronRight className="w-3 h-3" /></span>
                  </TD>
                </TR>
              ))}
            </DataTable>
          )}
        </div>
      )}

      {activeTab === 'Custom Controls' && (
        <div className="space-y-3">
          {isLoading ? (
            <div className="text-center py-16 text-slate-500">Loading controls...</div>
          ) : customControls.length === 0 ? (
            <EmptyState icon={<Shield className="w-10 h-10" />} title="No custom controls yet"
              description="Create controls specific to your organization's compliance needs."
              action={canManage ? <Btn onClick={() => setShowCustomForm(true)} icon={<Plus className="w-4 h-4" />}>Create Custom Control</Btn> : undefined} />
          ) : (
            <DataTable headers={['Control ID', 'Title', 'Status', 'Applicable To', '']}>
              {customControls.map(c => (
                <TR key={c.id} onClick={() => navigate(`/org/controls/${c.id}`)}>
                  <TD>
                    <div className="flex items-center gap-2">
                      <MonoBadge>{c.id.slice(0, 8)}</MonoBadge>
                      <span className="text-[12px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-bold">CUSTOM</span>
                    </div>
                  </TD>
                  <TD className="font-semibold text-slate-800">{c.title}</TD>
                  <TD><StatusChip status={STATUS_LABELS[c.status]} /></TD>
                  <TD>{APPLICABLE_LABELS[c.applicableTo]}</TD>
                  <TD>
                    <span className="flex items-center gap-1 text-[13.5px] font-medium text-[#1A3E5C]">View <ChevronRight className="w-3 h-3" /></span>
                  </TD>
                </TR>
              ))}
            </DataTable>
          )}
        </div>
      )}
    </div>
  );
}
