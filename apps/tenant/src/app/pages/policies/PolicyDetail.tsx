import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, Edit2 } from 'lucide-react';
import { StatusChip, MonoBadge, TabNav, Btn, Card } from '../../components/shared/DesignSystem';
import { POLICIES, CONTROLS, ASSETS } from '../../data/mockData';
import { useApp } from '../../context/AppContext';

export function PolicyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role } = useApp();
  const [activeTab, setActiveTab] = useState('Document');
  const policy = POLICIES.find(p => p.id === id) || POLICIES[0];
  const canManage = role === 'ceo' || role === 'co';

  const versions = [
    { version: 'v2.1', date: '2025-01-15', status: 'Active', author: 'Priya Sharma' },
    { version: 'v2.0', date: '2024-09-01', status: 'Archived (superseded)', author: 'Priya Sharma' },
    { version: 'v1.3', date: '2024-06-01', status: 'Archived (superseded)', author: 'Amit Rao' },
    { version: 'v1.0', date: '2024-01-01', status: 'Archived (superseded)', author: 'Amit Rao' },
  ];

  return (
    <div>
      <button onClick={() => navigate('/org/policies')} className="flex items-center gap-1.5 text-[15px] text-slate-500 hover:text-slate-800 mb-3">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Policies
      </button>

      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <StatusChip status={policy.status} />
            <MonoBadge>{policy.version}</MonoBadge>
            {policy.effectiveDate && (
              <span className="text-[14px] text-slate-400">Effective: {policy.effectiveDate}</span>
            )}
          </div>
          <h1 className="text-[24px] font-bold text-slate-900" style={{ fontFamily: 'Cinzel, serif' }}>{policy.name}</h1>
          <p className="text-[14px] text-slate-500 mt-0.5">Owner: {policy.owner}</p>
        </div>
        {canManage && policy.status !== 'Retired' && (
          <Btn variant="secondary" icon={<Edit2 className="w-3.5 h-3.5" />} onClick={() => navigate(`/org/policies/${policy.id}/edit`)}>
            Edit Policy
          </Btn>
        )}
      </div>

      <TabNav tabs={['Document', 'Linked Controls', 'Linked Assets', 'Audit Trail']} active={activeTab} onChange={setActiveTab} />

      {activeTab === 'Document' && (
        <div className="space-y-3">
          <Card>
            <h3 className="text-[15px] font-semibold text-slate-800 mb-3">Version History</h3>
            <div className="space-y-2">
              {versions.map((v, i) => (
                <div key={i} className={`flex items-center justify-between p-3 rounded-lg border ${v.status === 'Active' ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-[#D4AF37]/35 opacity-70'}`}>
                  <div className="flex items-center gap-3">
                    <MonoBadge>{v.version}</MonoBadge>
                    <div>
                      <span className={`text-[13px] font-medium ${v.status === 'Active' ? 'text-green-700' : 'text-slate-400'}`}>{v.status}</span>
                      <p className="text-[13px] text-slate-400">{v.author} · {v.date}</p>
                    </div>
                  </div>
                  <button className="text-[13px] text-[#1A3E5C] hover:text-[#D4AF37] font-medium">View</button>
                </div>
              ))}
            </div>
            <p className="text-[13px] text-slate-400 mt-3 italic">Note: Only one version can be Active at a time. Saving a new version automatically archives the previous one.</p>
          </Card>

          <Card>
            <h3 className="text-[15px] font-semibold text-slate-800 mb-3">Policy Content</h3>
            <div className="bg-slate-50 border border-[#D4AF37]/35 rounded-lg p-4">
              <p className="text-[15px] text-slate-600 leading-relaxed mb-3">
                {policy.description}
              </p>
              <div className="space-y-3 text-[15px] text-slate-600">
                <p><strong className="font-semibold text-slate-800">1. Scope</strong><br />This policy applies to all employees, contractors, and third-party vendors who handle personal data on behalf of TechNova Solutions Pvt. Ltd.</p>
                <p><strong className="font-semibold text-slate-800">2. Purpose & Principles</strong><br />Personal data shall be processed lawfully, fairly, and transparently in accordance with the DPDP Act 2023...</p>
                <p><strong className="font-semibold text-slate-800">3. Data Subject Rights</strong><br />Data principals have the right to access, correct, and erase their personal data as specified in Chapter 3 of the DPDP Act...</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'Linked Controls' && (
        <div className="bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-[#D4AF37]/35">
                {['Control ID', 'Title', 'Chapter', 'Status'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[13px] font-semibold text-slate-500 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CONTROLS.slice(0, policy.linkedControls).map(ctrl => (
                <tr key={ctrl.id} className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => navigate(`/org/controls/${ctrl.id}`)}>
                  <td className="px-4 py-3"><MonoBadge>{ctrl.id}</MonoBadge></td>
                  <td className="px-4 py-3 text-[14.5px] text-slate-800">{ctrl.title}</td>
                  <td className="px-4 py-3 text-[14px] text-slate-500">{ctrl.chapter}</td>
                  <td className="px-4 py-3"><StatusChip status={ctrl.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'Linked Assets' && (
        <div className="space-y-2">
          {ASSETS.slice(0, policy.linkedAssets).map(asset => (
            <div key={asset.id} onClick={() => navigate(`/org/assets/${asset.id}`)}
              className="flex items-center justify-between p-3 bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] hover:bg-slate-50 cursor-pointer transition-colors">
              <div>
                <p className="text-[14.5px] font-medium text-slate-800">{asset.name}</p>
                <p className="text-[13px] text-slate-400">{asset.type}</p>
              </div>
              <StatusChip status={asset.compliance} />
            </div>
          ))}
        </div>
      )}

      {activeTab === 'Audit Trail' && (
        <div className="bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] overflow-hidden">
          {[
            { time: '2025-01-15', user: 'Priya Sharma', action: 'published version v2.1 (Active)' },
            { time: '2025-01-15', user: 'System', action: 'archived previous version v2.0' },
            { time: '2024-09-01', user: 'Priya Sharma', action: 'created version v2.0' },
            { time: '2024-06-01', user: 'Amit Rao', action: 'created this policy (v1.0)' },
          ].map((e, i, arr) => (
            <div key={i} className={`flex gap-4 px-4 py-3 ${i < arr.length - 1 ? 'border-b border-slate-100' : ''}`}>
              <p className="text-[13px] font-mono text-slate-400 w-28 flex-shrink-0">{e.time}</p>
              <p className="text-[14.5px] text-slate-700"><strong className="font-semibold">{e.user}</strong> <span className="text-slate-500">{e.action}</span></p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
