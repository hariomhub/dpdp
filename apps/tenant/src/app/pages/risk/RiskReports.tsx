import React, { useState } from 'react';
import { FileText, Download, ChevronRight, Check, X } from 'lucide-react';

const REPORT_TYPES = [
  { id: 'overall', name: 'Overall Risk Report', desc: 'Org-wide risk score, trend analysis, and top risk drivers across all departments and assets.', icon: '🏢' },
  { id: 'department', name: 'Department Risk Report', desc: 'Risk breakdown per department with asset-level details and control compliance per regulation.', icon: '🏗️' },
  { id: 'asset', name: 'Asset Risk Report', desc: 'Risk score per asset with contributing factors, non-compliant controls, and open actions.', icon: '🗄️' },
  { id: 'regulation', name: 'Regulation Risk Report', desc: 'Risk score per regulation across the organization with control-level breakdown.', icon: '📋' },
  { id: 'trend', name: 'Risk Trend Report', desc: 'How risk has changed over time with event markers for key assessment milestones.', icon: '📈' },
];

const DEPTS = ['Engineering', 'Finance', 'HR', 'Marketing', 'Sales'];
const REGS = ['DPDP Act 2023', 'RBI Data Localisation', 'SEBI Cybersecurity'];
const ASSETS = ['Customer Database', 'Payment Gateway', 'AWS Cloud Infrastructure', 'HR Management System', 'CRM Portal', 'Consent Banner'];
const RISK_LEVELS = ['Low', 'Moderate', 'High', 'Critical', 'Severe'];

const HISTORY = [
  { id: 'RR-001', name: 'Overall Risk Report — Q1 2025', type: 'Overall Risk', generatedBy: 'Priya Sharma', date: '2025-04-15', filters: 'All depts · All regulations · Last 90 days' },
  { id: 'RR-002', name: 'Engineering Department Risk Report', type: 'Department Risk', generatedBy: 'Amit Rao', date: '2025-04-10', filters: 'Engineering · DPDP · Last 30 days' },
  { id: 'RR-003', name: 'Risk Trend Report — Finance Q1', type: 'Risk Trend', generatedBy: 'Priya Sharma', date: '2025-04-02', filters: 'Finance · All regulations · Jan–Mar 2025' },
];

