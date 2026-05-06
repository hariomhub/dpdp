import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus, Calendar } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatusChip, PageHeader, Btn, TabNav, ProgressBar, Card } from '../../components/shared/DesignSystem';
import { ASSESSMENTS, ASSETS } from '../../data/mockData';

export function AssessmentsPage() {
  const navigate = useNavigate();
  const { role } = useApp();
  const [activeTab, setActiveTab] = useState('Active');
  // FIX 6: local state initialized from mock data so new assessments appear instantly
  const [assessments, setAssessments] = useState(ASSESSMENTS);
  const canCreate = role === 'co';

  const filtered = assessments.filter(a =>
    activeTab === 'All' ? true : a.status === activeTab
  );

  return (
    <div>
      <PageHeader
        title="Assessments"
        sub={`${ASSESSMENTS.length} assessments total`}
        actions={canCreate ? (
          <Btn onClick={() => navigate('/org/assessments/new')} icon={<Plus className="w-4 h-4" />}>Create Assessment</Btn>
        ) : undefined}
      />

      <TabNav tabs={['Active', 'Completed', 'Archived', 'All']} active={activeTab} onChange={setActiveTab} />

      <div className="grid grid-cols-2 gap-3">
        {filtered.map(ass => {
          const assAssets = ASSETS.filter(a => ass.assets.includes(a.id));
          const pct = Math.round((ass.compliantControls / ass.totalControls) * 100);
          return (
            <Card key={ass.id} onClick={() => navigate(`/org/assessments/${ass.id}`)}>
              <div className="flex items-start justify-between mb-2.5">
                <div>
                  <h3 className="text-[13px] font-semibold text-slate-900 leading-snug">{ass.name}</h3>
                  <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-400">
                    <Calendar className="w-3 h-3" />
                    {ass.startDate} → {ass.endDate}
                  </div>
                </div>
                <StatusChip status={ass.status === 'Active' ? 'In Progress' : ass.status} />
              </div>

              {/* Assets */}
              <div className="flex flex-wrap gap-1 mb-2.5">
                {assAssets.slice(0, 3).map(a => (
                  <span key={a.id} className="text-[10px] px-1.5 py-0.5 bg-slate-100 border border-slate-200 text-slate-600 rounded">{a.name}</span>
                ))}
                {ass.assets.length > 3 && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 border border-slate-200 text-slate-400 rounded">+{ass.assets.length - 3} more</span>
                )}
              </div>

              {/* Progress */}
              <div className="mb-2.5">
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-500">{ass.compliantControls} / {ass.totalControls} controls compliant</span>
                  <span className="font-semibold text-slate-800">{pct}%</span>
                </div>
                <ProgressBar compliant={ass.compliantControls} inProgress={ass.totalControls - ass.compliantControls - 5} total={ass.totalControls} />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-[11px]">
                  {ass.openActions > 0 && <span className="text-red-500">{ass.openActions} open actions</span>}
                  {ass.daysRemaining > 0 ? (
                    <span className={ass.daysRemaining <= 7 ? 'text-red-500' : ass.daysRemaining <= 14 ? 'text-amber-600' : 'text-green-600'}>
                      {ass.daysRemaining} days remaining
                    </span>
                  ) : ass.status === 'Completed' ? (
                    <span className="text-green-600">✓ Completed</span>
                  ) : null}
                </div>
                <button className="text-[11px] text-blue-600 hover:text-blue-700 font-medium">View →</button>
              </div>
            </Card>
          );
        })}

        {filtered.length === 0 && (
          <div className="col-span-2 text-center py-16">
            <p className="text-[14px] text-slate-400">No assessments found in this category.</p>
            {canCreate && <Btn className="mt-4" onClick={() => navigate('/org/assessments/new')} icon={<Plus className="w-4 h-4" />}>Create Assessment</Btn>}
          </div>
        )}
      </div>
    </div>
  );
}