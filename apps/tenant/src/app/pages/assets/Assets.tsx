import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { Database, Monitor, ArrowLeftRight, Handshake, Globe, Server, Package, Cpu, Smartphone, HardDrive, Plus, ChevronRight, ChevronDown, Building2, Shield, Wifi, WifiOff } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const ASSET_TABS = ['All Assets', 'By Department', 'Suppliers', 'PII Records'] as const;
type AssetTab = typeof ASSET_TABS[number];

const CRIT: Record<string, string> = {
  Critical: 'bg-red-50 text-red-700', High: 'bg-orange-50 text-orange-700',
  Medium: 'bg-amber-50 text-amber-700', Low: 'bg-green-50 text-green-700',
};
const COMP: Record<string, string> = {
  'Fully Compliant': 'bg-green-50 text-green-700',
  'Partially Compliant': 'bg-amber-50 text-amber-700',
  'Non-Compliant': 'bg-red-50 text-red-700',
  'Not Started': 'bg-slate-100 text-slate-500',
};

const TYPE_ICON: Record<string, React.ReactNode> = {
  'Database / Data Store': <Database className="w-4 h-4 text-blue-500" />,
  'SaaS (Third-Party Hosted)': <Globe className="w-4 h-4 text-purple-500" />,
  'In-House (On-Premise)': <Server className="w-4 h-4 text-slate-500" />,
  'In-House (Cloud Hosted)': <Monitor className="w-4 h-4 text-indigo-500" />,
  'Outsourced / Managed Service': <Handshake className="w-4 h-4 text-green-500" />,
  'Third-Party (Cloud Hosted)': <Package className="w-4 h-4 text-orange-500" />,
  'API / Integration Layer': <ArrowLeftRight className="w-4 h-4 text-teal-500" />,
  'Mobile Application': <Smartphone className="w-4 h-4 text-pink-500" />,
  'Legacy System': <HardDrive className="w-4 h-4 text-yellow-600" />,
  'Physical / Hardware': <Cpu className="w-4 h-4 text-red-400" />,
};

