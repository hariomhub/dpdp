import React, { useState } from 'react';
import { Download, Check } from 'lucide-react';
import { useRiskAnalysis, type AssetRiskRow, type DepartmentRisk, type RegulationRisk } from '../../../hooks/useRisk';
import { useListDepartments } from '../../../hooks/useOrg';

const REPORT_TYPES = [
  { id: 'overall', name: 'Overall Risk Report', desc: 'Org-wide risk score and top risk drivers across all departments and assets.', icon: '🏢' },
  { id: 'department', name: 'Department Risk Report', desc: 'Risk score per department with contributing factors.', icon: '🏗️' },
  { id: 'asset', name: 'Asset Risk Report', desc: 'Risk score per asset with contributing factors, rejected tasks, and overdue tasks.', icon: '🗄️' },
  { id: 'regulation', name: 'Regulation Risk Report', desc: 'Risk score per regulation across the organization.', icon: '📋' },
] as const;

const RISK_LEVELS = ['Low', 'Moderate', 'High', 'Critical', 'Severe'];
function levelOf(score: number): string {
  if (score <= 20) return 'Low';
  if (score <= 40) return 'Moderate';
  if (score <= 60) return 'High';
  if (score <= 80) return 'Critical';
  return 'Severe';
}

function toCsv(headers: string[], rows: (string | number)[][]): string {
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers, ...rows].map(r => r.map(esc).join(',')).join('\n');
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function RiskReportsPage() {
  const { data: risk } = useRiskAnalysis();
  const { data: departments = [] } = useListDepartments();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedType, setSelectedType] = useState<typeof REPORT_TYPES[number]['id'] | null>(null);
  const [filters, setFilters] = useState({
    depts: [] as string[], regs: [] as string[], assets: [] as string[], riskLevels: [] as string[],
  });
  const [generated, setGenerated] = useState(false);

  const toggleArr = (arr: string[], val: string): string[] =>
    arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val];
  const upF = (k: keyof typeof filters, v: string[]) => setFilters(p => ({ ...p, [k]: v }));

  const deptOptions = departments.map(d => d.name);
  const regOptions = (risk?.regulations ?? []).map(r => r.label);
  const assetOptions = (risk?.assetRegister ?? []).map(a => a.name);

  const selType = REPORT_TYPES.find(r => r.id === selectedType);

  const filteredAssets = (risk?.assetRegister ?? []).filter((a: AssetRiskRow) =>
    (filters.depts.length === 0 || filters.depts.includes(a.departmentName)) &&
    (filters.assets.length === 0 || filters.assets.includes(a.name)) &&
    (filters.riskLevels.length === 0 || filters.riskLevels.includes(levelOf(a.score)))
  );
  const filteredDepts = (risk?.departmentRisk ?? []).filter((d: DepartmentRisk) =>
    (filters.depts.length === 0 || filters.depts.includes(d.name)) &&
    (filters.riskLevels.length === 0 || filters.riskLevels.includes(levelOf(d.score)))
  );
  const filteredRegs = (risk?.regulationRisk ?? []).filter((r: RegulationRisk) =>
    (filters.regs.length === 0 || filters.regs.includes(r.label)) &&
    (filters.riskLevels.length === 0 || filters.riskLevels.includes(levelOf(r.score)))
  );

  const handleGenerate = () => {
    if (!risk) return;
    const stamp = new Date().toISOString().slice(0, 10);
    if (selectedType === 'overall') {
      const rows: (string | number)[][] = [
        ['Overall Risk Score', risk.overallScore, levelOf(risk.overallScore)],
        [],
        ['Top Risk Drivers'],
        ['Asset', 'Department', 'Rejected Tasks', 'Overdue Tasks', 'Contribution %'],
        ...risk.topDrivers.map(d => [d.assetName, d.departmentName, d.nonCompliant, d.overdue, d.contribution]),
      ];
      downloadCsv(`overall-risk-report-${stamp}.csv`, toCsv(['Metric', 'Value', 'Level'], rows as any));
    } else if (selectedType === 'department') {
      downloadCsv(`department-risk-report-${stamp}.csv`, toCsv(
        ['Department', 'Risk Score', 'Risk Level', 'Total Tasks', 'Rejected', 'Overdue', 'Avg Criticality', 'Avg PII Sensitivity'],
        filteredDepts.map(d => [d.name, d.score, levelOf(d.score), d.factors.totalTasks, d.factors.nonCompliantTasks, d.factors.overdueTasks, d.factors.avgCriticality, d.factors.avgPiiSensitivity])
      ));
    } else if (selectedType === 'asset') {
      downloadCsv(`asset-risk-report-${stamp}.csv`, toCsv(
        ['Asset', 'Department', 'Type', 'Risk Score', 'Risk Level', 'Rejected', 'Overdue', 'Criticality', 'PII Sensitivity'],
        filteredAssets.map(a => [a.name, a.departmentName, a.assetType, a.score, levelOf(a.score), a.factors.nonCompliantTasks, a.factors.overdueTasks, a.criticality, a.piiSensitivity ?? 'None'])
      ));
    } else if (selectedType === 'regulation') {
      downloadCsv(`regulation-risk-report-${stamp}.csv`, toCsv(
        ['Regulation', 'Risk Score', 'Risk Level', 'Total Tasks', 'Rejected', 'Overdue'],
        filteredRegs.map(r => [r.label, r.score, levelOf(r.score), r.factors.totalTasks, r.factors.nonCompliantTasks, r.factors.overdueTasks])
      ));
    }
    setGenerated(true);
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[24px] font-bold text-slate-900" style={{ fontFamily: 'Cinzel, serif' }}>Risk Reports</h1>
        <p className="text-[14px] text-slate-400 mt-0.5">Export the live risk analysis as CSV for leadership and compliance reviews</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-3">
        {[{ n: 1, label: 'Select Report Type' }, { n: 2, label: 'Configure Filters' }, { n: 3, label: 'Generate' }].map((s, i) => (
          <React.Fragment key={s.n}>
            <div className={`flex items-center gap-2 text-[14px] font-medium ${step === s.n ? 'text-[#1A3E5C]' : step > s.n ? 'text-green-600' : 'text-slate-400'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[13px] font-bold ${step === s.n ? 'bg-[#1A3E5C] text-white' : step > s.n ? 'bg-green-500 text-white' : 'border-2 border-[#D4AF37]/35 text-slate-400'}`}>
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
          <p className="text-[14.5px] text-slate-600">Choose the type of risk report you want to generate.</p>
          <div className="grid grid-cols-1 gap-3">
            {REPORT_TYPES.map(rt => (
              <button key={rt.id} onClick={() => setSelectedType(rt.id)}
                className={`flex items-start gap-4 p-4 rounded-lg border-2 text-left transition-all ${selectedType === rt.id ? 'border-[#1A3E5C] bg-[#1A3E5C]/8' : 'border-[#D4AF37]/35 hover:border-[#1A3E5C]/30 bg-white'}`}>
                <span className="text-2xl flex-shrink-0">{rt.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-[15px] font-bold text-slate-900">{rt.name}</p>
                    {selectedType === rt.id && <Check className="w-4 h-4 text-[#1A3E5C]" />}
                  </div>
                  <p className="text-[14px] text-slate-500 mt-0.5">{rt.desc}</p>
                </div>
              </button>
            ))}
          </div>
          <div className="flex justify-end">
            <button onClick={() => setStep(2)} disabled={!selectedType}
              className="px-5 py-2 bg-[#1A3E5C] hover:bg-[#15324a] disabled:bg-slate-200 disabled:text-slate-400 text-white text-[15px] font-semibold rounded-lg transition-colors">
              Next: Configure Filters →
            </button>
          </div>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <p className="text-[14.5px] text-slate-600">Configuring filters for: </p>
            <span className="text-[14.5px] font-bold text-[#1A3E5C]">{selType?.name}</span>
          </div>

          <div className="bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] p-5 space-y-5">
            {(selectedType === 'overall' || selectedType === 'department' || selectedType === 'asset') && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[13.5px] font-medium text-slate-700">Departments</label>
                  <button onClick={() => upF('depts', filters.depts.length === deptOptions.length ? [] : [...deptOptions])} className="text-[13px] text-[#1A3E5C] hover:text-[#D4AF37]">
                    {filters.depts.length === deptOptions.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {deptOptions.map(d => (
                    <button key={d} onClick={() => upF('depts', toggleArr(filters.depts, d))}
                      className={`px-3 py-1.5 rounded-full text-[13.5px] font-medium border transition-all ${filters.depts.includes(d) ? 'bg-[#1A3E5C] text-white border-[#1A3E5C]' : 'border-[#D4AF37]/35 text-slate-600 hover:border-[#1A3E5C]/40'}`}>{d}</button>
                  ))}
                </div>
                <p className="text-[12.5px] text-slate-400 mt-1">Leave empty to include all departments</p>
              </div>
            )}

            {(selectedType === 'overall' || selectedType === 'regulation') && (
              <div>
                <label className="block text-[13.5px] font-medium text-slate-700 mb-2">Regulations</label>
                <div className="flex flex-wrap gap-2">
                  {regOptions.length === 0 ? <p className="text-[13.5px] text-slate-400">No regulations in use yet.</p> : regOptions.map(r => (
                    <button key={r} onClick={() => upF('regs', toggleArr(filters.regs, r))}
                      className={`px-3 py-1.5 rounded-full text-[13.5px] font-medium border transition-all ${filters.regs.includes(r) ? 'bg-[#1A3E5C] text-white border-[#1A3E5C]' : 'border-[#D4AF37]/35 text-slate-600 hover:border-[#1A3E5C]/40'}`}>{r}</button>
                  ))}
                </div>
              </div>
            )}

            {selectedType === 'asset' && (
              <div>
                <label className="block text-[13.5px] font-medium text-slate-700 mb-2">Assets</label>
                <div className="flex flex-wrap gap-2">
                  {assetOptions.map(a => (
                    <button key={a} onClick={() => upF('assets', toggleArr(filters.assets, a))}
                      className={`px-3 py-1.5 rounded-full text-[13.5px] font-medium border transition-all ${filters.assets.includes(a) ? 'bg-[#1A3E5C] text-white border-[#1A3E5C]' : 'border-[#D4AF37]/35 text-slate-600 hover:border-[#1A3E5C]/40'}`}>{a}</button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-[13.5px] font-medium text-slate-700 mb-2">Risk Levels</label>
              <div className="flex gap-2">
                {RISK_LEVELS.map(l => {
                  const colors: Record<string, string> = { Low: '#10B981', Moderate: '#F59E0B', High: '#F97316', Critical: '#EF4444', Severe: '#991B1B' };
                  return (
                    <button key={l} onClick={() => upF('riskLevels', toggleArr(filters.riskLevels, l))}
                      className={`px-3 py-1.5 rounded-full text-[13.5px] font-semibold border-2 transition-all ${filters.riskLevels.includes(l) ? 'text-white' : 'border-[#D4AF37]/35 text-slate-600 hover:border-slate-400'}`}
                      style={filters.riskLevels.includes(l) ? { background: colors[l], borderColor: colors[l] } : {}}>{l}</button>
                  );
                })}
              </div>
            </div>

            <p className="text-[13px] text-slate-400">Reports are exported as CSV, computed live from the current risk analysis.</p>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => setStep(1)} className="px-4 py-2 border border-slate-300 text-[15px] text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">← Back</button>
            <button onClick={() => setStep(3)} className="px-5 py-2 bg-[#1A3E5C] hover:bg-[#15324a] text-white text-[15px] font-semibold rounded-lg transition-colors">Next: Generate →</button>
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
              <p className="text-[17px] font-bold text-green-800">Report Downloaded</p>
              <p className="text-[14px] text-green-700">{selType?.name} · Generated on {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              <button onClick={() => { setStep(1); setSelectedType(null); setGenerated(false); setFilters({ depts: [], regs: [], assets: [], riskLevels: [] }); }}
                className="text-[14px] text-[#1A3E5C] hover:text-[#D4AF37] font-medium">Generate Another Report →</button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] p-4">
                <p className="text-[15px] font-bold text-slate-800 mb-3">Report Summary</p>
                <div className="grid grid-cols-2 gap-4 text-[14.5px]">
                  {[
                    ['Report Type', selType?.name || ''],
                    ['Departments', filters.depts.length ? filters.depts.join(', ') : 'All departments'],
                    ['Regulations', filters.regs.length ? filters.regs.join(', ') : 'All regulations'],
                    ['Assets', filters.assets.length ? filters.assets.join(', ') : 'All assets'],
                    ['Risk Levels', filters.riskLevels.length ? filters.riskLevels.join(', ') : 'All levels'],
                    ['Rows in export', String(
                      selectedType === 'department' ? filteredDepts.length
                      : selectedType === 'asset' ? filteredAssets.length
                      : selectedType === 'regulation' ? filteredRegs.length
                      : (risk?.topDrivers.length ?? 0)
                    )],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <p className="text-[12.5px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">{k}</p>
                      <p className="text-slate-800 font-medium">{v}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button onClick={() => setStep(2)} className="px-4 py-2 border border-slate-300 text-[15px] text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">← Back</button>
                <button onClick={handleGenerate} disabled={!risk}
                  className="flex-1 py-2.5 bg-[#1A3E5C] hover:bg-[#15324a] disabled:opacity-50 text-white text-[15px] font-bold rounded-lg transition-colors flex items-center justify-center gap-2">
                  <Download className="w-4 h-4" /> Download CSV
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
