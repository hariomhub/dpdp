import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Database, Monitor, ArrowLeftRight, Handshake, Globe, Server, Package, Cpu, Smartphone, HardDrive, ArrowLeft, Edit2, Clock, FileText, CheckSquare, AlertTriangle, Wifi, WifiOff, MapPin, Shield, User, Calendar } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatusChip, MonoBadge, TabNav, Btn, Card, PriorityChip, ProgressBar } from '../../components/shared/DesignSystem';
import { CONTROLS, ACTIONS, EVIDENCE } from '../../data/mockData';

const ASSETS = [
  { id:'AST-001', name:'Customer Database', assetType:'Database / Data Store', status:'Active', compliance:'Partially Compliant', compliantControls:12, totalControls:18, openActions:4, owner:'Manish Kumar', department:'Engineering', lastUpdated:'2 hours ago', registered:'2024-06-15', hostingLocation:'India (AWS ap-south-1)', internetFacing:false, vendorName:'', criticality:'Critical', description:'Primary PostgreSQL database storing all customer PII, transaction records, and consent logs.', piiRecords:[{id:'PR-001',categories:['Name','Email','Phone'],sensitivity:'High',purpose:'Customer account management and service delivery',legalBasis:'Consent',retention:'3 years',deletionMechanism:'Hard delete + audit log',volume:'500000',crossBorderTransfer:false,crossBorderDestination:'',principalType:'Customer',sharedWithThirdParties:false},{id:'PR-002',categories:['Financial Data','Government ID'],sensitivity:'Critical',purpose:'KYC and regulatory compliance',legalBasis:'Legal Obligation',retention:'7 years',deletionMechanism:'Encrypted archival',volume:'120000',crossBorderTransfer:false,crossBorderDestination:'',principalType:'Customer',sharedWithThirdParties:false}] },
  { id:'AST-002', name:'HR Management System', assetType:'In-House (On-Premise)', status:'Active', compliance:'Fully Compliant', compliantControls:14, totalControls:14, openActions:0, owner:'Priya Sharma', department:'HR', lastUpdated:'1 day ago', registered:'2024-07-01', hostingLocation:'India (On-Premise)', internetFacing:false, vendorName:'', criticality:'High', description:'Internal HRMS tool for employee records, payroll, and biometric attendance.', piiRecords:[{id:'PR-003',categories:['Name','Address','Government ID','Biometric'],sensitivity:'High',purpose:'Payroll processing and HR management',legalBasis:'Contract',retention:'5 years post-exit',deletionMechanism:'Hard delete + legal hold',volume:'1200',crossBorderTransfer:false,crossBorderDestination:'',principalType:'Employee',sharedWithThirdParties:false}] },
  { id:'AST-003', name:'Customer to Payment Gateway', assetType:'API / Integration Layer', status:'Active', compliance:'Non-Compliant', compliantControls:3, totalControls:10, openActions:6, owner:'Manish Kumar', department:'Engineering', lastUpdated:'3 days ago', registered:'2024-06-20', hostingLocation:'India (Mumbai DC)', internetFacing:true, vendorName:'Razorpay Pvt. Ltd.', criticality:'Critical', description:'Data flow from customer checkout to Razorpay payment gateway.', piiRecords:[{id:'PR-004',categories:['Financial Data','Government ID'],sensitivity:'Critical',purpose:'Payment processing and fraud prevention',legalBasis:'Contract',retention:'10 years',deletionMechanism:'Regulatory archival',volume:'850000',crossBorderTransfer:false,crossBorderDestination:'',principalType:'Customer',sharedWithThirdParties:true}] },
  { id:'AST-004', name:'AWS Cloud Infrastructure', assetType:'Third-Party (Cloud Hosted)', status:'Active', compliance:'Partially Compliant', compliantControls:8, totalControls:12, openActions:2, owner:'Manish Kumar', department:'Engineering', lastUpdated:'5 hours ago', registered:'2024-06-15', hostingLocation:'India (AWS ap-south-1)', internetFacing:true, vendorName:'Amazon Web Services', criticality:'High', description:'AWS hosting for all production workloads including S3, RDS, and EC2.', piiRecords:[{id:'PR-005',categories:['Name','Email','Financial Data'],sensitivity:'High',purpose:'Data storage for production workloads',legalBasis:'Contract',retention:'3 years',deletionMechanism:'S3 lifecycle policies',volume:'500000',crossBorderTransfer:false,crossBorderDestination:'',principalType:'Customer',sharedWithThirdParties:true}] },
  { id:'AST-005', name:'Website Cookie Consent Banner', assetType:'SaaS (Third-Party Hosted)', status:'Active', compliance:'Fully Compliant', compliantControls:6, totalControls:6, openActions:0, owner:'Priya Sharma', department:'Marketing', lastUpdated:'2 weeks ago', registered:'2024-09-01', hostingLocation:'India (CDN)', internetFacing:true, vendorName:'CookieYes', criticality:'Low', description:'Cookie consent banner on technova.com with granular category controls.', piiRecords:[{id:'PR-006',categories:['Behavioural Data','Location Data'],sensitivity:'Low',purpose:'Consent tracking and cookie preference management',legalBasis:'Consent',retention:'1 year',deletionMechanism:'Automatic expiry',volume:'48000',crossBorderTransfer:false,crossBorderDestination:'',principalType:'Customer',sharedWithThirdParties:false}] },
  { id:'AST-006', name:'CRM Portal', assetType:'SaaS (Third-Party Hosted)', status:'Under Review', compliance:'Not Started', compliantControls:0, totalControls:16, openActions:1, owner:'Amit Rao', department:'Sales', lastUpdated:'1 week ago', registered:'2024-08-15', hostingLocation:'India / US (Salesforce)', internetFacing:true, vendorName:'Salesforce Inc.', criticality:'Medium', description:'Salesforce-based CRM system used by the sales and support teams.', piiRecords:[{id:'PR-007',categories:['Name','Email','Phone'],sensitivity:'Medium',purpose:'Sales pipeline and CRM management',legalBasis:'Legitimate Interest',retention:'3 years',deletionMechanism:'Salesforce deletion API',volume:'48000',crossBorderTransfer:true,crossBorderDestination:'United States',principalType:'Customer',sharedWithThirdParties:true}] },
];

