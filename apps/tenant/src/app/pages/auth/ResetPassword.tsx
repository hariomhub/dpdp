import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Lock, Eye, EyeOff, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';
import { useResetPassword } from '../../../hooks/useAuth';
import { LogoIcon } from '../../components/shared/DesignSystem';

// Same rules the server enforces (and the invitation page uses): 8+ characters, an uppercase letter, a number, a symbol.
const RULES: { label: string; test: (p: string) => boolean }[] = [
  { label: 'At least 8 characters',      test: p => p.length >= 8 },
  { label: 'An uppercase letter',        test: p => /[A-Z]/.test(p) },
  { label: 'A number',                   test: p => /[0-9]/.test(p) },
  { label: 'A special character',        test: p => /[^A-Za-z0-9]/.test(p) },
];

/** Choose a new password using the single-use link from the reset email. */
export function ResetPasswordPage() {
  const navigate       = useNavigate();
  const { token = '' } = useParams<{ token: string }>();
  const mutation       = useResetPassword();

  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [show,     setShow]     = useState(false);

  const passed    = RULES.filter(r => r.test(password)).length;
  const canSubmit = passed === RULES.length && password === confirm && !!token;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-md">
              <LogoIcon className="w-8 h-8" />
            </div>
            <span className="text-[22px] font-bold text-slate-900" style={{ fontFamily: 'Cinzel, serif' }}>NiyamSaathi</span>
          </div>
          <h1 className="text-[24px] font-bold text-slate-900 mb-1" style={{ fontFamily: 'Cinzel, serif' }}>Choose a new password</h1>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          {mutation.isSuccess ? (
            <div className="text-center">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-[18px] font-bold text-slate-900 mb-2">Password changed</h2>
              <p className="text-[14.5px] text-slate-500 mb-5">For your security you've been signed out everywhere. Sign in with your new password.</p>
              <button
                onClick={() => navigate('/login')}
                className="w-full h-10 bg-[#1A3E5C] hover:bg-[#15324a] text-white text-[15px] font-semibold rounded-md transition-colors flex items-center justify-center gap-2"
              >
                Go to sign in <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <form onSubmit={e => { e.preventDefault(); if (canSubmit) mutation.mutate({ token, password }); }} className="space-y-4">
              <div>
                <label className="block text-[14px] font-medium text-slate-600 mb-1">New password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={show ? 'text' : 'password'} autoComplete="new-password" autoFocus
                    value={password} onChange={e => setPassword(e.target.value)}
                    className="w-full h-9 pl-9 pr-10 rounded-md bg-slate-50 border border-slate-300 text-slate-900 text-[15px] focus:outline-none focus:border-[#1A3E5C] focus:ring-1 focus:ring-[#1A3E5C]/30"
                  />
                  <button type="button" onClick={() => setShow(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" aria-label={show ? 'Hide password' : 'Show password'}>
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5">
                  {RULES.map(r => (
                    <li key={r.label} className={`text-[13px] flex items-center gap-1.5 ${r.test(password) ? 'text-green-600' : 'text-slate-400'}`}>
                      <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" /> {r.label}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <label className="block text-[14px] font-medium text-slate-600 mb-1">Confirm new password</label>
                <input
                  type={show ? 'text' : 'password'} autoComplete="new-password"
                  value={confirm} onChange={e => setConfirm(e.target.value)}
                  className="w-full h-9 px-3 rounded-md bg-slate-50 border border-slate-300 text-slate-900 text-[15px] focus:outline-none focus:border-[#1A3E5C] focus:ring-1 focus:ring-[#1A3E5C]/30"
                />
                {confirm.length > 0 && password !== confirm && <p className="mt-1 text-[13px] text-red-500">The passwords don't match.</p>}
              </div>

              <button
                type="submit" disabled={!canSubmit || mutation.isPending}
                className="w-full h-10 bg-[#1A3E5C] hover:bg-[#15324a] disabled:opacity-50 text-white text-[15px] font-semibold rounded-md transition-colors flex items-center justify-center gap-2"
              >
                {mutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : 'Change password'}
              </button>
              <p className="text-center text-[13.5px] text-slate-500">
                Link expired or already used? <Link to="/forgot-password" className="font-medium text-[#1A3E5C] hover:text-[#D4AF37]">Request a new one</Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
