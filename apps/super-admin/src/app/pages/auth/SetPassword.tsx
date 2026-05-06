import React, { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { ShieldCheck, Lock, Eye, EyeOff, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react'
import { useApp } from '../../context/AppContext'

export function SetPasswordPage() {
  const navigate = useNavigate()
  const { token } = useParams()
  const { setRole } = useApp()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [step, setStep] = useState<'set-password' | 'ready'>('set-password')

  const inviteData = {
    name: 'Amit Rao',
    org: 'TechNova Solutions Pvt. Ltd.',
    email: 'amit.rao@technova.in',
    role: 'CEO / Owner',
    isFirstLogin: true,
  }

  const strength = (() => {
    if (password.length === 0) return 0
    let s = 0
    if (password.length >= 8) s++
    if (/[A-Z]/.test(password)) s++
    if (/[0-9]/.test(password)) s++
    if (/[^A-Za-z0-9]/.test(password)) s++
    return s
  })()

  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strength]
  const strengthColor = ['', 'bg-red-400', 'bg-amber-400', 'bg-blue-400', 'bg-green-500'][strength]
  const strengthTextColor = ['', 'text-red-500', 'text-amber-600', 'text-blue-600', 'text-green-600'][strength]

  const handleSubmit = () => setStep('ready')

  const handleContinue = () => {
    setRole('ceo')
    navigate(inviteData.isFirstLogin ? '/org/onboarding' : '/org/dashboard')
  }

  const requirements = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'One uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'One number', met: /[0-9]/.test(password) },
    { label: 'One special character', met: /[^A-Za-z0-9]/.test(password) },
  ]

  const initials = inviteData.name.split(' ').map(n => n[0]).join('')

  if (step === 'ready') {
    return (
      <div
        className="min-h-screen bg-slate-50 flex items-center justify-center p-4"
        style={{ fontFamily: 'DM Sans, sans-serif' }}
      >
        {/* Dot grid */}
        <div
          className="fixed inset-0 pointer-events-none opacity-40"
          style={{
            backgroundImage: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
        <div className="relative bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.08)] p-10 w-full max-w-md text-center">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5 ring-4 ring-green-100">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h2
            className="text-[22px] font-bold text-slate-900 mb-2 tracking-tight"
            style={{ fontFamily: 'Sora, sans-serif' }}
          >
            Password Set Successfully!
          </h2>
          <p className="text-[13px] text-slate-500 mb-7 leading-relaxed">
            Welcome to DPDP CMS, <strong className="text-slate-700">{inviteData.name}</strong>.
            Your account is ready.{' '}
            {inviteData.isFirstLogin
              ? "Let's set up your organization to get started."
              : "You'll be taken to your dashboard now."}
          </p>

          <div className="p-4 bg-slate-50 rounded-xl mb-6 text-left">
            <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-widest mb-2">
              Your account
            </p>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-[12px] font-bold text-slate-600 flex-shrink-0">
                {initials}
              </div>
              <div>
                <p className="text-[13px] font-semibold text-slate-900">{inviteData.name}</p>
                <p className="text-[11.5px] text-slate-500">{inviteData.email}</p>
                <p className="text-[11.5px] text-slate-500">{inviteData.role} · {inviteData.org}</p>
              </div>
            </div>
          </div>

          <button
            onClick={handleContinue}
            className="w-full h-10 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white text-[13px] font-semibold rounded-lg transition-all flex items-center justify-center gap-2 shadow-sm shadow-blue-600/25"
          >
            {inviteData.isFirstLogin ? 'Start Organization Setup' : 'Go to Dashboard'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen bg-slate-50 flex items-center justify-center p-4"
      style={{ fontFamily: 'DM Sans, sans-serif' }}
    >
      {/* Dot grid */}
      <div
        className="fixed inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      <div className="relative w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-7">
          <div className="flex items-center justify-center gap-2.5 mb-5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-600/30">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <span
              className="text-[18px] font-bold text-slate-900 tracking-tight"
              style={{ fontFamily: 'Sora, sans-serif' }}
            >
              DPDP CMS
            </span>
          </div>
          <h1
            className="text-[21px] font-bold text-slate-900 mb-1.5 tracking-tight"
            style={{ fontFamily: 'Sora, sans-serif' }}
          >
            Set Your Password
          </h1>
          <p className="text-[13px] text-slate-500 leading-relaxed">
            You've been invited by Super Admin to join{' '}
            <strong className="text-slate-700">{inviteData.org}</strong>
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.08)] p-7">

          {/* Invite info card */}
          <div className="flex items-center gap-3 p-3.5 bg-blue-50 rounded-xl mb-6">
            <div className="w-9 h-9 rounded-full bg-blue-200 flex items-center justify-center text-[12px] font-bold text-blue-700 flex-shrink-0">
              {initials}
            </div>
            <div>
              <p className="text-[12.5px] font-semibold text-slate-800">{inviteData.name}</p>
              <p className="text-[11.5px] text-slate-500">{inviteData.email} · {inviteData.role}</p>
            </div>
          </div>

          <div className="space-y-4">

            {/* New Password */}
            <div>
              <label className="block text-[11.5px] font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                New Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-700 transition-colors" />
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="Create a strong password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full h-10 pl-9 pr-10 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-[13px] focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Strength indicator */}
              {password.length > 0 && (
                <div className="mt-2.5">
                  <div className="flex gap-1 mb-1.5">
                    {[1, 2, 3, 4].map(i => (
                      <div
                        key={i}
                        className={`flex-1 h-1 rounded-full transition-all duration-300 ${i <= strength ? strengthColor : 'bg-slate-200'}`}
                      />
                    ))}
                  </div>
                  <p className={`text-[11px] font-semibold ${strengthTextColor}`}>
                    {strengthLabel} password
                  </p>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-[11.5px] font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                Confirm Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-700 transition-colors" />
                <input
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className={`w-full h-10 pl-9 pr-10 rounded-lg bg-slate-50 border text-slate-900 placeholder-slate-400 text-[13px] focus:outline-none focus:bg-white transition-all focus:ring-2 ${
                    confirmPassword && confirmPassword !== password
                      ? 'border-red-400 focus:border-red-400 focus:ring-red-500/10'
                      : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500/10'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPassword && confirmPassword !== password && (
                <p className="text-[11px] text-red-500 mt-1.5 flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-red-500 inline-block" />
                  Passwords do not match
                </p>
              )}
            </div>

            {/* Requirements checklist */}
            <div className="p-4 bg-slate-50 rounded-xl space-y-2">
              {requirements.map(req => (
                <div key={req.label} className="flex items-center gap-2.5">
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                      req.met ? 'bg-green-500 shadow-sm shadow-green-500/30' : 'bg-slate-200'
                    }`}
                  >
                    {req.met && (
                      <svg viewBox="0 0 12 12" fill="none" className="w-2 h-2">
                        <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <span className={`text-[11.5px] transition-colors duration-200 ${req.met ? 'text-green-600 font-medium' : 'text-slate-400'}`}>
                    {req.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!password || password !== confirmPassword || strength < 2}
            className="w-full h-10 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed text-white text-[13px] font-semibold rounded-lg transition-all mt-5 shadow-sm shadow-blue-600/25 flex items-center justify-center gap-2"
          >
            Set Password & Continue
          </button>
        </div>

        <p className="text-center text-[11.5px] text-slate-400 mt-5">
          Having trouble? Contact your Super Admin.
        </p>
      </div>
    </div>
  )
}