export function RiskReportsPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    dateFrom: '', dateTo: '', depts: [] as string[], regs: [] as string[],
    assets: [] as string[], riskLevels: [] as string[], format: 'PDF' as 'PDF' | 'Excel' | 'Both',
  });
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);

  const toggleArr = (arr: string[], val: string): string[] =>
    arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val];

  const upF = (k: string, v: any) => setFilters(p => ({ ...p, [k]: v }));

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => { setGenerating(false); setGenerated(true); }, 2000);
  };

  const selType = REPORT_TYPES.find(r => r.id === selectedType);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[20px] font-bold text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>Risk Reports</h1>
        <p className="text-[12px] text-slate-400 mt-0.5">Generate risk-focused reports for leadership and compliance reviews</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-3">
        {[{ n: 1, label: 'Select Report Type' }, { n: 2, label: 'Configure Filters' }, { n: 3, label: 'Preview & Generate' }].map((s, i) => (
          <React.Fragment key={s.n}>
            <div className={`flex items-center gap-2 text-[12px] font-medium ${step === s.n ? 'text-blue-700' : step > s.n ? 'text-green-600' : 'text-slate-400'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${step === s.n ? 'bg-blue-600 text-white' : step > s.n ? 'bg-green-500 text-white' : 'border-2 border-slate-200 text-slate-400'}`}>
                {step > s.n ? <Check className="w-3.5 h-3.5" /> : s.n}
              </div>
              {s.label}
            </div>
            {i < 2 && <div className="h-px flex-1 bg-slate-200" />}
          </React.Fragment>
        ))}
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <div className="space-y-3">
          <p className="text-[12.5px] text-slate-600">Choose the type of risk report you want to generate.</p>
          <div className="grid grid-cols-1 gap-3">
            {REPORT_TYPES.map(rt => (
              <button key={rt.id} onClick={() => setSelectedType(rt.id)}
                className={`flex items-start gap-4 p-4 rounded-lg border-2 text-left transition-all ${selectedType === rt.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-300 bg-white'}`}>
                <span className="text-2xl flex-shrink-0">{rt.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-bold text-slate-900">{rt.name}</p>
                    {selectedType === rt.id && <Check className="w-4 h-4 text-blue-600" />}
                  </div>
                  <p className="text-[12px] text-slate-500 mt-0.5">{rt.desc}</p>
                </div>
              </button>
            ))}
          </div>
          <div className="flex justify-end">
            <button onClick={() => setStep(2)} disabled={!selectedType}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-[13px] font-semibold rounded-lg transition-colors">
              Next: Configure Filters →
            </button>
          </div>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <p className="text-[12.5px] text-slate-600">Configuring filters for: </p>
            <span className="text-[12.5px] font-bold text-blue-700">{selType?.name}</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-5">
            {/* Date Range */}
            <div>
              <label className="block text-[11.5px] font-medium text-slate-700 mb-2">Date Range <span className="text-red-500">*</span></label>
              <div className="flex gap-3 items-center">
                <input type="date" value={filters.dateFrom} onChange={e => upF('dateFrom', e.target.value)}
                  className="h-9 px-3 rounded-lg border border-slate-300 text-[12.5px] text-slate-900 focus:outline-none focus:border-blue-500" />
                <span className="text-slate-400">to</span>
                <input type="date" value={filters.dateTo} onChange={e => upF('dateTo', e.target.value)}
                  className="h-9 px-3 rounded-lg border border-slate-300 text-[12.5px] text-slate-900 focus:outline-none focus:border-blue-500" />
                <div className="flex gap-2 ml-2">
                  {[['Last 30 days', 30], ['Last 90 days', 90], ['Last 1 year', 365]].map(([l, d]) => (
                    <button key={l as string} onClick={() => {
                      const to = new Date(); const from = new Date(); from.setDate(from.getDate() - (d as number));
                      upF('dateFrom', from.toISOString().slice(0, 10)); upF('dateTo', to.toISOString().slice(0, 10));
                    }} className="px-2.5 py-1 text-[11px] border border-slate-200 rounded text-slate-600 hover:border-blue-400 hover:text-blue-600 transition-colors">{l}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* Departments */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11.5px] font-medium text-slate-700">Departments</label>
                <button onClick={() => upF('depts', filters.depts.length === DEPTS.length ? [] : [...DEPTS])} className="text-[11px] text-blue-600 hover:text-blue-700">
                  {filters.depts.length === DEPTS.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {DEPTS.map(d => (
                  <button key={d} onClick={() => upF('depts', toggleArr(filters.depts, d))}
                    className={`px-3 py-1.5 rounded-full text-[11.5px] font-medium border transition-all ${filters.depts.includes(d) ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-600 hover:border-blue-400'}`}>{d}</button>
                ))}
              </div>
              <p className="text-[10.5px] text-slate-400 mt-1">Leave empty to include all departments</p>
            </div>

            {/* Regulations */}
            <div>
              <label className="block text-[11.5px] font-medium text-slate-700 mb-2">Regulations</label>
              <div className="flex flex-wrap gap-2">
                {REGS.map(r => (
                  <button key={r} onClick={() => upF('regs', toggleArr(filters.regs, r))}
                    className={`px-3 py-1.5 rounded-full text-[11.5px] font-medium border transition-all ${filters.regs.includes(r) ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-600 hover:border-blue-400'}`}>{r}</button>
                ))}
              </div>
            </div>

            {/* Assets */}
            <div>
              <label className="block text-[11.5px] font-medium text-slate-700 mb-2">Assets</label>
              <div className="flex flex-wrap gap-2">
                {ASSETS.map(a => (
                  <button key={a} onClick={() => upF('assets', toggleArr(filters.assets, a))}
                    className={`px-3 py-1.5 rounded-full text-[11.5px] font-medium border transition-all ${filters.assets.includes(a) ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-600 hover:border-blue-400'}`}>{a}</button>
                ))}
              </div>
            </div>

            {/* Risk Levels */}
            <div>
              <label className="block text-[11.5px] font-medium text-slate-700 mb-2">Risk Levels</label>
              <div className="flex gap-2">
                {RISK_LEVELS.map(l => {
                  const colors: Record<string, string> = { Low: '#10B981', Moderate: '#F59E0B', High: '#F97316', Critical: '#EF4444', Severe: '#991B1B' };
                  return (
                    <button key={l} onClick={() => upF('riskLevels', toggleArr(filters.riskLevels, l))}
                      className={`px-3 py-1.5 rounded-full text-[11.5px] font-semibold border-2 transition-all ${filters.riskLevels.includes(l) ? 'text-white' : 'border-slate-200 text-slate-600 hover:border-slate-400'}`}
                      style={filters.riskLevels.includes(l) ? { background: colors[l], borderColor: colors[l] } : {}}>{l}</button>
                  );
                })}
              </div>
            </div>

            {/* Export Format */}
            <div>
              <label className="block text-[11.5px] font-medium text-slate-700 mb-2">Export Format <span className="text-red-500">*</span></label>
              <div className="flex gap-3">
                {(['PDF', 'Excel', 'Both'] as const).map(fmt => (
                  <label key={fmt} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="format" checked={filters.format === fmt} onChange={() => upF('format', fmt)} className="accent-blue-600" />
                    <span className="text-[12.5px] font-medium text-slate-700">{fmt}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => setStep(1)} className="px-4 py-2 border border-slate-300 text-[13px] text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">← Back</button>
            <button onClick={() => setStep(3)} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-semibold rounded-lg transition-colors">Next: Preview →</button>
          </div>
        </div>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <div className="space-y-4">
          {generated ? (
            <div className="bg-green-50 border border-green-300 rounded-lg p-5 text-center space-y-3">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Check className="w-7 h-7 text-green-600" />
              </div>
              <p className="text-[15px] font-bold text-green-800">Report Generated Successfully!</p>
              <p className="text-[12px] text-green-700">{selType?.name} · Generated on {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              <div className="flex gap-3 justify-center">
                {(filters.format === 'PDF' || filters.format === 'Both') && (
                  <button className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-[13px] font-medium rounded-lg transition-colors">
                    <Download className="w-3.5 h-3.5" /> Download PDF
                  </button>
                )}
                {(filters.format === 'Excel' || filters.format === 'Both') && (
                  <button className="flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-800 text-white text-[13px] font-medium rounded-lg transition-colors">
                    <Download className="w-3.5 h-3.5" /> Download Excel
                  </button>
                )}
              </div>
              <p className="text-[11px] text-green-600">Report saved to history below</p>
              <button onClick={() => { setStep(1); setSelectedType(null); setGenerated(false); setGenerating(false); setFilters({ dateFrom: '', dateTo: '', depts: [], regs: [], assets: [], riskLevels: [], format: 'PDF' }); }}
                className="text-[12px] text-blue-600 hover:text-blue-700 font-medium">Generate Another Report →</button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-lg p-4">
                <p className="text-[13px] font-bold text-slate-800 mb-3">Report Summary</p>
                <div className="grid grid-cols-2 gap-4 text-[12.5px]">
                  {[
                    ['Report Type', selType?.name || ''],
                    ['Date Range', filters.dateFrom && filters.dateTo ? `${filters.dateFrom} to ${filters.dateTo}` : 'All time'],
                    ['Departments', filters.depts.length ? filters.depts.join(', ') : 'All departments'],
                    ['Regulations', filters.regs.length ? filters.regs.join(', ') : 'All regulations'],
                    ['Assets', filters.assets.length ? filters.assets.join(', ') : 'All assets'],
                    ['Risk Levels', filters.riskLevels.length ? filters.riskLevels.join(', ') : 'All levels'],
                    ['Export Format', filters.format],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <p className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">{k}</p>
                      <p className="text-slate-800 font-medium">{v}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-lg p-4">
                <p className="text-[13px] font-bold text-slate-800 mb-2">Sections in this Report</p>
                <div className="space-y-1.5">
                  {[
                    'Executive Summary',
                    'Overall Risk Score & Trend',
                    'Risk Breakdown by Department',
                    'Top Risk Drivers',
                    'Asset-Level Risk Register',
                    'Control Compliance Status',
                    'Recommended Actions',
                  ].map((s, i) => (
                    <div key={i} className="flex items-center gap-2 text-[12px] text-slate-700">
                      <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />{s}
                    </div>
                  ))}
                </div>
              </div>

              {generating && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                  <p className="text-[12.5px] font-semibold text-blue-700">Generating your report… This may take a few seconds.</p>
                </div>
              )}

              <div className="flex items-center gap-3">
                <button onClick={() => setStep(2)} disabled={generating} className="px-4 py-2 border border-slate-300 text-[13px] text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">← Back</button>
                <button onClick={handleGenerate} disabled={generating}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-[13px] font-bold rounded-lg transition-colors flex items-center justify-center gap-2">
                  <FileText className="w-4 h-4" /> Generate Report →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* History Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <p className="text-[13px] font-semibold text-slate-800">Report History</p>
        </div>
        <table className="w-full text-[12px]">
          <thead><tr className="border-b border-slate-100 bg-slate-50 text-left text-slate-500">
            {['Report Name', 'Type', 'Generated By', 'Date', 'Filters Applied', 'Download'].map(h => (
              <th key={h} className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {HISTORY.map(r => (
              <tr key={r.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-3 font-semibold text-slate-800">{r.name}</td>
                <td className="px-4 py-3"><span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10.5px] font-semibold">{r.type}</span></td>
                <td className="px-4 py-3 text-slate-600">{r.generatedBy}</td>
                <td className="px-4 py-3 text-slate-500">{r.date}</td>
                <td className="px-4 py-3 text-slate-400 max-w-[200px] truncate">{r.filters}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1.5">
                    <button className="flex items-center gap-1 px-2 py-1 text-[10.5px] text-slate-600 border border-slate-200 rounded hover:bg-slate-50"><Download className="w-3 h-3" /> PDF</button>
                    <button className="flex items-center gap-1 px-2 py-1 text-[10.5px] text-slate-600 border border-slate-200 rounded hover:bg-slate-50"><Download className="w-3 h-3" /> Excel</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