const ASSETS = [
  { id:'AST-001', name:'Customer Database', assetType:'Database / Data Store', status:'Active', compliance:'Partially Compliant', compliantControls:12, totalControls:18, openActions:4, owner:'Manish Kumar', department:'Engineering', lastUpdated:'2 hours ago', registered:'2024-06-15', hostingLocation:'India (AWS ap-south-1)', internetFacing:false, vendorName:'', criticality:'Critical', piiRecords:[{id:'PR-001',categories:['Name','Email','Phone'],sensitivity:'High',purpose:'Customer account management',legalBasis:'Consent',retention:'3 years',deletionMechanism:'Hard delete + audit log',volume:'500000',crossBorderTransfer:false,crossBorderDestination:'',principalType:'Customer',sharedWithThirdParties:false},{id:'PR-002',categories:['Financial Data','Government ID'],sensitivity:'Critical',purpose:'KYC and regulatory compliance',legalBasis:'Legal Obligation',retention:'7 years',deletionMechanism:'Encrypted archival',volume:'120000',crossBorderTransfer:false,crossBorderDestination:'',principalType:'Customer',sharedWithThirdParties:false}] },
  { id:'AST-002', name:'HR Management System', assetType:'In-House (On-Premise)', status:'Active', compliance:'Fully Compliant', compliantControls:14, totalControls:14, openActions:0, owner:'Priya Sharma', department:'HR', lastUpdated:'1 day ago', registered:'2024-07-01', hostingLocation:'India (On-Premise)', internetFacing:false, vendorName:'', criticality:'High', piiRecords:[{id:'PR-003',categories:['Name','Address','Government ID','Biometric'],sensitivity:'High',purpose:'Payroll processing and HR management',legalBasis:'Contract',retention:'5 years post-exit',deletionMechanism:'Hard delete + legal hold',volume:'1200',crossBorderTransfer:false,crossBorderDestination:'',principalType:'Employee',sharedWithThirdParties:false}] },
  { id:'AST-003', name:'Customer to Payment Gateway', assetType:'API / Integration Layer', status:'Active', compliance:'Non-Compliant', compliantControls:3, totalControls:10, openActions:6, owner:'Manish Kumar', department:'Engineering', lastUpdated:'3 days ago', registered:'2024-06-20', hostingLocation:'India (Mumbai DC)', internetFacing:true, vendorName:'Razorpay Pvt. Ltd.', criticality:'Critical', piiRecords:[{id:'PR-004',categories:['Financial Data','Government ID'],sensitivity:'Critical',purpose:'Payment processing',legalBasis:'Contract',retention:'10 years',deletionMechanism:'Regulatory archival',volume:'850000',crossBorderTransfer:false,crossBorderDestination:'',principalType:'Customer',sharedWithThirdParties:true}] },
  { id:'AST-004', name:'AWS Cloud Infrastructure', assetType:'Third-Party (Cloud Hosted)', status:'Active', compliance:'Partially Compliant', compliantControls:8, totalControls:12, openActions:2, owner:'Manish Kumar', department:'Engineering', lastUpdated:'5 hours ago', registered:'2024-06-15', hostingLocation:'India (AWS ap-south-1)', internetFacing:true, vendorName:'Amazon Web Services', criticality:'High', piiRecords:[{id:'PR-005',categories:['Name','Email','Financial Data'],sensitivity:'High',purpose:'Data storage for production workloads',legalBasis:'Contract',retention:'3 years',deletionMechanism:'S3 lifecycle policies',volume:'500000',crossBorderTransfer:false,crossBorderDestination:'',principalType:'Customer',sharedWithThirdParties:true}] },
  { id:'AST-005', name:'Website Cookie Consent Banner', assetType:'SaaS (Third-Party Hosted)', status:'Active', compliance:'Fully Compliant', compliantControls:6, totalControls:6, openActions:0, owner:'Priya Sharma', department:'Marketing', lastUpdated:'2 weeks ago', registered:'2024-09-01', hostingLocation:'India (CDN)', internetFacing:true, vendorName:'CookieYes', criticality:'Low', piiRecords:[{id:'PR-006',categories:['Behavioural Data','Location Data'],sensitivity:'Low',purpose:'Consent tracking',legalBasis:'Consent',retention:'1 year',deletionMechanism:'Automatic expiry',volume:'48000',crossBorderTransfer:false,crossBorderDestination:'',principalType:'Customer',sharedWithThirdParties:false}] },
  { id:'AST-006', name:'CRM Portal', assetType:'SaaS (Third-Party Hosted)', status:'Under Review', compliance:'Not Started', compliantControls:0, totalControls:16, openActions:1, owner:'Amit Rao', department:'Sales', lastUpdated:'1 week ago', registered:'2024-08-15', hostingLocation:'India / US (Salesforce)', internetFacing:true, vendorName:'Salesforce Inc.', criticality:'Medium', piiRecords:[{id:'PR-007',categories:['Name','Email','Phone'],sensitivity:'Medium',purpose:'Sales pipeline management',legalBasis:'Legitimate Interest',retention:'3 years',deletionMechanism:'Salesforce deletion API',volume:'48000',crossBorderTransfer:true,crossBorderDestination:'United States',principalType:'Customer',sharedWithThirdParties:true}] },
];

