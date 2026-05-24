import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  ShieldCheck, CheckCircle2, ChevronRight, ChevronLeft, ChevronDown,
  Plus, Trash2, Info, Building2, Package, Truck, AlertCircle,
  Shield, Scale, BarChart3, Users, Edit2, Check, X, Zap, AlertTriangle,
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { OrgStructureStep, Department, InviteUser, uid } from '../../components/onboarding/OrgStructureGraph';
import { TeamInviteStep } from '../../components/onboarding/TeamInviteStep';
import {
  useOnboardingStatus,
  useSaveOrgDetails,
  useSaveClassification,
  useSaveStructure,
  useInviteTeamMembers,
  useCompleteOnboarding,
} from '../../../hooks/useOnboarding';

const STEPS = [
  { label: 'Org Details',     short: '1' },
  { label: 'Classification',  short: '2' },
  { label: 'Structure',       short: '3' },
  { label: 'Team Invites',    short: '4' },
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

export function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  // ── API hooks ─────────────────────────────────────────────────────────────
  const { data: statusData }        = useOnboardingStatus();
  const saveOrgDetails              = useSaveOrgDetails();
  const saveClassification          = useSaveClassification();
  const saveStructure               = useSaveStructure();
  const inviteTeamMembers           = useInviteTeamMembers();
  const completeOnboarding          = useCompleteOnboarding();

  /** frontendId → DB UUID mapping returned by saveStructure */
  const [deptIdMap, setDeptIdMap]   = useState<Record<string, string>>({});
  const [isSaving,  setIsSaving]    = useState(false);

  const [hasInitialized, setHasInitialized] = useState(false);

  // Resume from last completed step on mount
  useEffect(() => {
    if (!statusData) return;
    if (statusData.isComplete) { navigate('/org/dashboard'); return; }
    
    if (!hasInitialized) {
      const s = statusData.steps;
      if      (!s.orgDetails)    setStep(0);
      else if (!s.orgStructure)  setStep(1); // Force classification step even if default is set
      else                       setStep(3);
      setHasInitialized(true);
    }

    // Pre-populate org name from saved data
    if (statusData.tenant.name)     setOrgName(statusData.tenant.name);
    if (statusData.tenant.industry) setIndustry(statusData.tenant.industry);
    if (statusData.tenant.orgSize)  setOrgSize(statusData.tenant.orgSize);
    if (statusData.tenant.address)  setAddress(statusData.tenant.address);
    if (statusData.tenant.dpoName)  setDpoName(statusData.tenant.dpoName);
    if (statusData.tenant.dpoEmail) setDpoEmail(statusData.tenant.dpoEmail);
    if (statusData.tenant.contactEmail) setContactEmail(statusData.tenant.contactEmail);
    if (statusData.tenant.classification)
      setClassification(statusData.tenant.classification as any);

    // Store dept IDs from previously saved structure
    if (statusData.departments.length > 0) {
      const map: Record<string, string> = {};
      statusData.departments.forEach(d => { map[d.name] = d.id; });
      setDeptIdMap(map);
    }
  }, [statusData]);

  // ── Step 1 ────────────────────────────────────────────────────────────────
  const [orgName,    setOrgName]    = useState('');
  const [industry,   setIndustry]   = useState('');
  const [orgSize,    setOrgSize]    = useState('');
  const [address,    setAddress]    = useState('');
  const [jurisdiction, setJurisdiction] = useState('India');
  const [dpoName,    setDpoName]    = useState('');
  const [dpoEmail,   setDpoEmail]   = useState('');
  const [dpoPhone,   setDpoPhone]   = useState('');
  const [website,    setWebsite]    = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [panNumber,  setPanNumber]  = useState('');
  const [gstNumber,  setGstNumber]  = useState('');

  // ── Step 2 ────────────────────────────────────────────────────────────────
  const [classification,  setClassification]  = useState<'Data Fiduciary' | 'Significant Data Fiduciary'>('Data Fiduciary');
  const [classUncertain,  setClassUncertain]  = useState(false);
  const [helpExpanded,    setHelpExpanded]    = useState(false);

  // ── Step 3 ────────────────────────────────────────────────────────────────
  const [departments, setDepartments] = useState<Department[]>([]);

  // ── Step 4 ────────────────────────────────────────────────────────────────
  const [invites, setInvites] = useState<InviteUser[]>([]);

  // ── Computed ──────────────────────────────────────────────────────────────
  const totalAssets    = departments.reduce((s, d) => s + d.assets.length, 0);
  const totalSuppliers = departments.reduce((s, d) => s + d.suppliers.length, 0);
  const totalPII       = departments.reduce((s, d) =>
    s + d.assets.reduce((sa, a) => sa + a.piiRecords.length, 0)
    + d.suppliers.reduce((ss, sup) => ss + sup.assets.reduce((sa, a) => sa + a.piiRecords.length, 0), 0), 0);
  const estimatedControls = classification === 'Significant Data Fiduciary' ? 58 : 33;

  const goNext = async () => {
    if (step === 0) {
      if (!orgSize) {
        toast.error('Please select an Organization Size');
        return;
      }
      setIsSaving(true);
      try {
        await saveOrgDetails.mutateAsync({
          name: orgName, industry, orgSize, address,
          country: jurisdiction, website: website || undefined,
          contactEmail, panNumber: panNumber || undefined,
          gstNumber: gstNumber || undefined,
          dpoName, dpoEmail, dpoPhone: dpoPhone || undefined,
          ceoName: orgName.split(' ')[0] || 'CEO',
        });
        setStep(1);
      } catch { /* toast shown by hook */ } finally { setIsSaving(false); }
      return;
    }
    if (step === 1) {
      setIsSaving(true);
      try {
        await saveClassification.mutateAsync({ classification, classUncertain });
        setStep(2);
      } catch { /* toast shown by hook */ } finally { setIsSaving(false); }
      return;
    }
    if (step === 3) {
      if (invites.length > 0) {
        setIsSaving(true);
        try {
          await inviteTeamMembers.mutateAsync({ invites });
          setStep(4);
        } catch { /* toast shown by hook */ } finally { setIsSaving(false); }
      } else {
        setStep(4);
      }
      return;
    }
    setStep(s => Math.min(4, s + 1));
  };

  const handleSaveStructure = async () => {
    setIsSaving(true);
    try {
      const result = await saveStructure.mutateAsync({ departments });
      // Store frontendId → dbId mapping
      const map: Record<string, string> = { ...deptIdMap };
      result.departments.forEach(d => { map[d.frontendId] = d.dbId; });
      // Also map by name as fallback
      result.departments.forEach(d => { map[d.name] = d.dbId; });
      setDeptIdMap(map);
      setStep(3);
    } catch { /* toast shown by hook */ } finally { setIsSaving(false); }
  };

  const handleComplete = async () => {
    setIsSaving(true);
    try {
      await completeOnboarding.mutateAsync();
      toast.success("Setup complete! Let's add your team — connect Entra ID or invite manually.");
      navigate('/org/users?setup=entra');
    } catch { /* toast shown by hook */ } finally { setIsSaving(false); }
  };

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
          <ProgressPanel step={step} setStep={setStep} departments={departments} />
        </div>

        {/* Right: Step content */}
        <form id="onboarding-form" onSubmit={(e) => { e.preventDefault(); goNext(); }} className="flex-1 flex flex-col overflow-hidden bg-slate-50">
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
                        <button key={s} type="button" onClick={() => setOrgSize(s)}
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

            {/* ═══════════════ STEP 4: Team Invites ════════════════════════ */}
            {step === 3 && (
              <div>
                <StepHeader
                  title="Invite Team Members"
                  desc="Bring your compliance team on board. You can connect your Microsoft Entra ID directory or invite members manually." />
                <TeamInviteStep 
                  invites={invites} setInvites={setInvites}
                  departments={departments}
                />
              </div>
            )}

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
                <button type="button" onClick={goBack}
                  className="flex items-center gap-2 px-5 py-2.5 text-[13px] text-slate-600 font-medium border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
              ) : <div />}
              {step < 4 ? (
                <button type="submit" disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-[13px] font-semibold rounded-lg transition-colors">
                  {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <>{step === 3 && invites.length === 0 ? 'Skip & Continue' : step === 3 ? 'Send Invites & Continue' : 'Continue'} <ChevronRight className="w-4 h-4" /></>}
                </button>
              ) : (
                <button type="button" onClick={handleComplete} disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-[13px] font-semibold rounded-lg transition-colors">
                  {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Completing…</> : <><CheckCircle2 className="w-4 h-4" /> Complete Onboarding →</>}
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
                />
              </div>
              <div className="flex-shrink-0 border-t border-slate-200 bg-white px-8 py-3 flex items-center justify-between">
                <button type="button" onClick={goBack} className="flex items-center gap-2 px-5 py-2 text-[13px] text-slate-600 font-medium border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <button type="button" onClick={() => navigate('/org/dashboard')} className="text-[12.5px] text-slate-400 hover:text-slate-700 transition-colors">Save & Exit</button>
                <button type="button" onClick={handleSaveStructure} disabled={isSaving} className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-[13px] font-semibold rounded-lg transition-colors">
                  {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <>Continue to Review <ChevronRight className="w-4 h-4" /></>}
                </button>
              </div>
            </>
          )}
        </form>
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
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} required={required}
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
      <select value={value} onChange={e => onChange(e.target.value)} required={required}
        className={`w-full h-9 px-3 rounded-lg bg-white border border-slate-300 text-[13px] focus:outline-none focus:border-blue-500 transition-colors ${!value ? 'text-slate-400' : 'text-slate-900'}`}>
        <option value="" disabled>Select...</option>
        {options.map(o => <option value={o} key={o}>{o}</option>)}
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
function ProgressPanel({ step, setStep, departments }: {
  step: number;
  setStep: (s: number) => void;
  departments: Department[];
}) {
  const totalAssets    = departments.reduce((s, d) => s + d.assets.length, 0);
  const totalSuppliers = departments.reduce((s, d) => s + d.suppliers.length, 0);
  const totalPII       = departments.reduce((s, d) =>
    s + d.assets.reduce((sa, a) => sa + a.piiRecords.length, 0)
    + d.suppliers.reduce((ss, sup) => ss + sup.assets.reduce((sa, a) => sa + a.piiRecords.length, 0), 0), 0);
  const incompleteAssets = departments.reduce((s, d) =>
    s + d.assets.filter(a => a.piiRecords.length === 0).length
    + d.suppliers.reduce((ss, sup) => ss + sup.assets.filter(a => a.piiRecords.length === 0).length, 0), 0);

  // Progress: steps 1-2 = 40% (20% each), step 3 up to 40% (4 × 10%), step 4 = 20%
  const s3 = (departments.length > 0 ? 10 : 0)
           + (totalAssets > 0 ? 10 : 0)
           + (totalPII > 0 ? 10 : 0)
           + (totalSuppliers > 0 ? 10 : 0);
  const s4 = step > 3 ? 20 : 0;
  const progress = Math.min(100,
    (step > 0 ? 20 : 0) +
    (step > 1 ? 20 : 0) +
    (step === 2 ? s3 : step > 2 ? 40 : 0) +
    s4
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