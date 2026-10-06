import React, { useState } from 'react';
import { useInstallLicence, useLicence } from '../../../hooks/usePlatform';

const STATE_LABEL: Record<string, { text: string; cls: string }> = {
  ACTIVE:     { text: 'Active',               cls: 'bg-green-100 text-green-700' },
  GRACE:      { text: 'Expired – grace period', cls: 'bg-amber-100 text-amber-800' },
  RESTRICTED: { text: 'Read-only',            cls: 'bg-red-100 text-red-700' },
  UNLICENSED: { text: 'No licence',           cls: 'bg-red-100 text-red-700' },
};

const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

/** The installed licence and how to renew it (CEO / Compliance Officer). */
export function SettingsLicence() {
  const { data, isLoading, isError, refetch } = useLicence();
  const install = useInstallLicence();
  const [text, setText] = useState('');
  const v = data;

  // A failed request must say so (and offer a retry) rather than look like a page that is still loading.
  if (isError) {
    return (
      <div className="space-y-3">
        <p className="text-[15px] text-red-600">The licence details could not be loaded.</p>
        <button onClick={() => refetch()} className="px-4 py-2 border border-slate-300 rounded-lg text-[14.5px] hover:bg-slate-50">Try again</button>
      </div>
    );
  }
  if (isLoading || !v) return <div className="animate-pulse h-32 bg-slate-100 rounded-lg" />;
  const badge = STATE_LABEL[v.state] ?? STATE_LABEL.UNLICENSED;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[18px] font-bold text-slate-900 mb-1" style={{ fontFamily: 'Cinzel, serif' }}>Licence</h2>
        <p className="text-[14px] text-slate-400">Your licence decides how long the portal stays fully usable. When it lapses the portal becomes read-only — you can always view and export your data.</p>
      </div>

      {v.mode === 'off' && <p className="text-[13.5px] bg-amber-50 border border-amber-200 text-amber-900 rounded-lg px-3 py-2">Licence checking is switched off on this server (development setting).</p>}

      <div className="grid grid-cols-2 gap-4 text-[14.5px]">
        <div><p className="text-slate-400 text-[13px]">Status</p><span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[13px] font-bold ${badge.cls}`}>{badge.text}</span></div>
        <div><p className="text-slate-400 text-[13px]">Plan</p><p className="font-semibold text-slate-800 mt-1">{v.plan ?? '—'}</p></div>
        <div><p className="text-slate-400 text-[13px]">Valid until</p><p className="font-semibold text-slate-800 mt-1">{fmt(v.validUntil)}{v.state === 'ACTIVE' && v.daysLeft !== null ? ` (${v.daysLeft} days left)` : ''}</p></div>
        <div><p className="text-slate-400 text-[13px]">Full function until</p><p className="font-semibold text-slate-800 mt-1">{fmt(v.graceUntil)}</p></div>
        {v.limits && (
          <div className="col-span-2"><p className="text-slate-400 text-[13px]">Limits</p>
            <p className="font-semibold text-slate-800 mt-1">{v.limits.maxUsers} users · {v.limits.maxAssessments} assessments · {v.limits.storageGb} GB storage</p></div>
        )}
      </div>

      <div className="border-t border-slate-100 pt-4 space-y-3">
        <p className="text-[15px] font-semibold text-slate-800">Install a new licence</p>
        <textarea value={text} onChange={e => setText(e.target.value)} rows={5} spellCheck={false} placeholder="Paste the licence you received"
          className="w-full border border-slate-300 rounded-lg p-3 text-[12.5px] font-mono focus:outline-none focus:ring-2 focus:ring-[#1A3E5C]/30" />
        <button onClick={() => install.mutate(text.trim(), { onSuccess: () => setText('') })} disabled={install.isPending || text.trim().length < 20}
          className="px-5 py-2 bg-[#1A3E5C] hover:bg-[#15324a] text-white text-[15px] font-semibold rounded-lg transition-colors disabled:opacity-60">
          {install.isPending ? 'Installing…' : 'Install licence'}
        </button>
      </div>
    </div>
  );
}