const DEPARTMENTS = [
  { id:'D-001', name:'Engineering', owner:'Manish Kumar', itAdmin:'Manish Kumar', ia:'Rahul Mehta', assets:['AST-001','AST-003','AST-004'], suppliers:[{ id:'SUP-001',name:'Amazon Web Services',supplierType:'Cloud Provider',contactName:'AWS Account Team',contactEmail:'aws@technova.in',countryOfOperation:'India',dpaSigned:true,dpaDate:'2024-01-10',contractReference:'DPA-2024-001',criticality:'High',status:'Active',assets:['AST-004']}]},
  { id:'D-002', name:'HR', owner:'Priya Sharma', itAdmin:'Suresh Patel', ia:'Rahul Mehta', assets:['AST-002'], suppliers:[]},
  { id:'D-003', name:'Marketing', owner:'Anita Singh', itAdmin:'Anita Singh', ia:'Rahul Mehta', assets:['AST-005'], suppliers:[{ id:'SUP-002',name:'CookieYes Ltd.',supplierType:'SaaS Provider',contactName:'Support Team',contactEmail:'support@cookieyes.com',countryOfOperation:'India',dpaSigned:true,dpaDate:'2024-03-01',contractReference:'DPA-2024-003',criticality:'Low',status:'Active',assets:['AST-005']}]},
  { id:'D-004', name:'Sales', owner:'Ravi Pillai', itAdmin:'Ravi Pillai', ia:'Rahul Mehta', assets:['AST-006'], suppliers:[{ id:'SUP-003',name:'Salesforce Inc.',supplierType:'SaaS Provider',contactName:'Salesforce India',contactEmail:'sf@technova.in',countryOfOperation:'United States',dpaSigned:true,dpaDate:'2024-02-15',contractReference:'DPA-2024-002',criticality:'Medium',status:'Active',assets:['AST-006']}]},
];

const ALL_SUPPLIERS = DEPARTMENTS.flatMap(d => d.suppliers);
const ALL_PII = ASSETS.flatMap(a => a.piiRecords.map(p => ({ ...p, assetName: a.name, assetId: a.id, department: a.department })));

