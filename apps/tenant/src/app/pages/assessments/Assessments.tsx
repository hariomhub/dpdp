import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus, Calendar } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAssessmentsList } from '../../../hooks/useAssessments';
import { StatusChip, PageHeader, Btn, TabNav, ProgressBar, Card } from '../../components/shared/DesignSystem';

export function AssessmentsPage() {
  const navigate = useNavigate();
  const { role } = useApp();
  const [activeTab, setActiveTab] = useState('Active');
  const { data: assessments = [], isLoading } = useAssessmentsList();
  
  const canCreate = role === 'co';

  const filtered = assessments.filter((a: any) =>
    activeTab === 'All' ? true : a.status.toUpperCase() === activeTab.toUpperCase()
  );

  return (
    <div>
      <PageHeader
        title="Assessments"
        sub={`${assessments.length} assessments total`}
        actions={canCreate ? (
          <Btn onClick={() => navigate('/org/assessments/new')} icon={<Plus className="w-4 h-4" />}>Create Assessment</Btn>
        ) : undefined}
      />

      <TabNav tabs={['Active', 'Completed', 'Archived', 'All']} active={activeTab} onChange={setActiveTab} />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {isLoading ? (
          <div className="col-span-full text-center py-16 text-slate-500">Loading assessments...</div>
        ) : filtered.map((ass: any) => {
          const assAssets = ass.assets || [];
          const pct = ass.totalControls > 0 ? Math.round((ass.compliantControls / ass.totalControls) * 100) : 0;
          
          const end = new Date(ass.endDate);
          const now = new Date();
          const daysRemaining = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          return (
            <Card key={ass.id} onClick={() => navigate(`/org/assessments/${ass.id}`)}>
              <div className="flex items-start justify-between mb-2.5">
                <div>
                  <h3 className="text-[15px] font-semibold text-slate-900 leading-snug">{ass.name}</h3>
                  <div className="flex items-center gap-1.5 mt-1 text-[13px] text-slate-400">
                    <Calendar className="w-3 h-3" />
                    {new Date(ass.startDate).toLocaleDateString()} → {new Date(ass.endDate).toLocaleDateString()}
                  </div>
                </div>
                <StatusChip status={ass.status === 'ACTIVE' ? 'In Progress' : ass.status} />
              </div>

              {/* Assets */}
              <div className="flex flex-wrap gap-1 mb-2.5">
                {assAssets.slice(0, 3).map((a: any) => (
                  <span key={a.asset.id} className="text-[12px] px-1.5 py-0.5 bg-slate-100 border border-[#D4AF37]/35 text-slate-600 rounded">{a.asset.name}</span>
                ))}
                {assAssets.length > 3 && (
                  <span className="text-[12px] px-1.5 py-0.5 bg-slate-100 border border-[#D4AF37]/35 text-slate-400 rounded">+{assAssets.length - 3} more</span>
                )}
              </div>

              {/* Progress */}
              <div className="mb-2.5">
                <div className="flex justify-between text-[13px] mb-1">
                  <span className="text-slate-500">{ass.compliantControls} / {ass.totalControls} controls compliant</span>
                  <span className="font-semibold text-slate-800">{pct}%</span>
                </div>
                <ProgressBar compliant={ass.compliantControls} inProgress={ass.totalControls - ass.compliantControls - 5} total={ass.totalControls} />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-[13px]">
                  {ass.openTasks > 0 && <span className="text-red-500">{ass.openTasks} open actions</span>}
                  {daysRemaining > 0 ? (
                    <span className={daysRemaining <= 7 ? 'text-red-500' : daysRemaining <= 14 ? 'text-amber-600' : 'text-green-600'}>
                      {daysRemaining} days remaining
                    </span>
                  ) : ass.status === 'COMPLETED' ? (
                    <span className="text-green-600">✓ Completed</span>
                  ) : null}
                </div>
                <button className="text-[13px] text-[#1A3E5C] hover:text-[#D4AF37] font-medium">View →</button>
              </div>
            </Card>
          );
        })}

        {!isLoading && filtered.length === 0 && (
          <div className="col-span-full text-center py-16">
            <p className="text-[16px] text-slate-400">No assessments found in this category.</p>
            {canCreate && <Btn className="mt-4" onClick={() => navigate('/org/assessments/new')} icon={<Plus className="w-4 h-4" />}>Create Assessment</Btn>}
          </div>
        )}
      </div>
    </div>
  );
}