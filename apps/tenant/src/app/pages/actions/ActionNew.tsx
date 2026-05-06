import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { InputField, TextareaField, SelectField, Btn, PageHeader, InfoBanner } from '../../components/shared/DesignSystem';
import { ASSESSMENTS, ASSETS, CONTROLS } from '../../data/mockData';

export function ActionNewPage() {
  const navigate = useNavigate();
  const [assessment, setAssessment] = useState('');
  const [asset, setAsset] = useState('');
  const [control, setControl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('High');
  const [dueDate, setDueDate] = useState('');
  const [assignee, setAssignee] = useState('');
  const [instructions, setInstructions] = useState('');
  const [evidenceRequired, setEvidenceRequired] = useState('');

  const step1Complete = assessment && asset && control;

  const PRIORITIES = [
    { value: 'Critical', color: '#EF4444', bg: 'bg-red-50', border: 'border-red-300', desc: 'Requires immediate resolution. Legal risk or data breach.' },
    { value: 'High', color: '#F97316', bg: 'bg-orange-50', border: 'border-orange-300', desc: 'Significant compliance gap. Must resolve within current cycle.' },
    { value: 'Medium', color: '#F59E0B', bg: 'bg-amber-50', border: 'border-amber-300', desc: 'Notable gap. Target resolution in this assessment period.' },
    { value: 'Low', color: '#64748B', bg: 'bg-slate-50', border: 'border-slate-300', desc: 'Minor improvement. Best-effort within available resources.' },
  ];

  return (
    <div>
      <button onClick={() => navigate('/org/actions')} className="flex items-center gap-1.5 text-[13px] text-slate-500 hover:text-slate-800 mb-3">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Actions
      </button>
      <PageHeader title="Create Improvement Action" sub="Link this action to an assessment, asset, and control" />

      <div className="max-w-2xl space-y-4">
        {/* Section 1: Linkage */}
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <h2 className="text-[13px] font-semibold text-slate-800 mb-0.5">Section 1 — Linkage</h2>
          <p className="text-[11px] text-slate-400 mb-4">All three fields are required before continuing.</p>

          <div className="space-y-3">
            <SelectField
              label="Linked Assessment *"
              value={assessment}
              onChange={setAssessment}
              options={[
                { value: '', label: 'Select assessment...' },
                ...ASSESSMENTS.filter(a => a.status === 'Active').map(a => ({ value: a.id, label: a.name }))
              ]}
            />

            <SelectField
              label="Linked Asset *"
              value={asset}
              onChange={setAsset}
              options={[
                { value: '', label: assessment ? 'Select asset...' : 'Select assessment first' },
                ...ASSETS.map(a => ({ value: a.id, label: a.name }))
              ]}
            />

            {asset && !ASSESSMENTS.find(a => a.id === assessment)?.assets.includes(asset) && asset !== '' && (
              <InfoBanner variant="warning">
                This asset is not in scope for the selected assessment. Add it to the assessment first.{' '}
                <button className="underline font-medium" onClick={() => navigate(`/org/assessments/${assessment}`)}>
                  Go to Assessment →
                </button>
              </InfoBanner>
            )}

            <SelectField
              label="Linked Control *"
              value={control}
              onChange={setControl}
              options={[
                { value: '', label: asset ? 'Select control...' : 'Select asset first' },
                ...CONTROLS.map(c => ({ value: c.id, label: `${c.id} — ${c.title}` }))
              ]}
            />
          </div>
        </div>

        {/* Section 2: Action Details */}
        <div className={`bg-white border border-slate-200 rounded-lg p-5 ${!step1Complete ? 'opacity-50 pointer-events-none' : ''}`}>
          <h2 className="text-[13px] font-semibold text-slate-800 mb-4">Section 2 — Action Details</h2>
          <div className="space-y-3">
            <InputField label="Action Title *" placeholder="Brief, actionable title for this improvement task" value={title} onChange={setTitle} />
            <TextareaField label="Description *" placeholder="Detailed description of what needs to be done and why..." value={description} onChange={setDescription} rows={3} />

            <div>
              <label className="block text-[12px] font-medium text-slate-600 mb-2">Priority *</label>
              <div className="grid grid-cols-2 gap-2">
                {PRIORITIES.map(p => (
                  <button key={p.value} onClick={() => setPriority(p.value)}
                    className={`flex items-start gap-2 p-3 rounded-lg border text-left transition-all
                      ${priority === p.value ? `${p.bg} ${p.border}` : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5" style={{ background: p.color }} />
                    <div>
                      <p className="text-[12px] font-semibold text-slate-800">{p.value}</p>
                      <p className="text-[11px] text-slate-400">{p.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <InputField label="Due Date *" type="date" value={dueDate} onChange={setDueDate} />
              <SelectField
                label="Assigned To *"
                value={assignee}
                onChange={setAssignee}
                options={[
                  { value: '', label: 'Select IT Admin...' },
                  { value: 'Manish Kumar', label: 'Manish Kumar (IT Admin)' },
                ]}
              />
            </div>
          </div>
        </div>

        {/* Section 3: Guidance */}
        <div className={`bg-white border border-slate-200 rounded-lg p-5 ${!step1Complete ? 'opacity-50 pointer-events-none' : ''}`}>
          <h2 className="text-[13px] font-semibold text-slate-800 mb-0.5">Section 3 — Guidance for IT Admin</h2>
          <p className="text-[11px] text-slate-400 mb-4">Optional but highly recommended.</p>
          <div className="space-y-3">
            <TextareaField
              label="Instructions for IT Admin"
              placeholder="What specifically should they do? Step-by-step guidance..."
              value={instructions}
              onChange={setInstructions}
              rows={3}
            />
            <TextareaField
              label="Evidence Requirements"
              placeholder="What proof should they upload? Be specific about format and content..."
              value={evidenceRequired}
              onChange={setEvidenceRequired}
              rows={3}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <Btn variant="ghost" onClick={() => navigate('/org/actions')}>Cancel</Btn>
          <Btn onClick={() => navigate('/org/actions')}>Create Action</Btn>
        </div>
      </div>
    </div>
  );
}
