import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  ShieldCheck, CheckCircle2, ChevronRight, ChevronLeft, ChevronDown,
  Plus, Trash2, Info, Building2, Package, Truck, AlertCircle,
  Shield, Scale, BarChart3, Users, Edit2, Check, X, Zap, AlertTriangle,
} from 'lucide-react';
import { OrgStructureStep, Department, InviteUser, uid } from '../../components/onboarding/OrgStructureGraph';

const STEPS = [
  { label: 'Org Details',     short: '1' },
  { label: 'Classification',  short: '2' },
  { label: 'Structure',       short: '3' },
  { label: 'Team',            short: '4' },
  { label: 'Review',          short: '5' },
];

const REGULATIONS = [
  { label: 'DPDP Act 2023', icon: Shield },
  { label: 'RBI Data Localisation', icon: Scale },
  { label: 'SEBI Cybersecurity Framework', icon: BarChart3 },
  { label: 'More regulations added regularly', icon: Plus },
];

const INDUSTRIES = ['Technology', 'Healthcare', 'Finance & Banking', 'E-commerce', 'Manufacturing', 'Government', 'Education', 'Telecommunications', 'Media & Entertainment', 'Other'];
const ORG_SIZES  = ['1–50', '51–200', '201–1000', '1000+'];
const JURISDICTIONS = ['India', 'United States', 'United Kingdom', 'European Union', 'Singapore', 'Australia', 'Canada', 'Other'];
const ROLES      = ['Compliance Officer', 'IT Admin', 'Internal Auditor', 'External Auditor'];
const DEPT_ROLES = ['IT Admin', 'Internal Auditor'];

const MOCK_ENTRA_GROUPS = ['GRP-ComplianceOfficers', 'GRP-ExternalAuditors', 'GRP-IT-Engineering', 'GRP-IT-HR', 'GRP-Auditors-Engineering', 'GRP-Auditors-HR', 'GRP-All-Admins'];
const MOCK_GROUP_COUNTS: Record<string, number> = {
  'GRP-ComplianceOfficers': 8, 'GRP-ExternalAuditors': 2, 'GRP-IT-Engineering': 12,
  'GRP-IT-HR': 9, 'GRP-Auditors-Engineering': 6, 'GRP-Auditors-HR': 5, 'GRP-All-Admins': 15,
};

type Invite = { id: string; email: string; role: string; departments?: string[]; note?: string; status: 'Pending' | 'Sent' };

