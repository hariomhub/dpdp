import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Lock, Eye, EyeOff, CheckCircle2, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { useVerifyInvite, useSetPassword, storedTenantCode } from '../../../hooks/useAuth';
import { useApp } from '../../context/AppContext';
import { LogoIcon } from '../../components/shared/DesignSystem';

export function SetPasswordPage() {
  const navigate       = useNavigate();
  const { token = '' } = useParams<{ token: string }>();
  const { setRole }    = useApp();

  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass,        setShowPass]        = useState(false);
  const [showConfirm,     setShowConfirm]     = useState(false);
  const [successData,     setSuccessData]     = useState<null | {
    name: string; email: string; role: string; org: string; isFirstLogin: boolean;
  }>(null);

  // ── Verify invite on mount ─────────────────────────────────────────────────
  const { data: inviteData, isLoading: verifying, isError } = useVerifyInvite(token);

  // ── Set password mutation ──────────────────────────────────────────────────
  const setPasswordMutation = useSetPassword();

  const strength = (() => {
    if (!password.length) return 0;
    let s = 0;
    if (password.length >= 8)            s++;
    if (/[A-Z]/.test(password))          s++;
    if (/[0-9]/.test(password))          s++;
    if (/[^A-Za-z0-9]/.test(password))   s++;
    return s;
  })();

  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strength];
  const strengthColor = ['', 'bg-red-400', 'bg-amber-400', 'bg-[#D4AF37]', 'bg-green-500'][strength];
  const canSubmit     = strength >= 2 && password === confirmPassword && !!password;

  const handleSubmit = async () => {
    if (!canSubmit || !inviteData) return;
    const res = await setPasswordMutation.mutateAsync({
      token,
      password,
      name: inviteData.name,
    });
    if (res?.data) {
      // Persist tenantCode so login page auto-fills it on next visit
      if (inviteData.tenantCode) storedTenantCode.set(inviteData.tenantCode)
      setSuccessData({
        name:         res.data.user.name,
        email:        res.data.user.email,
        role:         inviteData.role     || res.data.user.role,
        org:          inviteData.orgName  || 'Your Organization',
        isFirstLogin: res.data.isFirstLogin,
      });
    }
  };

  const handleContinue = () => {
    if (!successData) return;
    if (successData.isFirstLogin) {
      navigate('/org/onboarding');
    } else {
      navigate('/org/dashboard');
    }
  };

  // ── Loading state ─────────────────────────────────────────────────────────
  if (verifying) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center" style={{ fontFamily: 'Inter, sans-serif' }}>
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-[#1A3E5C]" />
          <p className="text-[15px]">Verifying your invitation…</p>
        </div>
      </div>
    );
  }

  // ── Invalid / expired token ───────────────────────────────────────────────
  if (isError || !inviteData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center" style={{ fontFamily: 'Inter, sans-serif' }}>
        <div className="bg-white rounded-2xl shadow-xl p-10 w-full max-w-md text-center">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-[24px] font-bold text-slate-900 mb-2" style={{ fontFamily: 'Cinzel, serif' }}>
            Invalid or Expired Link
          </h2>
          <p className="text-[15px] text-slate-500 mb-6 leading-relaxed">
            This invitation link is invalid or has expired. Please contact your administrator to send a new invitation.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="w-full h-10 bg-[#1A3E5C] hover:bg-[#15324a] text-white text-[15px] font-semibold rounded-md transition-colors"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  // ── Success screen ────────────────────────────────────────────────────────
  if (successData) {
    const roleLabel: Record<string, string> = {
      CEO:               'CEO / Owner',
      CO:                'Compliance Officer',
      IT_ADMIN:          'IT Admin',
      INTERNAL_AUDITOR:  'Internal Auditor',
      EXTERNAL_AUDITOR:  'External Auditor',
    };

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center" style={{ fontFamily: 'Inter, sans-serif' }}>
        <div className="bg-white rounded-2xl shadow-xl p-10 w-full max-w-md text-center">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-[24px] font-bold text-slate-900 mb-2" style={{ fontFamily: 'Cinzel, serif' }}>
            Password Set Successfully!
          </h2>
          <p className="text-[15px] text-slate-500 mb-6 leading-relaxed">
            Welcome to NiyamSaathi, <strong>{successData.name}</strong>.
            {successData.isFirstLogin
              ? " Let's set up your organization to get started."
              : ' You\'ll be taken to your dashboard now.'}
          </p>
          <div className="p-3 bg-[#1A3E5C]/8 border border-[#D4AF37]/30 rounded-lg mb-6 text-left">
            <p className="text-[13px] text-[#1A3E5C] font-semibold uppercase tracking-wide mb-1">Your Account</p>
            <p className="text-[15px] font-medium text-slate-900">{successData.name}</p>
            <p className="text-[14px] text-slate-500">{successData.email}</p>
            <p className="text-[14px] text-slate-500">
              {roleLabel[successData.role] || successData.role} · {successData.org}
            </p>
          </div>
          <button
            onClick={handleContinue}
            className="w-full h-10 bg-[#1A3E5C] hover:bg-[#15324a] text-white text-[15px] font-semibold rounded-md transition-colors flex items-center justify-center gap-2"
          >
            {successData.isFirstLogin ? 'Start Organization Setup' : 'Go to Dashboard'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // ── Set password form ─────────────────────────────────────────────────────
  const roleLabel: Record<string, string> = {
    ceo:               'CEO / Owner',
    CEO:               'CEO / Owner',
    co:                'Compliance Officer',
    CO:                'Compliance Officer',
    it_admin:          'IT Admin',
    IT_ADMIN:          'IT Admin',
    internal_auditor:  'Internal Auditor',
    INTERNAL_AUDITOR:  'Internal Auditor',
    external_auditor:  'External Auditor',
    EXTERNAL_AUDITOR:  'External Auditor',
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-md">
              <LogoIcon className="w-8 h-8" />
            </div>
            <span className="text-[22px] font-bold text-slate-900" style={{ fontFamily: 'Cinzel, serif' }}>NiyamSaathi</span>
          </div>
          <h1 className="text-[24px] font-bold text-slate-900 mb-1" style={{ fontFamily: 'Cinzel, serif' }}>
            Set Your Password
          </h1>
          <p className="text-[15px] text-slate-500">
            You've been invited to join <strong>{inviteData.orgName || inviteData.name}</strong>
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          {/* Invite info */}
          <div className="flex items-center gap-3 p-3 bg-[#1A3E5C]/8 border border-[#D4AF37]/30 rounded-lg mb-5">
            <div className="w-8 h-8 rounded-full bg-[#1A3E5C]/18 flex items-center justify-center text-[14px] font-bold text-[#1A3E5C] flex-shrink-0">
              {(inviteData.name || inviteData.email || '?')[0].toUpperCase()}
            </div>
            <div>
              {inviteData.name && <p className="text-[14px] font-semibold text-slate-800">{inviteData.name}</p>}
              <p className="text-[13px] text-slate-500">
                {inviteData.email} · {roleLabel[inviteData.role] || inviteData.role}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* New Password */}
            <div>
              <label className="block text-[14px] font-medium text-slate-600 mb-1">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="Create a strong password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full h-9 pl-9 pr-10 rounded-md bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 text-[15px] focus:outline-none focus:border-[#1A3E5C]"
                />
                <button onClick={() => setShowPass(v => !v)} type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {password.length > 0 && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1,2,3,4].map(i => (
                      <div key={i} className={`flex-1 h-1 rounded-full transition-all ${i <= strength ? strengthColor : 'bg-slate-200'}`} />
                    ))}
                  </div>
                  <p className={`text-[13px] ${strength === 4 ? 'text-green-600' : strength >= 3 ? 'text-[#1A3E5C]' : strength >= 2 ? 'text-amber-600' : 'text-red-500'}`}>
                    {strengthLabel} password
                  </p>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-[14px] font-medium text-slate-600 mb-1">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className={`w-full h-9 pl-9 pr-10 rounded-md bg-slate-50 border text-slate-900 placeholder-slate-400 text-[15px] focus:outline-none
                    ${confirmPassword && confirmPassword !== password ? 'border-red-400 focus:border-red-500' : 'border-slate-300 focus:border-[#1A3E5C]'}`}
                />
                <button onClick={() => setShowConfirm(v => !v)} type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPassword && confirmPassword !== password && (
                <p className="text-[13px] text-red-500 mt-1">Passwords do not match</p>
              )}
            </div>

            {/* Requirements */}
            <div className="p-3 bg-slate-50 rounded-md space-y-1">
              {[
                { label: 'At least 8 characters',  met: password.length >= 8 },
                { label: 'One uppercase letter',    met: /[A-Z]/.test(password) },
                { label: 'One number',              met: /[0-9]/.test(password) },
                { label: 'One special character',   met: /[^A-Za-z0-9]/.test(password) },
              ].map(req => (
                <div key={req.label} className="flex items-center gap-2">
                  <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0 ${req.met ? 'bg-green-500' : 'bg-slate-300'}`}>
                    {req.met && <svg viewBox="0 0 12 12" fill="none" className="w-2 h-2"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                  </div>
                  <span className={`text-[13px] ${req.met ? 'text-green-600' : 'text-slate-400'}`}>{req.label}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!canSubmit || setPasswordMutation.isPending}
            className="w-full h-9 bg-[#1A3E5C] hover:bg-[#15324a] disabled:opacity-50 disabled:cursor-not-allowed text-white text-[15px] font-semibold rounded-md transition-colors mt-5 flex items-center justify-center gap-2"
          >
            {setPasswordMutation.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Setting password…</>
            ) : 'Set Password & Continue'}
          </button>
        </div>

        <p className="text-center text-[13px] text-slate-400 mt-4">
          Having trouble? Contact your Super Admin.
        </p>
      </div>
    </div>
  );
}