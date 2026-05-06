import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ShieldCheck, Lock, Eye, EyeOff, CheckCircle2, ArrowRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export function SetPasswordPage() {
  const navigate = useNavigate();
  const { token } = useParams();
  const { setRole } = useApp();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [step, setStep] = useState<'set-password' | 'ready'>('set-password');

  // Mock invite data — in production this would come from the server based on token
  const inviteData = {
    name: 'Amit Rao',
    org: 'TechNova Solutions Pvt. Ltd.',
    email: 'amit.rao@technova.in',
    role: 'CEO / Owner',
    isFirstLogin: true,
  };

  const strength = (() => {
    if (password.length === 0) return 0;
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  })();

  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strength];
  const strengthColor = ['', 'bg-red-400', 'bg-amber-400', 'bg-blue-400', 'bg-green-500'][strength];

  const handleSubmit = () => {
    setStep('ready');
  };

  const handleContinue = () => {
    setRole('ceo');
    if (inviteData.isFirstLogin) {
      navigate('/org/onboarding');
    } else {
      navigate('/org/dashboard');
    }
  };

  if (step === 'ready') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center" style={{ fontFamily: 'DM Sans, sans-serif' }}>
        <div className="bg-white rounded-2xl shadow-xl p-10 w-full max-w-md text-center">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-[20px] font-bold text-slate-900 mb-2" style={{ fontFamily: 'Sora, sans-serif' }}>
            Password Set Successfully!
          </h2>
          <p className="text-[13px] text-slate-500 mb-6 leading-relaxed">
            Welcome to DPDP CMS, <strong>{inviteData.name}</strong>. Your account is ready.
            {inviteData.isFirstLogin
              ? " Let's set up your organization to get started."
              : " You'll be taken to your dashboard now."}
          </p>
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg mb-6 text-left">
            <p className="text-[11px] text-blue-600 font-semibold uppercase tracking-wide mb-1">Your account</p>
            <p className="text-[13px] font-medium text-slate-900">{inviteData.name}</p>
            <p className="text-[12px] text-slate-500">{inviteData.email}</p>
            <p className="text-[12px] text-slate-500">{inviteData.role} · {inviteData.org}</p>
          </div>
          <button
            onClick={handleContinue}
            className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-semibold rounded-md transition-colors flex items-center justify-center gap-2"
          >
            {inviteData.isFirstLogin ? 'Start Organization Setup' : 'Go to Dashboard'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center" style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-md">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <span className="text-[18px] font-bold text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>DPDP CMS</span>
          </div>
          <h1 className="text-[20px] font-bold text-slate-900 mb-1" style={{ fontFamily: 'Sora, sans-serif' }}>
            Set Your Password
          </h1>
          <p className="text-[13px] text-slate-500">
            You've been invited by Super Admin to join <strong>{inviteData.org}</strong>
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          {/* Invite Info */}
          <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-lg mb-5">
            <div className="w-8 h-8 rounded-full bg-blue-200 flex items-center justify-center text-[12px] font-bold text-blue-700 flex-shrink-0">
              {inviteData.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <p className="text-[12px] font-semibold text-slate-800">{inviteData.name}</p>
              <p className="text-[11px] text-slate-500">{inviteData.email} · {inviteData.role}</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* New Password */}
            <div>
              <label className="block text-[12px] font-medium text-slate-600 mb-1">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="Create a strong password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full h-9 pl-9 pr-10 rounded-md bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 text-[13px] focus:outline-none focus:border-blue-500"
                />
                <button onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {/* Strength Indicator */}
              {password.length > 0 && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1,2,3,4].map(i => (
                      <div key={i} className={`flex-1 h-1 rounded-full transition-all ${i <= strength ? strengthColor : 'bg-slate-200'}`} />
                    ))}
                  </div>
                  <p className={`text-[11px] ${strength === 4 ? 'text-green-600' : strength >= 3 ? 'text-blue-600' : strength >= 2 ? 'text-amber-600' : 'text-red-500'}`}>
                    {strengthLabel} password
                  </p>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-[12px] font-medium text-slate-600 mb-1">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className={`w-full h-9 pl-9 pr-10 rounded-md bg-slate-50 border text-slate-900 placeholder-slate-400 text-[13px] focus:outline-none
                    ${confirmPassword && confirmPassword !== password ? 'border-red-400 focus:border-red-500' : 'border-slate-300 focus:border-blue-500'}`}
                />
                <button onClick={() => setShowConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPassword && confirmPassword !== password && (
                <p className="text-[11px] text-red-500 mt-1">Passwords do not match</p>
              )}
            </div>

            {/* Requirements */}
            <div className="p-3 bg-slate-50 rounded-md space-y-1">
              {[
                { label: 'At least 8 characters', met: password.length >= 8 },
                { label: 'One uppercase letter', met: /[A-Z]/.test(password) },
                { label: 'One number', met: /[0-9]/.test(password) },
                { label: 'One special character', met: /[^A-Za-z0-9]/.test(password) },
              ].map(req => (
                <div key={req.label} className="flex items-center gap-2">
                  <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0 ${req.met ? 'bg-green-500' : 'bg-slate-300'}`}>
                    {req.met && <svg viewBox="0 0 12 12" fill="none" className="w-2 h-2"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                  </div>
                  <span className={`text-[11px] ${req.met ? 'text-green-600' : 'text-slate-400'}`}>{req.label}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!password || password !== confirmPassword || strength < 2}
            className="w-full h-9 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[13px] font-semibold rounded-md transition-colors mt-5"
          >
            Set Password & Continue
          </button>
        </div>

        <p className="text-center text-[11px] text-slate-400 mt-4">
          Having trouble? Contact your Super Admin.
        </p>
      </div>
    </div>
  );
}