export function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  // ── Step 1 ────────────────────────────────────────────────────────────────
  const [orgName,    setOrgName]    = useState('TechNova Solutions Pvt. Ltd.');
  const [industry,   setIndustry]   = useState('Technology');
  const [orgSize,    setOrgSize]    = useState('201–1000');
  const [address,    setAddress]    = useState('101 Tech Park, Whitefield, Bengaluru - 560066, Karnataka');
  const [jurisdiction, setJurisdiction] = useState('India');
  const [dpoName,    setDpoName]    = useState('Priya Sharma');
  const [dpoEmail,   setDpoEmail]   = useState('dpo@technova.in');
  const [dpoPhone,   setDpoPhone]   = useState('+91 98765 43210');
  const [website,    setWebsite]    = useState('https://technova.in');
  const [contactEmail, setContactEmail] = useState('amit.rao@technova.in');
  const [panNumber,  setPanNumber]  = useState('');
  const [gstNumber,  setGstNumber]  = useState('');

  // ── Step 2 ────────────────────────────────────────────────────────────────
  const [classification,  setClassification]  = useState<'Data Fiduciary' | 'Significant Data Fiduciary'>('Data Fiduciary');
  const [classUncertain,  setClassUncertain]  = useState(false);
  const [helpExpanded,    setHelpExpanded]    = useState(false);

  // ── Step 3 ────────────────────────────────────────────────────────────────
  const [departments, setDepartments] = useState<Department[]>([{
    id: uid(), name: 'Engineering', description: 'Software development and infrastructure', owner: 'Manish Kumar',
    assets: [{
      id: uid(), name: 'Customer Database', assetType: 'Database / Data Store',
      description: 'Primary PostgreSQL database storing customer PII', assetOwner: 'Manish Kumar',
      hostingLocation: 'India', vendorName: '', criticality: 'High', internetFacing: false,
      status: 'Active',
      piiRecords: [{
        id: uid(), categories: ['Email', 'Name', 'Phone'], sensitivity: 'High',
        purpose: 'Customer account management', legalBasis: 'Consent',
        retention: '3 years', deletionMechanism: 'Hard delete + audit log',
        volume: '500,000', crossBorderTransfer: false, crossBorderDestination: '',
        principalType: 'Customer', sharedWithThirdParties: false,
      }],
    }],
    suppliers: [],
  }]);

  // ── Step 4 ────────────────────────────────────────────────────────────────
  const [invites, setInvites]     = useState<Invite[]>([{ id: uid(), email: 'priya@technova.in', role: 'Compliance Officer', status: 'Sent' }]);
  const [newEmail, setNewEmail]   = useState('');
  const [newRole,  setNewRole]    = useState('Compliance Officer');
  const [newDepts, setNewDepts]   = useState<string[]>([]);
  const [inviteNote, setInviteNote] = useState('');

  // Entra ID multi-step state
  const [entraState, setEntraState] = useState<'idle' | 'mapping' | 'preview' | 'sent'>('idle');
  const [entraTenantId, setEntraTenantId] = useState('your-org.onmicrosoft.com');
  const [entraGroupMappings, setEntraGroupMappings] = useState<{
    complianceOfficer: string; externalAuditor: string;
    deptMappings: { deptId: string; itAdmin: string; auditor: string }[];
  }>({ complianceOfficer: '', externalAuditor: '', deptMappings: [] });

  const startEntraMapping = () => {
    setEntraGroupMappings(prev => ({
      ...prev,
      deptMappings: departments.map(d => ({
        deptId: d.id,
        itAdmin: prev.deptMappings.find(m => m.deptId === d.id)?.itAdmin || '',
        auditor: prev.deptMappings.find(m => m.deptId === d.id)?.auditor || '',
      })),
    }));
    setEntraState('mapping');
  };

  const addInvite = () => {
    if (!newEmail.trim()) return;
    setInvites(prev => [...prev, {
      id: uid(), email: newEmail.trim(), role: newRole,
      departments: DEPT_ROLES.includes(newRole) ? newDepts : [],
      note: inviteNote || undefined, status: 'Sent',
    }]);
    setNewEmail(''); setNewDepts([]); setInviteNote('');
  };
  const removeInvite = (id: string) => setInvites(prev => prev.filter(i => i.id !== id));

  // ── Computed ──────────────────────────────────────────────────────────────
  const totalAssets    = departments.reduce((s, d) => s + d.assets.length, 0);
  const totalSuppliers = departments.reduce((s, d) => s + d.suppliers.length, 0);
  const totalPII       = departments.reduce((s, d) =>
    s + d.assets.reduce((sa, a) => sa + a.piiRecords.length, 0)
    + d.suppliers.reduce((ss, sup) => ss + sup.assets.reduce((sa, a) => sa + a.piiRecords.length, 0), 0), 0);
  const estimatedControls = classification === 'Significant Data Fiduciary' ? 58 : 33;

  const goNext = () => setStep(s => Math.min(4, s + 1));
  const goBack = () => setStep(s => Math.max(0, s - 1));

  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden" style={{ fontFamily: 'DM Sans, sans-serif' }}>

      {/* ── Top bar ───────────────────────────────────────────────────────── */}
      <div className="h-14 bg-white border-b border-slate-200 flex items-center px-8 gap-6 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
          <span className="text-[15px] font-bold text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>DPDP CMS</span>
        </div>

        {/* Progress stepper */}
        <div className="flex-1 flex items-center justify-center gap-0">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.label}>
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11.5px] font-bold transition-all
                  ${i < step ? 'bg-green-500 text-white' : i === step ? 'bg-blue-600 text-white' : 'border-2 border-slate-200 text-slate-400 bg-white'}`}>
                  {i < step ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                </div>
                <span className={`text-[12px] font-medium hidden md:block whitespace-nowrap transition-colors
                  ${i === step ? 'text-slate-900' : i < step ? 'text-green-600' : 'text-slate-400'}`}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-8 h-px mx-2 transition-colors ${i < step ? 'bg-green-400' : 'bg-slate-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        <button onClick={() => navigate('/org/dashboard')} className="text-[12px] text-slate-400 hover:text-slate-700 transition-colors">
          Save & Exit
        </button>
      </div>

      {/* ── Body — always two column: progress left + content right ────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* Left: Persistent progress panel (always visible) */}
        <div className="w-[280px] flex-shrink-0 border-r border-slate-200 bg-white overflow-y-auto">
          <ProgressPanel step={step} setStep={setStep} departments={departments} invites={invites} />
        </div>

        {/* Right: Step content */}
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
          {step !== 2 ? (
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-3xl mx-auto px-8 py-8">

            {/* ═══════════════ STEP 1: Organization Details ═══════════════════ */}
            {step === 0 && (
              <div>
                <StepHeader
                  title="Organization Details"
                  desc="Provide your organization's legal details. This will appear on compliance certificates and reports." />
                <div className="space-y-4">
                  <TwoCol>
                    <FField label="Organization Legal Name" value={orgName} onChange={setOrgName} required placeholder="e.g., TechNova Solutions Pvt. Ltd." />
                    <SField label="Industry / Sector" value={industry} onChange={setIndustry} options={INDUSTRIES} required />
                  </TwoCol>
                  <div>
                    <label className="block text-[12px] font-semibold text-slate-700 mb-2">Organization Size <span className="text-red-500">*</span></label>
                    <div className="grid grid-cols-4 gap-2">
                      {ORG_SIZES.map(s => (
                        <button key={s} onClick={() => setOrgSize(s)}
                          className={`py-2 px-3 rounded-lg text-[12.5px] font-medium border transition-all
                            ${orgSize === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-slate-300 text-slate-700 hover:border-blue-400 hover:text-blue-600'}`}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                  <FField label="Primary Address" value={address} onChange={setAddress} required placeholder="Full registered address" />
                  <TwoCol>
                    <SField label="Jurisdiction / Country" value={jurisdiction} onChange={setJurisdiction} options={JURISDICTIONS} required />
                    <FField label="Primary Contact Email" value={contactEmail} onChange={setContactEmail} required type="email" />
                  </TwoCol>

                  <div className="pt-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">Data Protection Officer (DPO)</label>
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                      <TwoCol>
                        <FField label="DPO Name" value={dpoName} onChange={setDpoName} required />
                        <FField label="DPO Email" value={dpoEmail} onChange={setDpoEmail} required type="email" />
                      </TwoCol>
                      <TwoCol>
                        <FField label="DPO Phone" value={dpoPhone} onChange={setDpoPhone} placeholder="+91 98765 43210" />
                        <FField label="Organization Website" value={website} onChange={setWebsite} placeholder="https://example.com" />
                      </TwoCol>
                      <div className="flex items-start gap-2 p-2.5 bg-blue-50 border border-blue-200 rounded-lg">
                        <Info className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
                        <p className="text-[11px] text-blue-700">A DPO is mandated by the DPDP Act for organizations processing significant volumes of personal data.</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Tax Identifiers <span className="font-normal normal-case text-slate-400">(Optional)</span></label>
                    <TwoCol>
                      <FField label="PAN Number" value={panNumber} onChange={setPanNumber} placeholder="e.g., AABCT1234P" />
                      <FField label="GST Number" value={gstNumber} onChange={setGstNumber} placeholder="e.g., 29AABCT1234P1Z5" />
                    </TwoCol>
                  </div>
                </div>
              </div>
            )}

            {/* ═══════════════ STEP 2: Regulatory Classification ══════════════ */}
            {step === 1 && (
              <div>
                <StepHeader
                  title="Regulatory Classification"
                  desc="Your classification determines which controls and obligations apply to your organization under the DPDP Act." />
                <div className="space-y-4">
                  {/* Classification cards */}
                  <div className="grid grid-cols-2 gap-3">
                    {([
                      {
                        value: 'Data Fiduciary' as const,
                        icon: Shield,
                        title: 'Data Fiduciary',
                        desc: 'Your organization decides why and how personal data is collected and used. This applies to most organizations that process any personal data.',
                        note: 'Standard compliance obligations',
                      },
                      {
                        value: 'Significant Data Fiduciary' as const,
                        icon: AlertCircle,
                        title: 'Significant Data Fiduciary',
                        desc: 'Your organization processes large volumes or highly sensitive personal data as notified by the Government of India.',
                        note: 'Enhanced obligations: mandatory DPO, DPIA, audits',
                      },
                    ]).map(card => {
                      const Icon = card.icon;
                      const selected = classification === card.value;
                      return (
                        <button key={card.value} onClick={() => setClassification(card.value)}
                          className={`p-4 rounded-xl border-2 text-left transition-all flex items-start gap-4
                            ${selected ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-200'}`}>
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${selected ? 'bg-blue-600' : 'bg-slate-100'}`}>
                            <Icon className={`w-4.5 h-4.5 ${selected ? 'text-white' : 'text-slate-500'}`} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${selected ? 'border-blue-600' : 'border-slate-300'}`}>
                                {selected && <div className="w-2 h-2 rounded-full bg-blue-600" />}
                              </div>
                              <span className="text-[13.5px] font-bold text-slate-900">{card.title}</span>
                            </div>
                            <p className="text-[11.5px] text-slate-600 leading-relaxed mb-2">{card.desc}</p>
                            <span className={`text-[10.5px] font-medium px-2 py-0.5 rounded ${selected ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>{card.note}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Uncertainty checkbox */}
                  <label className="flex items-start gap-3 cursor-pointer group p-3 rounded-lg hover:bg-slate-50 transition-colors">
                    <div onClick={() => setClassUncertain(v => !v)}
                      className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all
                        ${classUncertain ? 'border-amber-500 bg-amber-500' : 'border-slate-300 group-hover:border-amber-400'}`}>
                      {classUncertain && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-slate-800">I'm not sure about my classification yet</p>
                      <p className="text-[12px] text-slate-500 mt-0.5">This won't block your progress. Your Compliance Officer can confirm and update the classification when creating the first assessment.</p>
                    </div>
                  </label>

                  {/* Collapsible help */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <button onClick={() => setHelpExpanded(v => !v)}
                      className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition-colors">
                      <span className="text-[13px] font-medium text-blue-600">Help me understand the difference</span>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${helpExpanded ? 'rotate-180' : ''}`} />
                    </button>
                    {helpExpanded && (
                      <div className="px-4 pb-4 border-t border-slate-100">
                        <div className="grid grid-cols-3 gap-4 mt-3">
                          {[
                            { label: 'Who qualifies?', df: 'Any org that determines why personal data is collected — this includes most businesses.', sdf: 'Orgs with large user bases or sensitive data, specifically notified by the Govt. of India.' },
                            { label: 'Key obligations?', df: 'Consent management, grievance redressal, data principal rights, security safeguards.', sdf: 'All DF obligations + mandatory DPO appointment, Data Protection Impact Assessments, annual audits, data localisation.' },
                            { label: 'Typical examples?', df: 'SaaS companies, e-commerce platforms, HR systems, fintech apps.', sdf: 'Large social media platforms, major banks, healthcare providers, telecom companies.' },
                          ].map(row => (
                            <div key={row.label}>
                              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2">{row.label}</p>
                              <div className="space-y-2">
                                <div className="p-2.5 bg-blue-50 rounded-lg">
                                  <p className="text-[10.5px] font-semibold text-blue-700 mb-1">Data Fiduciary</p>
                                  <p className="text-[11px] text-blue-600 leading-relaxed">{row.df}</p>
                                </div>
                                <div className="p-2.5 bg-purple-50 rounded-lg">
                                  <p className="text-[10.5px] font-semibold text-purple-700 mb-1">Significant Data Fiduciary</p>
                                  <p className="text-[11px] text-purple-600 leading-relaxed">{row.sdf}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Available regulations */}
                  <div className="p-4 bg-white border border-slate-200 rounded-xl">
                    <p className="text-[12px] font-semibold text-slate-700 mb-3">Regulations available on this platform</p>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {REGULATIONS.map(r => {
                        const Icon = r.icon;
                        return (
                          <span key={r.label} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full text-[11.5px] font-medium text-green-700">
                            <Icon className="w-3 h-3" /> {r.label}
                          </span>
                        );
                      })}
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      You will select applicable regulations when creating assessments. Controls will be loaded based on your selected regulation and classification.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ═══════════════ STEP 4: Invite Team Members ════════════════════ */}
            {step === 3 && (() => {
              const previewRows = [
                ...(entraGroupMappings.complianceOfficer ? [{ label: 'Compliance Officer', group: entraGroupMappings.complianceOfficer }] : []),
                ...(entraGroupMappings.externalAuditor ? [{ label: 'External Auditor', group: entraGroupMappings.externalAuditor }] : []),
                ...entraGroupMappings.deptMappings.flatMap(dm => {
                  const d = departments.find(d => d.id === dm.deptId);
                  return [
                    ...(dm.itAdmin  ? [{ label: `IT Admin · ${d?.name}`,    group: dm.itAdmin  }] : []),
                    ...(dm.auditor  ? [{ label: `Int. Auditor · ${d?.name}`, group: dm.auditor  }] : []),
                  ];
                }),
              ];
              const previewTotal = previewRows.reduce((s, r) => s + (MOCK_GROUP_COUNTS[r.group] || 0), 0);
              const showDeptField = DEPT_ROLES.includes(newRole);
              return (
                <div>
                  <StepHeader title="Invite Team Members" desc="Add your compliance team so they can start working immediately after onboarding. You can always add more people later." />
                  <div className="space-y-4">
                    <div className={entraState === 'mapping' ? 'space-y-4' : 'grid grid-cols-2 gap-4 items-start'}>

                      {/* ── Entra ID card (multi-step) ─────────────────────── */}
                      <div className={`rounded-xl border-2 transition-all bg-white ${
                        entraState === 'idle' ? 'border-slate-200'
                        : entraState === 'mapping' ? 'border-blue-300'
                        : entraState === 'preview' ? 'border-emerald-300'
                        : 'border-green-400 bg-green-50'}`}>

                        {entraState === 'idle' && (
                          <div className="p-5">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-9 h-9 rounded-lg bg-[#0078d4] flex items-center justify-center flex-shrink-0"><span className="text-white font-bold text-[13px]">M</span></div>
                              <div>
                                <p className="text-[13px] font-bold text-slate-800">Microsoft Entra ID</p>
                                <p className="text-[10.5px] text-slate-500">Enterprise directory sync</p>
                              </div>
                            </div>
                            <p className="text-[12px] text-slate-600 leading-relaxed mb-4">Import users from your Microsoft directory. Recommended for 50+ members.</p>
                            <div className="space-y-3">
                              <div>
                                <label className="block text-[11.5px] font-medium text-slate-700 mb-1">Your Microsoft Tenant ID</label>
                                <input value={entraTenantId} onChange={e => setEntraTenantId(e.target.value)} placeholder="your-org.onmicrosoft.com"
                                  className="w-full h-8 px-3 border border-slate-300 rounded-lg text-[12.5px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500" />
                              </div>
                              <button onClick={startEntraMapping} disabled={!entraTenantId.trim()}
                                className="w-full h-9 flex items-center justify-center gap-2 bg-[#0078d4] hover:bg-[#006cc1] disabled:bg-slate-200 disabled:text-slate-400 text-white text-[12.5px] font-semibold rounded-lg transition-colors">
                                Authorize with Microsoft →
                              </button>
                              <p className="text-[10.5px] text-slate-400 text-center">Opens Microsoft OAuth consent screen</p>
                            </div>
                          </div>
                        )}

                        {entraState === 'mapping' && (
                          <div className="p-5">
                            <div className="flex items-center gap-2 mb-4">
                              <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                              <p className="text-[13px] font-semibold text-slate-800">Connected: <span className="text-blue-600">{entraTenantId}</span></p>
                            </div>
                            <p className="text-[13px] font-bold text-slate-800 mb-4">Map your Entra ID groups to roles</p>
                            <p className="text-[9.5px] font-bold text-slate-500 uppercase tracking-widest mb-2">Org-Wide Roles</p>
                            <div className="grid grid-cols-2 gap-3 mb-4">
                              {[{ label: 'Compliance Officer', key: 'complianceOfficer' as const }, { label: 'External Auditor', key: 'externalAuditor' as const }].map(({ label, key }) => (
                                <div key={key}>
                                  <label className="block text-[11px] font-medium text-slate-700 mb-1">{label}</label>
                                  <select value={entraGroupMappings[key]} onChange={e => setEntraGroupMappings(p => ({ ...p, [key]: e.target.value }))}
                                    className="w-full h-7 px-2 border border-slate-300 rounded-lg text-[11.5px] text-slate-900 focus:outline-none focus:border-blue-500 bg-white">
                                    <option value="">Select group…</option>
                                    {MOCK_ENTRA_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                                  </select>
                                </div>
                              ))}
                            </div>
                            {departments.length > 0 && (
                              <>
                                <p className="text-[9.5px] font-bold text-slate-500 uppercase tracking-widest mb-2">Department Roles</p>
                                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                                  {departments.map(dept => {
                                    const dm = entraGroupMappings.deptMappings.find(m => m.deptId === dept.id) || { deptId: dept.id, itAdmin: '', auditor: '' };
                                    const upDM = (field: 'itAdmin' | 'auditor', val: string) =>
                                      setEntraGroupMappings(p => ({ ...p, deptMappings: p.deptMappings.map(m => m.deptId === dept.id ? { ...m, [field]: val } : m) }));
                                    return (
                                      <div key={dept.id} className="p-3 bg-white rounded-lg border border-blue-200">
                                        <p className="text-[11.5px] font-semibold text-slate-800 mb-2">🏢 {dept.name}</p>
                                        <div className="space-y-1.5">
                                          {([{ label: 'IT Admin', field: 'itAdmin' as const }, { label: 'Int. Auditor', field: 'auditor' as const }]).map(({ label, field }) => (
                                            <div key={field} className="flex items-center gap-2">
                                              <span className="text-[10.5px] text-slate-500 w-20 flex-shrink-0">{label}</span>
                                              <select value={dm[field]} onChange={e => upDM(field, e.target.value)}
                                                className="flex-1 h-6 px-2 border border-slate-200 rounded text-[11px] text-slate-900 focus:outline-none focus:border-blue-500 bg-white">
                                                <option value="">Select group…</option>
                                                {MOCK_ENTRA_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                                              </select>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </>
                            )}
                            {departments.length === 0 && <p className="text-[11.5px] text-slate-400 italic mb-3">No departments created yet. Complete Step 3 first.</p>}
                            <button onClick={() => setEntraState('preview')}
                              className="mt-4 w-full h-9 bg-blue-600 hover:bg-blue-700 text-white text-[12.5px] font-semibold rounded-lg transition-colors">
                              Preview Invitations →
                            </button>
                          </div>
                        )}

                        {entraState === 'preview' && (
                          <div className="p-5">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0"><Check className="w-3 h-3 text-white" /></div>
                              <p className="text-[13px] font-semibold text-slate-800">Ready to invite</p>
                            </div>
                            <p className="text-[12px] text-slate-600 mb-4 leading-relaxed">
                              <span className="font-bold text-slate-900">{previewTotal} users</span> across <span className="font-bold text-slate-900">{previewRows.length} group{previewRows.length !== 1 ? 's' : ''}</span> will receive invitation emails.
                            </p>
                            <div className="space-y-1.5 mb-4 max-h-52 overflow-y-auto">
                              {previewRows.map((r, i) => (
                                <div key={i} className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
                                  <div><p className="text-[12px] font-medium text-slate-800">{r.label}</p><p className="text-[10.5px] text-slate-400">{r.group}</p></div>
                                  <span className="text-[11.5px] font-semibold text-slate-700">{MOCK_GROUP_COUNTS[r.group] || 0} users</span>
                                </div>
                              ))}
                              {previewRows.length === 0 && <p className="text-[12px] text-slate-400 italic">No groups mapped. Go back to configure.</p>}
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => setEntraState('mapping')} className="flex-1 h-8 border border-slate-300 text-slate-600 text-[12px] font-medium rounded-lg hover:bg-slate-50 transition-colors">← Change Mappings</button>
                              <button onClick={() => setEntraState('sent')} disabled={previewRows.length === 0}
                                className="flex-1 h-8 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-[12px] font-semibold rounded-lg transition-colors">
                                Send All Invitations →
                              </button>
                            </div>
                          </div>
                        )}

                        {entraState === 'sent' && (
                          <div className="p-5">
                            <div className="flex items-center gap-2 mb-3">
                              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                              <p className="text-[13px] font-bold text-green-800">Invitations Sent Successfully!</p>
                            </div>
                            <p className="text-[12px] text-slate-600 leading-relaxed mb-3">
                              <span className="font-bold">{previewTotal} invitation emails</span> sent across <span className="font-bold">{previewRows.length} Entra ID group{previewRows.length !== 1 ? 's' : ''}</span>.
                            </p>
                            <button onClick={() => { setEntraState('idle'); setEntraGroupMappings({ complianceOfficer: '', externalAuditor: '', deptMappings: [] }); }}
                              className="text-[11.5px] text-slate-400 hover:text-slate-600 underline transition-colors">Disconnect / Reconfigure</button>
                          </div>
                        )}
                      </div>

                      {/* ── Manual invite card ────────────────────────────── */}
                      <div className="p-5 rounded-xl border-2 border-slate-200 bg-white">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0"><Users className="w-4 h-4 text-slate-600" /></div>
                          <div><p className="text-[13px] font-bold text-slate-800">Invite Manually</p><p className="text-[10.5px] text-slate-500">Add one by one</p></div>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-[11.5px] font-medium text-slate-700 mb-1">Email Address <span className="text-red-500">*</span></label>
                            <input value={newEmail} onChange={e => setNewEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && addInvite()}
                              placeholder="colleague@organization.in" type="email"
                              className="w-full h-8 px-3 rounded-lg border border-slate-300 text-[12.5px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500" />
                          </div>
                          <div>
                            <label className="block text-[11.5px] font-medium text-slate-700 mb-1">Role <span className="text-red-500">*</span></label>
                            <select value={newRole} onChange={e => { setNewRole(e.target.value); setNewDepts([]); }}
                              className="w-full h-8 px-2 rounded-lg border border-slate-300 text-[12.5px] text-slate-900 focus:outline-none focus:border-blue-500">
                              {ROLES.map(r => <option key={r}>{r}</option>)}
                            </select>
                          </div>
                          {showDeptField && departments.length > 0 && (
                            <div>
                              <label className="block text-[11.5px] font-medium text-slate-700 mb-1">Department</label>
                              <div className="space-y-1 max-h-28 overflow-y-auto p-2 border border-slate-200 rounded-lg bg-slate-50">
                                {departments.map(d => (
                                  <label key={d.id} className="flex items-center gap-2 cursor-pointer py-0.5 hover:bg-white rounded px-1 transition-colors">
                                    <input type="checkbox" checked={newDepts.includes(d.id)}
                                      onChange={() => setNewDepts(prev => prev.includes(d.id) ? prev.filter(x => x !== d.id) : [...prev, d.id])}
                                      className="rounded text-blue-600" />
                                    <span className="text-[12px] text-slate-800">{d.name}</span>
                                  </label>
                                ))}
                              </div>
                              <p className="text-[10.5px] text-slate-400 mt-1 leading-relaxed">This user will receive or review tasks for assets in selected departments.</p>
                            </div>
                          )}
                          {showDeptField && departments.length === 0 && (
                            <p className="text-[11px] text-amber-600 italic">No departments yet — complete Step 3 first to assign departments.</p>
                          )}
                          <div>
                            <label className="block text-[11.5px] font-medium text-slate-700 mb-1">Personal Note <span className="text-[11px] text-slate-400 font-normal">(Optional)</span></label>
                            <textarea value={inviteNote} onChange={e => setInviteNote(e.target.value)} rows={2}
                              placeholder="e.g., Hi! Please set up your DPDP CMS account when you get a chance."
                              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-[12px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 resize-none" />
                          </div>
                          <div className="flex gap-2 pt-1">
                            <button onClick={() => { setNewEmail(''); setNewDepts([]); setInviteNote(''); }}
                              className="px-4 h-8 text-[12px] text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
                            <button onClick={addInvite} disabled={!newEmail.trim()}
                              className="flex-1 h-8 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-[12px] font-semibold rounded-lg transition-colors">
                              <Plus className="w-3.5 h-3.5" /> Send Invitation →
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Invited members table */}
                    {invites.length > 0 && (
                      <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50">
                          <p className="text-[12px] font-semibold text-slate-700">{invites.length} member{invites.length !== 1 ? 's' : ''} invited</p>
                        </div>
                        <table className="w-full text-[12px]">
                          <thead>
                            <tr className="border-b border-slate-100 text-slate-500 text-left bg-slate-50">
                              <th className="px-4 py-2 font-medium">Email</th>
                              <th className="px-4 py-2 font-medium">Role</th>
                              <th className="px-4 py-2 font-medium">Departments</th>
                              <th className="px-4 py-2 font-medium">Status</th>
                              <th className="px-4 py-2 font-medium w-8" />
                            </tr>
                          </thead>
                          <tbody>
                            {invites.map(inv => (
                              <tr key={inv.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                                <td className="px-4 py-2 text-slate-800 font-medium">{inv.email}</td>
                                <td className="px-4 py-2"><span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-medium">{inv.role}</span></td>
                                <td className="px-4 py-2">
                                  {inv.departments && inv.departments.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {inv.departments.map(dId => { const d = departments.find(d => d.id === dId); return d ? <span key={dId} className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[10.5px] rounded">{d.name}</span> : null; })}
                                    </div>
                                  ) : <span className="text-slate-400 text-[11px]">Org-wide</span>}
                                </td>
                                <td className="px-4 py-2">
                                  <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${inv.status === 'Sent' ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'}`}>
                                    {inv.status === 'Sent' ? 'Invite Sent' : 'Accepted'}
                                  </span>
                                </td>
                                <td className="px-4 py-2"><button onClick={() => removeInvite(inv.id)} className="text-slate-300 hover:text-red-500 transition-colors"><X className="w-3.5 h-3.5" /></button></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    <div className="text-center">
                      <button onClick={goNext} className="text-[12px] text-slate-400 hover:text-slate-700 underline transition-colors">Skip for now →</button>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* ═══════════════ STEP 5: Review & Confirm ════════════════════════ */}
            {step === 4 && (
              <div>
                <StepHeader
                  title="Review & Confirm"
                  desc="Review your setup before completing onboarding. You can go back to any section to make changes." />
                <div className="space-y-3">

                  {/* Org Details */}
                  <ReviewCard title="Organization Details" onEdit={() => setStep(0)}>
                    <p className="text-[14px] font-bold text-slate-900">{orgName}</p>
                    <p className="text-[12px] text-slate-500 mt-1">{industry} · {orgSize} employees · {jurisdiction}</p>
                    <p className="text-[12px] text-slate-500">{address}</p>
                    <p className="text-[12px] text-slate-500 mt-1">DPO: {dpoName} · {dpoEmail} · {dpoPhone}</p>
                    {contactEmail && <p className="text-[12px] text-slate-500">Contact: {contactEmail}</p>}
                    {(panNumber || gstNumber) && (
                      <div className="flex gap-4 mt-1">
                        {panNumber && <p className="text-[11px] text-slate-400">PAN: <span className="text-slate-700 font-medium">{panNumber}</span></p>}
                        {gstNumber && <p className="text-[11px] text-slate-400">GST: <span className="text-slate-700 font-medium">{gstNumber}</span></p>}
                      </div>
                    )}
                  </ReviewCard>

                  {/* Classification */}
                  <ReviewCard title="Regulatory Classification" onEdit={() => setStep(1)}>
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 bg-blue-600 text-white text-[12px] font-semibold rounded-full">{classification}</span>
                      {classUncertain && <span className="px-3 py-1 bg-amber-100 text-amber-700 border border-amber-200 text-[12px] font-medium rounded-full">Classification Uncertain</span>}
                    </div>
                  </ReviewCard>

                  {/* Available Regulations */}
                  <ReviewCard title="Available Regulations" showEdit={false}>
                    <div className="flex flex-wrap gap-2">
                      {REGULATIONS.map(r => {
                        const Icon = r.icon;
                        return (
                          <span key={r.label} className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 border border-green-200 text-[11px] text-green-700 rounded-full font-medium">
                            <Icon className="w-3 h-3" /> {r.label}
                          </span>
                        );
                      })}
                    </div>
                  </ReviewCard>

                  {/* Org Structure */}
                  <ReviewCard title="Organization Structure" onEdit={() => setStep(2)}>
                    <div className="grid grid-cols-4 gap-3 mb-3">
                      {[
                        { v: departments.length, l: 'Departments', c: 'text-indigo-600 bg-indigo-50', Icon: Building2 },
                        { v: totalAssets,        l: 'Own Assets',  c: 'text-green-700 bg-green-50',  Icon: Package },
                        { v: totalSuppliers,     l: 'Suppliers',   c: 'text-orange-700 bg-orange-50', Icon: Truck },
                        { v: totalPII,           l: 'PII Records', c: 'text-red-700 bg-red-50',       Icon: AlertCircle },
                      ].map(s => (
                        <div key={s.l} className={`p-3 rounded-lg ${s.c}`}>
                          <s.Icon className="w-4 h-4 mb-1" />
                          <p className="text-[22px] font-bold leading-none">{s.v}</p>
                          <p className="text-[10.5px] font-medium mt-0.5">{s.l}</p>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-1.5">
                      {departments.map(dept => (
                        <div key={dept.id} className="flex items-center gap-3 py-1.5 border-t border-slate-100 first:border-0 text-[12px]">
                          <div className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />
                          <span className="font-medium text-slate-800 flex-1">{dept.name}</span>
                          <span className="text-green-600">{dept.assets.length} assets</span>
                          <span className="text-orange-600">{dept.suppliers.length} suppliers</span>
                          {dept.owner && <span className="text-slate-400">{dept.owner}</span>}
                        </div>
                      ))}
                    </div>
                  </ReviewCard>

                  {/* Team */}
                  <ReviewCard title={`Team Members (${invites.length})`} onEdit={() => setStep(3)}>
                    {invites.length === 0
                      ? <p className="text-[12px] text-slate-400 italic">No team members invited yet.</p>
                      : (
                        <div className="space-y-1.5">
                          {invites.map(inv => (
                            <div key={inv.id} className="flex items-center gap-3 text-[12px]">
                              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600 flex-shrink-0">
                                {inv.email[0].toUpperCase()}
                              </div>
                              <span className="flex-1 text-slate-700">{inv.email}</span>
                              <span className="text-slate-500">{inv.role}</span>
                              <span className={`text-[10.5px] px-1.5 py-0.5 rounded font-medium ${inv.status === 'Sent' ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'}`}>{inv.status}</span>
                            </div>
                          ))}
                        </div>
                      )
                    }
                  </ReviewCard>

                  {/* Estimated controls */}
                  <div className="p-5 bg-white border border-blue-200 rounded-xl">
                    <div className="flex items-center gap-3 mb-2">
                      <Zap className="w-5 h-5 text-blue-500" />
                      <p className="text-[13px] font-bold text-slate-800">Estimated Applicable Controls</p>
                    </div>
                    <p className="text-[44px] font-bold text-blue-600 leading-none" style={{ fontFamily: 'Sora, sans-serif' }}>{estimatedControls}+</p>
                    <p className="text-[11.5px] text-slate-500 mt-2 leading-relaxed">
                      Based on your classification as <strong>{classification}</strong>. Exact controls will be confirmed when your Compliance Officer creates the first assessment.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ── Navigation (steps 0,1,3,4) ──────────────────────────────── */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-200">
              {step > 0 ? (
                <button onClick={goBack}
                  className="flex items-center gap-2 px-5 py-2.5 text-[13px] text-slate-600 font-medium border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
              ) : <div />}
              {step < 4 ? (
                <button onClick={goNext}
                  className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-semibold rounded-lg transition-colors">
                  Continue <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button onClick={() => navigate('/org/dashboard')}
                  className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white text-[13px] font-semibold rounded-lg transition-colors">
                  <CheckCircle2 className="w-4 h-4" /> Complete Onboarding →
                </button>
              )}
            </div>
          </div>
            </div>
          ) : (
            /* Step 2 — Organization Structure */
            <>
              <div className="px-6 py-3.5 border-b border-slate-100 flex-shrink-0 bg-white">
                <h2 className="text-[17px] font-bold text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>Organization Structure</h2>
                <p className="text-[12px] text-slate-500 mt-0.5">Map your departments, assets, suppliers, and the personal data that flows through them.</p>
              </div>
              <div className="flex-1 overflow-hidden">
                <OrgStructureStep
                  orgName={orgName}
                  departments={departments}
                  setDepartments={setDepartments}
                  onSkipToTeam={goNext}
                  invites={invites as InviteUser[]}
                />
              </div>
              <div className="flex-shrink-0 border-t border-slate-200 bg-white px-8 py-3 flex items-center justify-between">
                <button onClick={goBack} className="flex items-center gap-2 px-5 py-2 text-[13px] text-slate-600 font-medium border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <button onClick={() => navigate('/org/dashboard')} className="text-[12.5px] text-slate-400 hover:text-slate-700 transition-colors">Save & Exit</button>
                <button onClick={goNext} className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-semibold rounded-lg transition-colors">
                  Continue to Team <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Shared layout helpers ────────────────────────────────────────────────────
function StepHeader({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-[22px] font-bold text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>{title}</h2>
      <p className="text-[13px] text-slate-500 mt-1 leading-relaxed">{desc}</p>
    </div>
  );
}

function TwoCol({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-4">{children}</div>;
}

function FField({ label, value, onChange, placeholder, required, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; required?: boolean; type?: string;
}) {
  return (
    <div>
      <label className="block text-[12px] font-medium text-slate-700 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full h-9 px-3 rounded-lg bg-white border border-slate-300 text-[13px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors" />
    </div>
  );
}

function SField({ label, value, onChange, options, required }: {
  label: string; value: string; onChange: (v: string) => void; options: string[]; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-[12px] font-medium text-slate-700 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full h-9 px-3 rounded-lg bg-white border border-slate-300 text-[13px] text-slate-900 focus:outline-none focus:border-blue-500 transition-colors">
        {options.map(o => <option key={o}>{o}</option>)}
      </select>
    </div>
  );
}

function ReviewCard({ title, children, onEdit, showEdit = true }: {
  title: string; children: React.ReactNode; onEdit?: () => void; showEdit?: boolean;
}) {
  return (
    <div className="p-5 bg-white border border-slate-200 rounded-xl">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[13px] font-bold text-slate-800">{title}</h3>
        {showEdit && onEdit && (
          <button onClick={onEdit} className="flex items-center gap-1.5 text-[12px] text-blue-600 font-medium hover:text-blue-700 transition-colors">
            <Edit2 className="w-3.5 h-3.5" /> Edit
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

// ─── Progress Panel (persistent left sidebar across all steps) ───────────────
function ProgressPanel({ step, setStep, departments, invites }: {
  step: number;
  setStep: (s: number) => void;
  departments: Department[];
  invites: { id: string; email: string; role: string; status: string }[];
}) {
  const totalAssets    = departments.reduce((s, d) => s + d.assets.length, 0);
  const totalSuppliers = departments.reduce((s, d) => s + d.suppliers.length, 0);
  const totalPII       = departments.reduce((s, d) =>
    s + d.assets.reduce((sa, a) => sa + a.piiRecords.length, 0)
    + d.suppliers.reduce((ss, sup) => ss + sup.assets.reduce((sa, a) => sa + a.piiRecords.length, 0), 0), 0);
  const incompleteAssets = departments.reduce((s, d) =>
    s + d.assets.filter(a => a.piiRecords.length === 0).length
    + d.suppliers.reduce((ss, sup) => ss + sup.assets.filter(a => a.piiRecords.length === 0).length, 0), 0);

  // Progress: steps 1-2 = 30% (15% each), step 3 up to 28% (4 × 7%), step 4 = 15%, step 5 = 15%
  const s3 = (departments.length > 0 ? 7 : 0)
           + (totalAssets > 0 ? 7 : 0)
           + (totalPII > 0 ? 7 : 0)
           + (totalSuppliers > 0 ? 7 : 0);
  const s4 = step > 3 ? 15 : invites.length > 0 ? 8 : 0;
  const s5 = step > 4 ? 15 : 0;
  const progress = Math.min(100,
    (step > 0 ? 15 : 0) +
    (step > 1 ? 15 : 0) +
    (step === 2 ? s3 : step > 2 ? 28 : 0) +
    s4 + s5
  );

  const STEPS_META = [
    { label: 'Org Details',           idx: 0 },
    { label: 'Classification',        idx: 1 },
    { label: 'Organization Structure',idx: 2 },
    { label: 'Team Members',          idx: 3 },
    { label: 'Review & Submit',       idx: 4 },
  ];

  return (
    <div className="h-full flex flex-col px-5 py-6 overflow-hidden">
      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-5">Your Onboarding Progress</p>
      <div className="flex-1 space-y-1 overflow-y-auto">
        {STEPS_META.map(s => {
          const done    = s.idx < step;
          const active  = s.idx === step;
          const pending = s.idx > step;
          return (
            <div key={s.idx}>
              <button
                onClick={() => done && setStep(s.idx)}
                disabled={!done}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors
                  ${done ? 'hover:bg-green-50 cursor-pointer' : 'cursor-default'}
                  ${active ? 'bg-blue-50' : ''}`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[9px]
                  ${done ? 'bg-green-500' : active ? 'bg-blue-500' : 'border-2 border-slate-200 bg-white'}`}>
                  {done && <Check className="w-3 h-3 text-white" />}
                  {active && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <span className={`text-[12px] font-medium flex-1 ${done ? 'text-green-700' : active ? 'text-blue-700' : 'text-slate-400'}`}>
                  {s.label}
                </span>
                {done && <span className="text-[10px] text-green-600 font-semibold flex-shrink-0">Complete</span>}
                {active && <span className="text-[10px] text-blue-500 font-semibold flex-shrink-0">Active</span>}
                {pending && <span className="text-[10px] text-slate-300 flex-shrink-0">Pending</span>}
              </button>

              {/* Step 3 sub-items */}
              {s.idx === 2 && active && (
                <div className="ml-7 mt-1 mb-1 space-y-0.5 pl-3 border-l-2 border-blue-100">
                  {[
                    { label: 'Departments', count: departments.length, warn: false },
                    { label: 'Own Assets',  count: totalAssets,        warn: false },
                    { label: 'PII Records', count: totalPII,           warn: incompleteAssets > 0 },
                    { label: 'Suppliers',   count: totalSuppliers,     warn: false },
                  ].map(sub => (
                    <div key={sub.label} className="flex items-center gap-2 py-0.5">
                      <span className="text-[11px] text-slate-600 flex-1">{sub.label}</span>
                      <span className="text-[11px] font-semibold text-slate-700">{sub.count} added</span>
                      {sub.warn && (
                        <span className="flex items-center gap-0.5 text-[10px] text-orange-500 font-medium">
                          <AlertTriangle className="w-2.5 h-2.5" /> {incompleteAssets} incomplete
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="mt-5 pt-4 border-t border-slate-100 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-medium text-slate-500">Overall Progress</span>
          <span className="text-[13px] font-bold text-slate-800">{progress}%</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-2 bg-blue-500 rounded-full transition-all duration-700"
            style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  );
}