const TYPE_ICONS: Record<string,React.ReactNode> = {
  'Database / Data Store': <Database className="w-5 h-5"/>,
  'SaaS (Third-Party Hosted)': <Globe className="w-5 h-5"/>,
  'In-House (On-Premise)': <Server className="w-5 h-5"/>,
  'In-House (Cloud Hosted)': <Monitor className="w-5 h-5"/>,
  'Outsourced / Managed Service': <Handshake className="w-5 h-5"/>,
  'Third-Party (Cloud Hosted)': <Package className="w-5 h-5"/>,
  'API / Integration Layer': <ArrowLeftRight className="w-5 h-5"/>,
  'Mobile Application': <Smartphone className="w-5 h-5"/>,
  'Legacy System': <HardDrive className="w-5 h-5"/>,
  'Physical / Hardware': <Cpu className="w-5 h-5"/>,
};

const CRIT_COLOR: Record<string,string> = {
  Critical:'bg-red-50 text-red-700', High:'bg-orange-50 text-orange-700',
  Medium:'bg-amber-50 text-amber-700', Low:'bg-green-50 text-green-700',
};
const SENS_COLOR: Record<string,string> = {
  Critical:'bg-red-50 text-red-700', High:'bg-orange-50 text-orange-700',
  Medium:'bg-amber-50 text-amber-700', Low:'bg-green-50 text-green-700',
};

