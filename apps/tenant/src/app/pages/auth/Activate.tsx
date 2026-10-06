import React, { useState } from 'react';
import { Link } from 'react-router';
import { CheckCircle2, Copy, KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { LogoIcon } from '../../components/shared/DesignSystem';
import { useActivate, usePlatformStatus, type ActivationResult } from '../../../hooks/usePlatform';

/**
 * First-run activation. A fresh deployment has no organisation yet; whoever installs it pastes the licence they were
 * given (a signed file from the vendor). The deployment then creates the organisation and invites its CEO by itself.
 */
export function ActivatePage() {
  const [licence, setLicence] = useState('');
  const [done, setDone] = useState<ActivationResult | null>(null);
  const activate = useActivate();
  const status = usePlatformStatus();

  const submit = () => activate.mutate(licence.trim(), { onSuccess: (r) => setDone(r) });
  const copy = (text: string) => { navigator.clipboard?.writeText(text).then(() => toast.success('Copied')); };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="bg-white rounded-2xl shadow-xl p-10 w-full max-w-xl">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-md"><LogoIcon className="w-8 h-8" /></div>
          <span className="text-[22px] font-bold text-slate-900" style={{ fontFamily: 'Cinzel, serif' }}>NiyamSaathi</span>
        </div>

        {done ? (
          <div className="space-y-4 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto" />
            <h2 className="text-[22px] font-bold text-slate-900" style={{ fontFamily: 'Cinzel, serif' }}>{done.organization.name} is activated</h2>
            {done.ceoInvite ? (
              <>
                <p className="text-[15px] text-slate-600">
                  Send this link to <strong>{done.ceoInvite.email}</strong>. They will set a password and become the organization's CEO.
                  It works until {new Date(done.ceoInvite.expiresAt).toLocaleDateString('en-IN')}. (An email was also sent if outgoing mail is set up.)
                </p>
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-3 text-left">
                  <code className="text-[12.5px] text-slate-700 break-all flex-1">{done.ceoInvite.url}</code>
                  <button onClick={() => copy(done.ceoInvite!.url)} className="p-2 rounded hover:bg-slate-200" title="Copy"><Copy className="w-4 h-4" /></button>
                </div>
              </>
            ) : (
              <p className="text-[15px] text-slate-600">The organization already has its CEO. Sign in to continue.</p>
            )}
            <Link to="/login" className="inline-block w-full h-10 leading-10 bg-[#1A3E5C] hover:bg-[#15324a] text-white text-[15px] font-semibold rounded-lg">Go to sign in</Link>
          </div>
        ) : status.data?.activated ? (
          <div className="text-center space-y-4">
            <p className="text-[15px] text-slate-600">This deployment is already activated.</p>
            <Link to="/login" className="inline-block w-full h-10 leading-10 bg-[#1A3E5C] hover:bg-[#15324a] text-white text-[15px] font-semibold rounded-lg">Go to sign in</Link>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center">
              <KeyRound className="w-10 h-10 text-[#D4AF37] mx-auto mb-2" />
              <h2 className="text-[22px] font-bold text-slate-900" style={{ fontFamily: 'Cinzel, serif' }}>Activate this deployment</h2>
              <p className="text-[14.5px] text-slate-500 mt-1">Paste the licence you received. It sets up your organization and invites your CEO.</p>
            </div>
            <textarea value={licence} onChange={e => setLicence(e.target.value)} rows={6} spellCheck={false}
              placeholder="eyJhbGciOiJFZERTQSIs..."
              className="w-full border border-slate-300 rounded-lg p-3 text-[12.5px] font-mono focus:outline-none focus:ring-2 focus:ring-[#1A3E5C]/30" />
            <button onClick={submit} disabled={activate.isPending || licence.trim().length < 20}
              className="w-full h-10 bg-[#1A3E5C] hover:bg-[#15324a] text-white text-[15px] font-semibold rounded-lg transition-colors disabled:opacity-60">
              {activate.isPending ? 'Activating…' : 'Activate'}
            </button>
            <p className="text-center text-[13px] text-slate-400">Already activated? <Link to="/login" className="text-[#1A3E5C] font-medium">Sign in</Link></p>
          </div>
        )}
      </div>
    </div>
  );
}
