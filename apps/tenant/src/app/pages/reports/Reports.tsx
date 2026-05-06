import React, { useState } from 'react';
import {
  BarChart2, Database, AlertTriangle, Building2, Shield, ClipboardList,
  Lock, Zap, XCircle, FileText, Users, Plus, Download, X, Check, ChevronRight
} from 'lucide-react';

const REPORT_TYPES = [
  { id: 'overall', icon: BarChart2, name: 'Overall Compliance Report', desc: 'Org-wide score, breakdown by regulation, department, and asset', color: '#3B82F6' },
  { id: 'asset', icon: Database, name: 'Asset Compliance Report', desc: 'Per-asset compliance status with full action and evidence history', color: '#10B981' },
  { id: 'risk', icon: AlertTriangle, name: 'Risk Analysis Report', desc: 'Full risk register with scores per asset, department, and regulation', color: '#EF4444' },
  { id: 'dept', icon: Building2, name: 'Department Compliance Report', desc: 'Per-department breakdown across all active regulations', color: '#8B5CF6' },
  { id: 'regulation', icon: Shield, name: 'Regulation Coverage Report', desc: 'Which regulations are covered, gaps in compliance coverage', color: '#06B6D4' },
  { id: 'assessment', icon: ClipboardList, name: 'Assessment Report', desc: 'Full detail of a specific assessment including all tasks and evidence', color: '#F97316' },
  { id: 'control', icon: Lock, name: 'Control Status Report', desc: 'Status of all controls per asset, grouped by regulation and chapter', color: '#64748b' },
  { id: 'tasks', icon: Zap, name: 'Compliance Tasks Report', desc: 'All tasks with asset context, status, assignee, due dates, resolution history', color: '#F59E0B' },
  { id: 'gap', icon: XCircle, name: 'Gap Analysis Report', desc: 'All identified gaps per asset with risk scores and resolution status', color: '#EF4444' },
  { id: 'evidence', icon: FileText, name: 'Evidence Audit Report', desc: 'Full evidence log with asset reference and approval status per item', color: '#10B981' },
  { id: 'user_activity', icon: Users, name: 'User Activity Report', desc: 'Actions taken by each user, Entra ID vs manual users shown separately', color: '#8B5CF6' },
];

const RECENT_REPORTS = [
  { name: 'Q1 2025 Overall Compliance Report', type: 'overall', typeName: 'Overall Compliance', generated: 'Priya Sharma', date: 'Apr 22, 2025', period: 'Jan 1 – Mar 31, 2025', filters: 'All departments · All regulations' },
  { name: 'Engineering Asset Compliance', type: 'asset', typeName: 'Asset Compliance', generated: 'Priya Sharma', date: 'Apr 18, 2025', period: 'Q1 2025', filters: 'Dept: Engineering · Status: All' },
  { name: 'Risk Analysis — Finance Dept', type: 'risk', typeName: 'Risk Analysis', generated: 'Amit Rao', date: 'Apr 15, 2025', period: 'Current', filters: 'Dept: Finance · Risk: High + Critical + Severe' },
  { name: 'DPDP Regulation Coverage Review', type: 'regulation', typeName: 'Regulation Coverage', generated: 'Priya Sharma', date: 'Apr 10, 2025', period: 'Jan – Apr 2025', filters: 'Regulation: DPDP' },
];

const TYPE_COLORS: Record<string, string> = Object.fromEntries(REPORT_TYPES.map(r => [r.id, r.color]));
const TYPE_NAMES: Record<string, string> = Object.fromEntries(REPORT_TYPES.map(r => [r.id, (r as any).typeName || r.name]));