export function AssetDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role } = useApp();
  const [activeTab, setActiveTab] = useState('Overview');
  const asset = ASSETS.find(a => a.id === id) || ASSETS[0];
  const canManage = role === 'ceo' || role === 'co';

  const assetControls = CONTROLS.slice(0, 8);
  const assetActions = ACTIONS.filter(a => a.asset === asset.id);
  const assetEvidence = EVIDENCE.filter(e => e.asset === asset.id);

  const TABS = ['Overview', 'PII Records', 'Controls', 'Assessments', 'Actions', 'Evidence', 'Audit Trail'];
  const compliancePct = Math.round((asset.compliantControls / asset.totalControls) * 100);

  return (
    <div>
      {/* Header */}
      <div className="mb-4">
        <button onClick={() => navigate('/org/assets')} className="flex items-center gap-1.5 text-[13px] text-slate-500 hover:text-slate-800 mb-3">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Asset Register
        </button>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500">
              {TYPE_ICONS[asset.assetType] || <Database className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <MonoBadge>{asset.id}</MonoBadge>
                <span className="text-[11px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded font-medium">{asset.assetType}</span>
                <StatusChip status={asset.status} />
                <span className={`text-[10.5px] px-2 py-0.5 rounded font-semibold ${CRIT_COLOR[asset.criticality]}`}>{asset.criticality}</span>
              </div>
              <h1 className="text-[20px] font-bold text-slate-900" style={{ fontFamily:'Sora, sans-serif' }}>{asset.name}</h1>
              <p className="text-[12px] text-slate-500 mt-0.5">{asset.department} · Owner: {asset.owner}</p>
            </div>
          </div>
          {canManage && (
            <Btn variant="secondary" onClick={() => navigate(`/org/assets/${asset.id}/edit`)} icon={<Edit2 className="w-3.5 h-3.5" />}>
              Edit Asset
            </Btn>
          )}
        </div>
      </div>

      <div className="flex gap-4">
        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <TabNav tabs={TABS} active={activeTab} onChange={setActiveTab} />

          {/* ── Overview ── */}
          {activeTab === 'Overview' && (
            <div className="space-y-3">
              <Card>
                <h3 className="text-[13px] font-semibold text-slate-800 mb-2">Description</h3>
                <p className="text-[13px] text-slate-600 leading-relaxed">{asset.description}</p>
              </Card>
              <Card>
                <h3 className="text-[13px] font-semibold text-slate-800 mb-3">Asset Details</h3>
                <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                  {[
                    ['Asset Type', asset.assetType],
                    ['Department', asset.department],
                    ['Owner', asset.owner],
                    ['Status', asset.status],
                    ['Criticality', asset.criticality],
                    ['Registered', asset.registered],
                    ['Last Updated', asset.lastUpdated],
                    ['Hosting / Data Residency', asset.hostingLocation],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <p className="text-[11px] text-slate-400 mb-0.5">{k}</p>
                      <p className="text-[13px] font-medium text-slate-800">{v}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[11px] text-slate-400 mb-0.5">Internet Facing</p>
                    <p className={`text-[13px] font-medium flex items-center gap-1.5 ${asset.internetFacing ? 'text-orange-600' : 'text-green-600'}`}>
                      {asset.internetFacing ? <><Wifi className="w-3.5 h-3.5"/>Public / Internet Facing</> : <><WifiOff className="w-3.5 h-3.5"/>Internal Only</>}
                    </p>
                  </div>
                  {asset.vendorName && (
                    <div>
                      <p className="text-[11px] text-slate-400 mb-0.5">Vendor / Provider</p>
                      <p className="text-[13px] font-medium text-slate-800">{asset.vendorName}</p>
                    </div>
                  )}
                </div>
              </Card>
              <Card>
                <h3 className="text-[13px] font-semibold text-slate-800 mb-2">PII Summary</h3>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-[28px] font-bold text-slate-900" style={{ fontFamily:'Sora,sans-serif' }}>{asset.piiRecords.length}</p>
                    <p className="text-[11px] text-slate-400">PII record{asset.piiRecords.length !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="flex-1 space-y-1">
                    {asset.piiRecords.map(r => (
                      <div key={r.id} className="flex items-center gap-2 text-[11.5px]">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${SENS_COLOR[r.sensitivity]}`}>{r.sensitivity}</span>
                        <span className="text-slate-600">{r.categories.slice(0, 3).join(', ')}{r.categories.length > 3 ? ' +more' : ''}</span>
                        <span className="text-slate-400">· {parseInt(r.volume).toLocaleString()} principals</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* ── PII Records ── */}
          {activeTab === 'PII Records' && (
            <div className="space-y-3">
              {asset.piiRecords.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-[13px]">No PII records for this asset</div>
              ) : asset.piiRecords.map((rec, i) => (
                <Card key={rec.id}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-slate-400">PII-{String(i+1).padStart(2,'0')}</span>
                      <span className={`text-[10.5px] px-2 py-0.5 rounded font-semibold ${SENS_COLOR[rec.sensitivity]}`}>{rec.sensitivity} Sensitivity</span>
                      {rec.crossBorderTransfer && <span className="text-[10.5px] px-2 py-0.5 bg-amber-50 text-amber-700 rounded font-semibold">⚠ Cross-border</span>}
                      {rec.sharedWithThirdParties && <span className="text-[10.5px] px-2 py-0.5 bg-orange-50 text-orange-700 rounded font-semibold">Shared</span>}
                    </div>
                    <span className="text-[11px] text-slate-400">{parseInt(rec.volume).toLocaleString()} {rec.principalType} principals</span>
                  </div>
                  <div className="mb-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">PII Categories</p>
                    <div className="flex flex-wrap gap-1">
                      {rec.categories.map(c => <span key={c} className="px-2 py-0.5 bg-red-50 text-red-700 rounded text-[11px] font-medium">{c}</span>)}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-[12px] border-t border-slate-100 pt-3">
                    {[
                      ['Legal Basis', rec.legalBasis],
                      ['Purpose', rec.purpose],
                      ['Retention Period', rec.retention],
                      ['Deletion Mechanism', rec.deletionMechanism || 'Not specified'],
                      ['Data Principal', rec.principalType],
                      ['Cross-border Transfer', rec.crossBorderTransfer ? `Yes → ${rec.crossBorderDestination}` : 'No — stays in India'],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">{k}</p>
                        <p className={`font-medium text-slate-700 ${k === 'Cross-border Transfer' ? (rec.crossBorderTransfer ? 'text-amber-600' : 'text-green-600') : ''}`}>{v}</p>
                      </div>
                    ))}
                  </div>
                  {rec.sharedWithThirdParties && (
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2 text-[11.5px] text-orange-600">
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                      This personal data is shared with third parties. Ensure a valid DPA is in place.
                    </div>
                  )}
                </Card>
              ))}
              {canManage && (
                <button className="w-full py-3 border-2 border-dashed border-slate-200 rounded-lg text-[13px] text-slate-400 hover:border-blue-300 hover:text-blue-500 transition-colors">
                  + Add PII Record
                </button>
              )}
            </div>
          )}

          {/* ── Controls ── */}
          {activeTab === 'Controls' && (
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead><tr className="bg-slate-50 border-b border-slate-200">
                  {['Control ID','Title','Chapter','Status',''].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-widest">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {assetControls.map(ctrl => (
                    <tr key={ctrl.id} className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer" onClick={() => navigate(`/org/controls/${ctrl.id}`)}>
                      <td className="px-4 py-3"><MonoBadge>{ctrl.id}</MonoBadge></td>
                      <td className="px-4 py-3 text-[13px] text-slate-800">{ctrl.title}</td>
                      <td className="px-4 py-3 text-[12px] text-slate-500">{ctrl.chapter}</td>
                      <td className="px-4 py-3"><StatusChip status={ctrl.status} /></td>
                      <td className="px-4 py-3">{canManage && <Btn size="sm" variant="secondary" onClick={e => { e.stopPropagation(); navigate('/org/actions/new'); }}>Create Action</Btn>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Assessments ── */}
          {activeTab === 'Assessments' && (
            <div className="space-y-3">
              {[{ name:'Q1 2025 DPDP Compliance Assessment', status:'Active', period:'Jan 2025 – Mar 2025', compliancePct:'67%' }].map((a, i) => (
                <Card key={i}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[13px] font-semibold text-slate-900">{a.name}</p>
                      <p className="text-[12px] text-slate-500 mt-0.5">{a.period}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusChip status="In Progress" />
                      <span className="text-[14px] font-bold text-blue-600">{a.compliancePct}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* ── Actions ── */}
          {activeTab === 'Actions' && (
            <div className="space-y-2">
              {assetActions.length > 0 ? assetActions.map(a => (
                <div key={a.id} onClick={() => navigate(`/org/actions/${a.id}`)}
                  className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                  <PriorityChip priority={a.priority} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12.5px] font-medium text-slate-800 truncate">{a.title}</p>
                    <p className="text-[11px] text-slate-400">{a.controlName} · {a.assignee}</p>
                  </div>
                  <StatusChip status={a.status} />
                </div>
              )) : <div className="text-center py-10 text-slate-400 text-[13px]">No improvement actions for this asset</div>}
            </div>
          )}

          {/* ── Evidence ── */}
          {activeTab === 'Evidence' && (
            <div className="space-y-2">
              {assetEvidence.length > 0 ? assetEvidence.map(ev => (
                <div key={ev.id} className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg">
                  <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-[12.5px] font-medium text-slate-800">{ev.title}</p>
                    <p className="text-[11px] text-slate-400">{ev.type} · {ev.submittedBy} · {ev.submittedDate}</p>
                  </div>
                  <MonoBadge>{ev.version}</MonoBadge>
                  <StatusChip status={ev.status} />
                </div>
              )) : <div className="text-center py-10 text-slate-400 text-[13px]">No evidence submitted for this asset yet</div>}
            </div>
          )}

          {/* ── Audit Trail ── */}
          {activeTab === 'Audit Trail' && (
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              {[
                { time:'2025-03-08 14:32', user:'Manish Kumar', action:'submitted evidence for Encryption Configuration', icon:FileText },
                { time:'2025-03-01 09:15', user:'Priya Sharma', action:'created Improvement Action ACT-001', icon:Clock },
                { time:'2025-02-20 11:00', user:'System', action:`auto-mapped ${asset.totalControls} controls to ${asset.name}`, icon:CheckSquare },
                { time:'2024-06-15 10:00', user:'Amit Rao', action:'registered asset during onboarding', icon:Database },
              ].map((entry, i, arr) => (
                <div key={i} className={`flex gap-3 px-4 py-3 ${i < arr.length - 1 ? 'border-b border-slate-100' : ''}`}>
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <entry.icon className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-[11px] font-mono text-slate-400">{entry.time}</p>
                    <p className="text-[12.5px] text-slate-700 mt-0.5">
                      <strong className="font-semibold">{entry.user}</strong> <span className="text-slate-500">{entry.action}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="w-64 flex-shrink-0 space-y-3">
          <Card>
            <h3 className="text-[12px] font-semibold text-slate-700 mb-3">Compliance Score</h3>
            <div className="flex items-center justify-center my-2">
              <div className="relative w-24 h-24">
                <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
                  <circle cx="48" cy="48" r="40" fill="none" stroke="#E2E8F0" strokeWidth="8" />
                  <circle cx="48" cy="48" r="40" fill="none"
                    stroke={compliancePct >= 80 ? '#22C55E' : compliancePct >= 50 ? '#F59E0B' : '#EF4444'}
                    strokeWidth="8"
                    strokeDasharray={`${(compliancePct / 100) * 251.2} 251.2`}
                    strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[18px] font-bold text-slate-900" style={{ fontFamily:'Sora,sans-serif' }}>{compliancePct}%</span>
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              {[['text-green-600','Compliant',asset.compliantControls],['text-blue-600','In Progress',2],['text-slate-400','Not Started',asset.totalControls-asset.compliantControls-2],['text-red-500','Non-Compliant',0]].map(([color,label,val]) => (
                <div key={label as string} className="flex justify-between text-[12px]">
                  <span className={color as string}>● {label as string}</span>
                  <span className="font-medium text-slate-800">{val as number}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <h3 className="text-[12px] font-semibold text-slate-700 mb-2">Quick Stats</h3>
            <div className="space-y-1.5">
              {[
                ['Criticality', asset.criticality],
                ['Hosting', asset.hostingLocation],
                ['Internet Facing', asset.internetFacing ? '⚠ Yes (Public)' : '✓ Internal Only'],
                ['Open Actions', String(asset.openActions)],
                ['PII Records', String(asset.piiRecords.length)],
                ['Linked Policies', '3'],
                ['Vendor', asset.vendorName || 'None'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between text-[12px] gap-2">
                  <span className="text-slate-500 flex-shrink-0">{k}</span>
                  <span className={`font-medium text-right ${k === 'Internet Facing' ? (asset.internetFacing ? 'text-orange-600' : 'text-green-600') : 'text-slate-800'}`}>{v}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
