import React, { useState } from 'react';
import { KeyRound, LogOut } from 'lucide-react';
import { LogoIcon, BrandSpinner } from '../shared/DesignSystem';
import { useApp } from '../../context/AppContext';
import { useLogout } from '../../../hooks/useAuth';
import { useInstallLicence, useLicence } from '../../../hooks/usePlatform';

/**
 * Wraps every signed-in screen. An organization that has never had a licence installed cannot use the portal at all -
 * the server refuses everything except signing in/out and installing the licence - so instead of a page full of errors
 * the person sees this one screen: the CEO or a Compliance Officer pastes the licence, everyone else is told whom to ask.
 *
 * (A licence that was installed and has since lapsed is different: the portal stays read-only and fully viewable; that is
 * the banner in AppLayout, not this screen.)
 */
export function LicenceGate({ children }: { children: React.ReactNode }) {
  const { data, isLoading } = useLicence();

  // Until the licence state is known, do not render screens that would immediately be refused.
  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><BrandSpinner /></div>;
  if (data && data.mode === 'enforce' && data.state === 'UNLICENSED') return <LicenceRequired />;
  return <>{children}</>;
}

function LicenceRequired() {
  const { role } = useApp();
  const canInstall = role === 'ceo' || role === 'co';
  const install = useInstallLicence();
  const logout = useLogout();
  const [text, setText] = useState('');

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="bg-white rounded-2xl shadow-xl p-10 w-full max-w-xl space-y-5">
        <div className="flex items-center justify-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-md"><LogoIcon className="w-8 h-8" /></div>
          <span className="text-[22px] font-bold text-slate-900" style={{ fontFamily: 'Cinzel, serif' }}>NiyamSaathi</span>
        </div>
        <div className="text-center">
          <KeyRound className="w-10 h-10 text-[#D4AF37] mx-auto mb-2" />
          <h2 className="text-[22px] font-bold text-slate-900" style={{ fontFamily: 'Cinzel, serif' }}>A licence is required</h2>
          <p className="text-[14.5px] text-slate-500 mt-1">
            {canInstall
              ? 'This organization has no licence installed yet. Paste the licence you received to start using the portal.'
              : 'This organization has no licence installed yet, so the portal cannot be used. Please ask your CEO or Compliance Officer to install it.'}
          </p>
        </div>

        {canInstall && (
          <div className="space-y-3">
            <textarea value={text} onChange={e => setText(e.target.value)} rows={6} spellCheck={false} placeholder="Paste the licence here"
              className="w-full border border-slate-300 rounded-lg p-3 text-[12.5px] font-mono focus:outline-none focus:ring-2 focus:ring-[#1A3E5C]/30" />
            <button onClick={() => install.mutate(text.trim())} disabled={install.isPending || text.trim().length < 20}
              className="w-full h-10 bg-[#1A3E5C] hover:bg-[#15324a] text-white text-[15px] font-semibold rounded-lg transition-colors disabled:opacity-60">
              {install.isPending ? 'Installing…' : 'Install licence'}
            </button>
          </div>
        )}

        <button onClick={() => logout.mutate()} className="mx-auto flex items-center gap-1.5 text-[14px] text-slate-500 hover:text-slate-800">
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </div>
    </div>
  );
}
