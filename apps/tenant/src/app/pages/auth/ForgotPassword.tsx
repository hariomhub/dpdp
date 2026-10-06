import React, { useState } from 'react';
import { Link } from 'react-router';
import { Mail, CheckCircle2, Loader2, ArrowLeft } from 'lucide-react';
import { useForgotPassword } from '../../../hooks/useAuth';
import { LogoIcon } from '../../components/shared/DesignSystem';

/** Ask for a password-reset link. The answer is the same whether or not the address has an account. */
export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const mutation = useForgotPassword();
  const looksLikeEmail = /^\S+@\S+\.\S+$/.test(email.trim());

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
          <h1 className="text-[24px] font-bold text-slate-900 mb-1" style={{ fontFamily: 'Cinzel, serif' }}>Forgot your password?</h1>
          <p className="text-[15px] text-slate-500">Enter your work email and we'll send you a link to choose a new one.</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          {mutation.isSuccess ? (
            <div className="text-center">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-[18px] font-bold text-slate-900 mb-2">Check your email</h2>
              <p className="text-[14.5px] text-slate-500 mb-5 leading-relaxed">
                If an account exists for <strong>{email.trim()}</strong>, a reset link is on its way. It works once and expires in
                60 minutes. Nothing arrived? Check your spam folder, or ask your Compliance Officer.
              </p>
              <Link to="/login" className="text-[14.5px] font-medium text-[#1A3E5C] hover:text-[#D4AF37] inline-flex items-center gap-1">
                <ArrowLeft className="w-4 h-4" /> Back to sign in
              </Link>
            </div>
          ) : (
            <form
              onSubmit={e => { e.preventDefault(); if (looksLikeEmail) mutation.mutate(email.trim()); }}
              className="space-y-4"
            >
              <div>
                <label className="block text-[14px] font-medium text-slate-600 mb-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email" autoComplete="email" autoFocus required
                    placeholder="you@company.com"
                    value={email} onChange={e => setEmail(e.target.value)}
                    className="w-full h-9 pl-9 pr-3 rounded-md bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 text-[15px] focus:outline-none focus:border-[#1A3E5C] focus:ring-1 focus:ring-[#1A3E5C]/30"
                  />
                </div>
              </div>
              <button
                type="submit" disabled={!looksLikeEmail || mutation.isPending}
                className="w-full h-10 bg-[#1A3E5C] hover:bg-[#15324a] disabled:opacity-50 text-white text-[15px] font-semibold rounded-md transition-colors flex items-center justify-center gap-2"
              >
                {mutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</> : 'Send reset link'}
              </button>
              <div className="text-center">
                <Link to="/login" className="text-[14px] text-slate-500 hover:text-[#1A3E5C] inline-flex items-center gap-1">
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
