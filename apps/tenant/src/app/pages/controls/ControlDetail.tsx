import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, Lock } from 'lucide-react';
import { StatusChip, MonoBadge, TabNav, Card, Btn, PriorityChip, AssetTypeChip } from '../../components/shared/DesignSystem';
import { CONTROLS, ASSETS, ACTIONS } from '../../data/mockData';
import { useApp } from '../../context/AppContext';

export function ControlDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role } = useApp();
  const [activeTab, setActiveTab] = useState('Overview');
  const control = CONTROLS.find(c => c.id === id) || CONTROLS[0];
  const canManage = role === 'ceo' || role === 'co';

  const linkedActions = ACTIONS.filter(a => a.control === control.id);

  return (
    <div>
      <button onClick={() => navigate('/org/controls')} className="flex items-center gap-1.5 text-[13px] text-slate-500 hover:text-slate-800 mb-3">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Controls
      </button>

      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1.5">
          <MonoBadge>{control.id}</MonoBadge>
          <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-500 flex items-center gap-1">
            <Lock className="w-2.5 h-2.5" /> Platform Control
          </span>
          <span className={`text-[11px] px-2 py-0.5 rounded font-medium ${control.applicableTo === 'Both' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'}`}>
            {control.applicableTo}
          </span>
          <StatusChip status={control.status} />
        </div>
        <h1 className="text-[20px] font-bold text-slate-900 mb-0.5" style={{ fontFamily: 'Sora, sans-serif' }}>{control.title}</h1>
        <p className="text-[12px] text-slate-500">{control.chapter} · {control.section}</p>
      </div>

      <TabNav tabs={['Overview', 'Per-Asset Status', 'Actions', 'Evidence']} active={activeTab} onChange={setActiveTab} />

      {activeTab === 'Overview' && (
        <div className="space-y-3">
          <Card>
            <h3 className="text-[13px] font-semibold text-slate-800 mb-2">Description</h3>
            <p className="text-[13px] text-slate-600 leading-relaxed">{control.description}</p>
          </Card>
          <Card>
            <h3 className="text-[13px] font-semibold text-slate-800 mb-3">Applicable Asset Types</h3>
            <div className="flex flex-wrap gap-2">
              {control.assetTypes.map(t => (
                <AssetTypeChip key={t} type={t} />
              ))}
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'Per-Asset Status' && (
        <div>
          <p className="text-[12px] text-slate-500 mb-3">Compliance status of this control per asset — the same control can be Compliant on one asset and Non-Compliant on another.</p>
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {['Asset Name', 'Asset Type', 'Status', 'Open Actions', 'Last Updated', ''].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ASSETS.slice(0, 4).map((asset, i) => {
                  const statuses = ['Compliant', 'In Progress', 'Non-Compliant', 'Not Started'];
                  return (
                    <tr key={asset.id} className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => navigate(`/org/assets/${asset.id}`)}>
                      <td className="px-4 py-3 text-[12.5px] font-medium text-slate-800">{asset.name}</td>
                      <td className="px-4 py-3 text-[12px] text-slate-500">{asset.type}</td>
                      <td className="px-4 py-3"><StatusChip status={statuses[i] || 'Not Started'} /></td>
                      <td className="px-4 py-3 text-[12px] text-slate-600">{[2, 1, 3, 0][i]}</td>
                      <td className="px-4 py-3 text-[11px] text-slate-400">{asset.lastUpdated}</td>
                      <td className="px-4 py-3">
                        {canManage && <Btn size="sm" variant="secondary" onClick={e => { e.stopPropagation(); navigate('/org/actions/new'); }}>Create Action</Btn>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'Actions' && (
        <div className="space-y-2">
          {linkedActions.length > 0 ? linkedActions.map(action => (
            <div key={action.id} onClick={() => navigate(`/org/actions/${action.id}`)}
              className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
              <PriorityChip priority={action.priority} />
              <div className="flex-1">
                <p className="text-[12.5px] font-medium text-slate-800">{action.title}</p>
                <p className="text-[11px] text-slate-400">{action.assetName} · {action.assignee}</p>
              </div>
              <StatusChip status={action.status} />
            </div>
          )) : (
            <div className="text-center py-12 text-slate-400 text-[13px]">No improvement actions created for this control</div>
          )}
        </div>
      )}

      {activeTab === 'Evidence' && (
        <div className="text-center py-12 text-slate-400 text-[13px]">No evidence submitted for this control yet</div>
      )}
    </div>
  );
}
