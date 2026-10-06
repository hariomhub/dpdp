import React from 'react';
import { useNavigate } from 'react-router';
import { AlertTriangle, Lock } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useLicence } from '../../../hooks/usePlatform';

/**
 * Tells people where the licence stands, without getting in the way: a quiet notice in the last 30 days of the term, a
 * warning during the grace period (everything still works), and a clear "read-only" bar once it has lapsed (everyone can
 * still look at everything and export; nothing can be changed until it is renewed).
 */
export function LicenceBanner() {
  const { data } = useLicence();
  const { role } = useApp();
  const navigate = useNavigate();
  const v = data;
  if (!v || v.mode === 'off') return null;

  const canRenew = role === 'ceo' || role === 'co';
  const renew = canRenew
    ? <button onClick={() => navigate('/org/settings?section=licence')} className="underline font-semibold ml-1">Renew licence</button>
    : <span className="ml-1">Please ask your Compliance Officer or CEO to renew it.</span>;

  if (v.state === 'ACTIVE' && v.daysLeft !== null && v.daysLeft <= 30) {
    return <Bar tone="notice" icon={<AlertTriangle className="w-4 h-4" />}>Your licence ends in {v.daysLeft} day{v.daysLeft === 1 ? '' : 's'}.{renew}</Bar>;
  }
  if (v.state === 'GRACE') {
    return <Bar tone="warn" icon={<AlertTriangle className="w-4 h-4" />}>
      Your licence has expired. Everything still works for {v.daysLeft} more day{v.daysLeft === 1 ? '' : 's'}; after that the portal becomes read-only.{renew}
    </Bar>;
  }
  if (v.state === 'RESTRICTED' || v.state === 'UNLICENSED') {
    const why = v.reason === 'revoked' ? 'Your licence has been withdrawn'
      : v.reason === 'clock' ? "This server's clock appears to have been set back"
      : v.state === 'UNLICENSED' ? 'No licence is installed' : 'Your licence has expired';
    return <Bar tone="danger" icon={<Lock className="w-4 h-4" />}>{why}, so the portal is read-only: you can view and export everything, but not make changes.{renew}</Bar>;
  }
  return null;
}

function Bar({ tone, icon, children }: { tone: 'notice' | 'warn' | 'danger'; icon: React.ReactNode; children: React.ReactNode }) {
  const cls = tone === 'danger' ? 'bg-red-50 text-red-800 border-red-200'
    : tone === 'warn' ? 'bg-amber-50 text-amber-900 border-amber-200'
    : 'bg-blue-50 text-blue-900 border-blue-200';
  return (
    <div className={`flex items-center gap-2 px-4 py-2 text-[13.5px] border-b ${cls}`} role="status">
      {icon}<span>{children}</span>
    </div>
  );
}
