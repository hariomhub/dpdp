import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { Bell, User, Zap, FolderOpen, ClipboardList, BarChart2, ArrowRight } from 'lucide-react';
import { PageHeader, TabNav, Btn } from '../../components/shared/DesignSystem';
import { NOTIFICATIONS } from '../../data/mockData';

const TYPE_ICONS: Record<string, React.ReactNode> = {
  action_rejected: <Zap className="w-4 h-4" />,
  action_overdue: <Zap className="w-4 h-4" />,
  evidence_submitted: <FolderOpen className="w-4 h-4" />,
  action_assigned: <Zap className="w-4 h-4" />,
  evidence_approved: <FolderOpen className="w-4 h-4" />,
  asset_status_changed: <ClipboardList className="w-4 h-4" />,
  policy_updated: <BarChart2 className="w-4 h-4" />,
  user_invited: <User className="w-4 h-4" />,
};

const PRIORITY_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  Critical: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  High:     { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },
  Medium:   { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  Low:      { bg: 'bg-slate-50', text: 'text-slate-600', dot: 'bg-slate-400' },
};

export function AlertsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('All');
  const [notifs, setNotifs] = useState(NOTIFICATIONS);

  const markAllRead = () => setNotifs(prev => prev.map(n => ({ ...n, unread: false })));

  const filtered = notifs.filter(n => {
    if (activeTab === 'All') return true;
    if (activeTab === 'Unread') return n.unread;
    if (activeTab === 'High Priority') return ['Critical', 'High'].includes(n.priority);
    if (activeTab === 'Informational') return ['Medium', 'Low'].includes(n.priority);
    return true;
  });

  const unreadCount = notifs.filter(n => n.unread).length;

  return (
    <div>
      <PageHeader
        title="Notifications"
        sub={`${unreadCount} unread notifications`}
        actions={
          <Btn variant="ghost" size="sm" onClick={markAllRead}>Mark All as Read</Btn>
        }
      />

      <TabNav tabs={['All', 'Unread', 'High Priority', 'Informational']} active={activeTab} onChange={setActiveTab} />

      <div className="space-y-2">
        {filtered.map(n => {
          const pColor = PRIORITY_COLORS[n.priority] || PRIORITY_COLORS.Low;
          return (
            <div
              key={n.id}
              onClick={() => { setNotifs(p => p.map(notif => notif.id === n.id ? { ...notif, unread: false } : notif)); navigate(n.link); }}
              className={`flex gap-3 p-3.5 rounded-lg border cursor-pointer transition-colors
                ${n.unread ? 'bg-blue-50/50 border-blue-200 hover:bg-blue-50' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
            >
              {/* Icon */}
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${pColor.bg}`}>
                <span className={pColor.text}>{TYPE_ICONS[n.type] || <Bell className="w-4 h-4" />}</span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <p className="text-[12.5px] font-semibold text-slate-800">{n.title}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${pColor.bg} ${pColor.text}`}>{n.priority}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] text-slate-400">{n.time}</span>
                    {n.unread && <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />}
                  </div>
                </div>
                <p className="text-[12px] text-slate-500 mt-0.5 leading-relaxed">{n.body}</p>
                <button className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700 mt-1.5 font-medium">
                  Go to record <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <Bell className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-[14px] font-medium text-slate-700">All caught up!</p>
            <p className="text-[13px] text-slate-400">No notifications in this category.</p>
          </div>
        )}
      </div>
    </div>
  );
}