// ─── Generate Report Wizard ───────────────────────────────────────────────────
function GenerateWizard({ onClose, initialType }: { onClose: () => void, initialType?: string }) {
  const [step, setStep] = useState(initialType ? 2 : 1);
  const [selectedType, setSelectedType] = useState(initialType || '');
  const [selectedRegulations, setSelectedRegulations] = useState<string[]>(['DPDP', 'RBI', 'SEBI']);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);

  const toggleRegulation = (r: string) => {
    setSelectedRegulations(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]);
  };

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => { setGenerating(false); setGenerated(true); }, 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <p className="text-[15px] font-bold text-slate-900">Generate Report</p>
            <div className="flex items-center gap-2 mt-1">
              {['Select Type', 'Configure', 'Preview & Generate'].map((s, i) => (
                <React.Fragment key={s}>
                  <span className={`text-[11px] font-medium ${step === i + 1 ? 'text-blue-600' : step > i + 1 ? 'text-green-600' : 'text-slate-400'}`}>
                    {step > i + 1 ? <span className="inline-flex items-center gap-1"><Check className="w-3 h-3" />{s}</span> : `${i + 1}. ${s}`}
                  </span>
                  {i < 2 && <ChevronRight className="w-3 h-3 text-slate-300" />}
                </React.Fragment>
              ))}
            </div>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400 hover:text-slate-700" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Select Type */}
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-[12px] text-slate-500 mb-4">Select the type of report you want to generate.</p>
              <div className="grid grid-cols-3 gap-3">
                {REPORT_TYPES.map(rt => {
                  const Icon = rt.icon;
                  const isSelected = selectedType === rt.id;
                  return (
                    <button key={rt.id} onClick={() => setSelectedType(rt.id)}
                      className={`p-4 rounded-lg border-2 text-left transition-all hover:shadow-sm ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-300'}`}>
                      <div className="w-8 h-8 rounded-lg mb-2.5 flex items-center justify-center" style={{ background: `${rt.color}18` }}>
                        <Icon style={{ width: 16, height: 16, color: rt.color }} />
                      </div>
                      <p className="text-[12.5px] font-semibold text-slate-800 mb-1">{rt.name}</p>
                      <p className="text-[11px] text-slate-500 leading-relaxed">{rt.desc}</p>
                      {isSelected && <div className="mt-2 flex items-center gap-1 text-[10.5px] text-blue-600 font-semibold"><Check className="w-3 h-3" /> Selected</div>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Configure */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <p className="text-[14px] font-bold text-slate-900">Configure {REPORT_TYPES.find(r => r.id === selectedType)?.name}</p>
                <p className="text-[12px] text-slate-400">Set filters to scope your report.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11.5px] font-medium text-slate-700 mb-1">Date Range <span className="text-red-500">*</span></label>
                  <div className="flex gap-2">
                    <input type="date" defaultValue="2025-01-01" className="flex-1 h-9 px-3 rounded-lg border border-slate-300 text-[12.5px] text-slate-900 focus:outline-none focus:border-blue-500" />
                    <span className="text-slate-400 self-center">–</span>
                    <input type="date" defaultValue="2025-03-31" className="flex-1 h-9 px-3 rounded-lg border border-slate-300 text-[12.5px] text-slate-900 focus:outline-none focus:border-blue-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-[11.5px] font-medium text-slate-700 mb-1">Regulation</label>
                  <div className="flex gap-2 flex-wrap">
                    {['DPDP', 'RBI', 'SEBI'].map(r => {
                      const isActive = selectedRegulations.includes(r);
                      return (
                        <button 
                          key={r} 
                          onClick={() => toggleRegulation(r)}
                          className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all border ${isActive ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400'}`}
                        >
                          {r} {isActive && '✓'}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className="block text-[11.5px] font-medium text-slate-700 mb-1">Department</label>
                  <div className="h-32 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-1 bg-white">
                    {['All Departments', 'Engineering', 'Finance', 'HR', 'Marketing', 'Sales'].map((d, i) => (
                      <label key={d} className="flex items-center gap-2 px-2 py-1.5 cursor-pointer text-[12px] text-slate-700 hover:bg-slate-50 rounded transition-colors">
                        <input type="checkbox" defaultChecked={i === 0 || i === 1} className="accent-blue-600 w-3.5 h-3.5" /> 
                        <span className={i === 0 ? 'font-medium' : ''}>{d}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[11.5px] font-medium text-slate-700 mb-1">Compliance Status</label>
                  <div className="space-y-1.5">
                    {['Compliant', 'In Progress', 'Non-Compliant', 'Not Started'].map(s => (
                      <label key={s} className="flex items-center gap-2 cursor-pointer text-[12px] text-slate-700">
                        <input type="checkbox" defaultChecked className="accent-blue-600 w-3.5 h-3.5" /> {s}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[11.5px] font-medium text-slate-700 mb-1">Risk Level</label>
                  <div className="space-y-1.5">
                    {['Low', 'Moderate', 'High', 'Critical', 'Severe'].map(s => (
                      <label key={s} className="flex items-center gap-2 cursor-pointer text-[12px] text-slate-700">
                        <input type="checkbox" defaultChecked className="accent-blue-600 w-3.5 h-3.5" /> {s}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[11.5px] font-medium text-slate-700 mb-2">Export Format <span className="text-red-500">*</span></label>
                  <div className="space-y-2">
                    {['PDF only', 'Excel only', 'Both PDF and Excel'].map((f, i) => (
                      <label key={f} className="flex items-center gap-2 cursor-pointer text-[12px] text-slate-700">
                        <input type="radio" name="format" defaultChecked={i === 2} className="accent-blue-600" /> {f}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Preview & Generate */}
          {step === 3 && !generating && !generated && (
            <div className="space-y-5">
              <div>
                <p className="text-[14px] font-bold text-slate-900">Preview and Generate</p>
                <p className="text-[12px] text-slate-400">Review your configuration before generating.</p>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-[12.5px]">
                {[
                  ['Report Type', REPORT_TYPES.find(r => r.id === selectedType)?.name],
                  ['Date Range', 'Jan 1, 2025 – Mar 31, 2025'],
                  ['Regulations', 'DPDP, RBI, SEBI'],
                  ['Departments', 'All Departments'],
                  ['Compliance Status', 'All statuses'],
                  ['Risk Level', 'All levels'],
                  ['Export Format', 'PDF + Excel'],
                ].map(([k, v]) => (
                  <div key={k} className="flex gap-4">
                    <span className="text-slate-400 w-32 flex-shrink-0">{k}</span>
                    <span className="text-slate-800 font-medium">{v}</span>
                  </div>
                ))}
              </div>
              <div className="p-4 bg-white border border-slate-200 rounded-lg">
                <p className="text-[12px] font-semibold text-slate-700 mb-2">Sections to be included:</p>
                <ul className="space-y-1.5">
                  {['Executive Summary', 'Compliance Score by Regulation', 'Department Compliance Breakdown', 'Asset-level Compliance Status', 'Open Tasks Summary', 'Risk Score Overview', 'Recommendations'].map(s => (
                    <li key={s} className="flex items-center gap-2 text-[12px] text-slate-600"><Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />{s}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {generating && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-[14px] font-semibold text-slate-700">Generating your report...</p>
              <p className="text-[12px] text-slate-400 mt-1">This may take a few seconds</p>
            </div>
          )}

          {generated && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Check className="w-9 h-9 text-green-600" />
              </div>
              <p className="text-[18px] font-bold text-slate-900 mb-1">Report generated successfully</p>
              <p className="text-[12px] text-slate-400 mb-6">Your report has been saved to Reports History.</p>
              <div className="flex gap-3">
                <button className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white text-[13px] font-semibold rounded-lg hover:bg-red-700 transition-colors">
                  <Download className="w-4 h-4" /> Download PDF
                </button>
                <button className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white text-[13px] font-semibold rounded-lg hover:bg-green-700 transition-colors">
                  <Download className="w-4 h-4" /> Download Excel
                </button>
              </div>
              <div className="flex gap-3 mt-4">
                <button onClick={() => { setStep(1); setSelectedType(''); setGenerated(false); }} className="text-[12px] text-blue-600 hover:text-blue-700 font-medium">← Generate Another</button>
                <span className="text-slate-300">·</span>
                <button onClick={onClose} className="text-[12px] text-slate-500 hover:text-slate-700 font-medium">Done</button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!generating && !generated && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
            <button onClick={() => step > 1 ? setStep(step - 1) : onClose} className="px-4 py-2 border border-slate-300 text-[13px] text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
              {step === 1 ? 'Cancel' : '← Back'}
            </button>
            {step < 3 ? (
              <button disabled={step === 1 && !selectedType} onClick={() => setStep(step + 1)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-[13px] font-semibold rounded-lg transition-colors">
                {step === 1 ? 'Next: Configure →' : 'Preview and Generate →'}
              </button>
            ) : (
              <button onClick={handleGenerate} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-semibold rounded-lg transition-colors">
                Generate Report →
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function ReportsPage() {
  const [wizardConfig, setWizardConfig] = useState<{ open: boolean, type?: string }>({ open: false });

  return (
    <div className="space-y-5">
      {wizardConfig.open && <GenerateWizard onClose={() => setWizardConfig({ open: false })} initialType={wizardConfig.type} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-bold text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>Reports</h1>
          <p className="text-[12px] text-slate-400 mt-0.5">Generate and download compliance reports</p>
        </div>
        <button onClick={() => setWizardConfig({ open: true })} className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-medium rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> Generate Report
        </button>
      </div>

      {/* Report Types */}
      <div>
        <p className="text-[13px] font-semibold text-slate-800 mb-3" style={{ fontFamily: 'Sora, sans-serif' }}>Report Types</p>
        <div className="grid grid-cols-4 gap-3">
          {REPORT_TYPES.map(rt => {
            const Icon = rt.icon;
            return (
              <button key={rt.id} onClick={() => setWizardConfig({ open: true, type: rt.id })}
                className="p-4 bg-white border border-slate-200 rounded-lg text-left hover:border-blue-300 hover:shadow-sm transition-all group">
                <div className="w-8 h-8 rounded-lg mb-3 flex items-center justify-center transition-colors" style={{ background: `${rt.color}18` }}>
                  <Icon style={{ width: 16, height: 16, color: rt.color }} />
                </div>
                <p className="text-[12.5px] font-semibold text-slate-800 mb-1 group-hover:text-blue-700 transition-colors">{rt.name}</p>
                <p className="text-[11px] text-slate-500 leading-relaxed">{rt.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent Reports */}
      <div>
        <p className="text-[13px] font-semibold text-slate-800 mb-3" style={{ fontFamily: 'Sora, sans-serif' }}>Recent Reports</p>
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 text-left">
                {['Report Name', 'Type', 'Generated By', 'Date', 'Period', 'Filters Applied', 'Downloads'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {RECENT_REPORTS.map((r, i) => (
                <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-800">{r.name}</td>
                  <td className="px-4 py-3">
                    <span className="text-[10.5px] px-2 py-0.5 rounded font-semibold" style={{ background: `${TYPE_COLORS[r.type]}18`, color: TYPE_COLORS[r.type] }}>
                      {r.typeName}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{r.generated}</td>
                  <td className="px-4 py-3 text-slate-500">{r.date}</td>
                  <td className="px-4 py-3 text-slate-500">{r.period}</td>
                  <td className="px-4 py-3 text-slate-400 max-w-[180px]"><p className="truncate">{r.filters}</p></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      <button className="flex items-center gap-1 px-2 py-1 border border-red-200 text-red-600 rounded hover:bg-red-50 transition-colors text-[10.5px] font-medium">
                        <Download className="w-3 h-3" /> PDF
                      </button>
                      <button className="flex items-center gap-1 px-2 py-1 border border-green-200 text-green-600 rounded hover:bg-green-50 transition-colors text-[10.5px] font-medium">
                        <Download className="w-3 h-3" /> XLS
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}