export function AssetsPage() {
  const navigate = useNavigate();
  const { role } = useApp();
  const [activeTab, setActiveTab] = useState<AssetTab>('All Assets');
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set(['D-001']));
  const canManage = role === 'ceo' || role === 'co';
  const toggle = (id: string) => setExpandedDepts(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const totalPII = ASSETS.reduce((s, a) => s + a.piiRecords.length, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-bold text-slate-900" style={{ fontFamily:'Sora, sans-serif' }}>Asset Register</h1>
          <p className="text-[12px] text-slate-400 mt-0.5">
            {ASSETS.length} assets · {DEPARTMENTS.length} departments · {ALL_SUPPLIERS.length} suppliers · {totalPII} PII records
          </p>
        </div>
        {canManage && (
          <button onClick={() => navigate('/org/assets/new')}
            className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-medium rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> Register Asset
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-0 overflow-x-auto">
        {ASSET_TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 text-[12.5px] font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${activeTab === tab ? 'border-blue-500 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            {tab}
            <span className="ml-1.5 text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-semibold">
              {tab === 'All Assets' ? ASSETS.length : tab === 'By Department' ? DEPARTMENTS.length : tab === 'Suppliers' ? ALL_SUPPLIERS.length : ALL_PII.length}
            </span>
          </button>
        ))}
      </div>

      {/* ── All Assets ────────────────────────────────────────────────────── */}
      {activeTab === 'All Assets' && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]" style={{ minWidth: 900 }}>
              <thead><tr className="border-b border-slate-100 bg-slate-50 text-left text-slate-500">
                {['Asset','Type','Department','Criticality','Hosting','Internet Facing','PII Records','Compliance','Owner','Updated',''].map(h => (
                  <th key={h} className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {ASSETS.map(a => (
                  <tr key={a.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 cursor-pointer" onClick={() => navigate(`/org/assets/${a.id}`)}>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <span className="flex-shrink-0">{TYPE_ICON[a.assetType] || <Database className="w-4 h-4 text-slate-400" />}</span>
                        <div>
                          <p className="font-semibold text-slate-800">{a.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{a.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-slate-500 max-w-[140px]"><span className="truncate block">{a.assetType}</span></td>
                    <td className="px-3 py-3 text-slate-500">{a.department}</td>
                    <td className="px-3 py-3"><span className={`text-[10.5px] px-2 py-0.5 rounded font-semibold ${CRIT[a.criticality]}`}>{a.criticality}</span></td>
                    <td className="px-3 py-3 text-slate-400 text-[11px]">{a.hostingLocation}</td>
                    <td className="px-3 py-3">
                      {a.internetFacing
                        ? <span className="flex items-center gap-1 text-orange-600 text-[11px] font-medium"><Wifi className="w-3 h-3" />Public</span>
                        : <span className="flex items-center gap-1 text-green-600 text-[11px] font-medium"><WifiOff className="w-3 h-3" />Internal</span>}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`text-[10.5px] px-2 py-0.5 rounded font-semibold ${a.piiRecords.length > 0 ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-400'}`}>
                        {a.piiRecords.length} record{a.piiRecords.length !== 1 ? 's' : ''}
                      </span>
                    </td>
                    <td className="px-3 py-3"><span className={`text-[10.5px] px-2 py-0.5 rounded font-semibold ${COMP[a.compliance] || 'bg-slate-100 text-slate-500'}`}>{a.compliance}</span></td>
                    <td className="px-3 py-3 text-slate-500">{a.owner}</td>
                    <td className="px-3 py-3 text-slate-400">{a.lastUpdated}</td>
                    <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                      {canManage && (
                        <div className="flex gap-1.5">
                          <button className="px-2 py-1 text-[10.5px] border border-slate-200 rounded text-slate-600 hover:bg-slate-50">Edit</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── By Department ─────────────────────────────────────────────────── */}
      {activeTab === 'By Department' && (
        <div className="space-y-3">
          {canManage && (
            <div className="flex justify-end">
              <button className="flex items-center gap-2 px-3 py-1.5 border border-blue-200 text-blue-600 text-[12px] font-medium rounded-lg hover:bg-blue-50">
                <Plus className="w-3.5 h-3.5" /> Add Department
              </button>
            </div>
          )}
          {DEPARTMENTS.map(dept => {
            const dAssets = ASSETS.filter(a => dept.assets.includes(a.id));
            const piiCount = dAssets.reduce((s, a) => s + a.piiRecords.length, 0);
            const isOpen = expandedDepts.has(dept.id);
            return (
              <div key={dept.id} className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <button onClick={() => toggle(dept.id)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left">
                  {isOpen ? <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                  <Building2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-[13px] font-bold text-slate-900">{dept.name}</p>
                    <p className="text-[10.5px] text-slate-400">Owner: {dept.owner} · IT Admin: {dept.itAdmin} · IA: {dept.ia}</p>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-400">
                    <span>{dAssets.length} assets</span>
                    <span>{dept.suppliers.length} suppliers</span>
                    <span className="text-red-500">{piiCount} PII records</span>
                  </div>
                </button>
                {isOpen && (
                  <div className="border-t border-slate-100">
                    {dAssets.map(asset => (
                      <div key={asset.id} className="flex items-center gap-3 px-5 py-2.5 border-b border-slate-50 last:border-0 hover:bg-slate-50 cursor-pointer" onClick={() => navigate(`/org/assets/${asset.id}`)}>
                        <span className="flex-shrink-0">{TYPE_ICON[asset.assetType] || <Database className="w-3.5 h-3.5 text-slate-400" />}</span>
                        <div className="flex-1">
                          <p className="text-[12.5px] font-semibold text-slate-800">{asset.name}</p>
                          <p className="text-[10.5px] text-slate-400">{asset.assetType} · {asset.hostingLocation}</p>
                        </div>
                        {asset.vendorName && <span className="text-[10px] text-slate-400">{asset.vendorName}</span>}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${CRIT[asset.criticality]}`}>{asset.criticality}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${asset.piiRecords.length > 0 ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-400'}`}>{asset.piiRecords.length} PII</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                      </div>
                    ))}
                    {canManage && (
                      <div className="px-5 py-2 bg-slate-50">
                        <button className="flex items-center gap-1 px-2.5 py-1 text-[11px] border border-dashed border-slate-300 rounded text-slate-400 hover:border-blue-400 hover:text-blue-500">
                          <Plus className="w-2.5 h-2.5" /> Add Asset to {dept.name}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Suppliers ─────────────────────────────────────────────────────── */}
      {activeTab === 'Suppliers' && (
        <div className="space-y-3">
          {canManage && (
            <div className="flex justify-end">
              <button className="flex items-center gap-2 px-3 py-1.5 border border-blue-200 text-blue-600 text-[12px] font-medium rounded-lg hover:bg-blue-50">
                <Plus className="w-3.5 h-3.5" /> Add Supplier
              </button>
            </div>
          )}
          {ALL_SUPPLIERS.map(sup => (
            <div key={sup.id} className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <Handshake className="w-4 h-4 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-slate-900">{sup.name}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                      <span>{sup.supplierType}</span><span>·</span>
                      <span>Contact: {sup.contactName}</span><span>·</span>
                      <span>{sup.contactEmail}</span><span>·</span>
                      <span>Country: {sup.countryOfOperation}</span><span>·</span>
                      <span className={`font-semibold ${CRIT[sup.criticality]}`}>{sup.criticality} criticality</span>
                    </div>
                    {sup.contractReference && <p className="text-[10.5px] text-slate-400 mt-0.5">Ref: {sup.contractReference}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                  <span className={`text-[11px] px-2 py-0.5 rounded font-semibold ${sup.dpaSigned ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                    DPA: {sup.dpaSigned ? `✓ Signed ${sup.dpaDate}` : '✗ Not Signed'}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 bg-blue-50 text-blue-700 rounded font-semibold">{sup.assets.length} asset{sup.assets.length !== 1 ? 's' : ''}</span>
                  {canManage && <button className="px-2 py-1 text-[10.5px] border border-slate-200 rounded text-slate-600 hover:bg-slate-50">Edit</button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── PII Records ───────────────────────────────────────────────────── */}
      {activeTab === 'PII Records' && (
        <div className="space-y-3">
          {ALL_PII.map(rec => (
            <div key={rec.id} className="bg-white border border-slate-200 rounded-lg p-4 cursor-pointer hover:border-blue-200 transition-colors" onClick={() => navigate(`/org/assets/${rec.assetId}`)}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-[13px] font-bold text-slate-900">{rec.assetName}</p>
                  <p className="text-[11px] text-slate-400">Dept: {rec.department} · {rec.principalType} data · Volume: {parseInt(rec.volume).toLocaleString()} principals</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10.5px] px-2 py-0.5 rounded font-semibold ${CRIT[rec.sensitivity] || 'bg-slate-100 text-slate-500'}`}>{rec.sensitivity}</span>
                  {rec.crossBorderTransfer && <span className="text-[10.5px] px-2 py-0.5 bg-amber-50 text-amber-700 rounded font-semibold">⚠ Cross-border</span>}
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11.5px]">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">PII Categories</p>
                  <div className="flex flex-wrap gap-1">{rec.categories.map(c => <span key={c} className="px-1.5 py-0.5 bg-red-50 text-red-700 rounded text-[10px] font-medium">{c}</span>)}</div>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Legal Basis</p>
                  <p className="text-slate-700 font-medium">{rec.legalBasis}</p>
                  <p className="text-slate-500 text-[11px]">{rec.purpose.slice(0, 40)}{rec.purpose.length > 40 ? '…' : ''}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Retention</p>
                  <p className="text-slate-700 font-medium">{rec.retention}</p>
                  <p className="text-slate-400 text-[11px]">{rec.deletionMechanism || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Transfer & Sharing</p>
                  <p className={`font-medium text-[11px] ${rec.crossBorderTransfer ? 'text-amber-600' : 'text-green-600'}`}>{rec.crossBorderTransfer ? `⚠ Transfer to ${rec.crossBorderDestination}` : '✓ Stays in India'}</p>
                  <p className={`font-medium text-[11px] ${rec.sharedWithThirdParties ? 'text-orange-600' : 'text-slate-400'}`}>{rec.sharedWithThirdParties ? 'Shared w/ 3rd parties' : 'Not shared'}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
