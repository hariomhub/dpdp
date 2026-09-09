import React, { useState } from 'react';
import { Link } from 'react-router';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLogin } from '../../../hooks/useAuth';
import toast from 'react-hot-toast';
import { apiClient } from '../../../lib/api-client';
import { BrandSpinner, LogoIcon } from '../../components/shared/DesignSystem';

const loginSchema = z.object({
  email:    z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

// Flat dark navy, no gradient, no logo. Two animated motifs instead — a
// shield with a slow protective "aura" pulse bottom-left, and a scanning
// security-mesh of connected, pulsing nodes top-right — built from generic
// shapes (not a trace of the brand mark) so this reads as ambient security/
// compliance texture, not a second copy of the logo.
function LoginBackdrop() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#16324a]">
      {/* bottom-left: shield with breathing protective rings */}
      <svg
        className="absolute -bottom-16 -left-16 w-[340px] h-[340px] pointer-events-none select-none"
        viewBox="0 0 240 260"
        aria-hidden="true"
      >
        <circle cx="120" cy="130" r="70" fill="none" stroke="#D4AF37" strokeWidth="1" opacity="0.22" style={{ transformOrigin: '120px 130px', animation: 'loginPulseRing 4.5s ease-out infinite' }} />
        <circle cx="120" cy="130" r="70" fill="none" stroke="#D4AF37" strokeWidth="1" opacity="0.22" style={{ transformOrigin: '120px 130px', animation: 'loginPulseRing 4.5s ease-out infinite 1.5s' }} />
        <circle cx="120" cy="130" r="70" fill="none" stroke="#D4AF37" strokeWidth="1" opacity="0.22" style={{ transformOrigin: '120px 130px', animation: 'loginPulseRing 4.5s ease-out infinite 3s' }} />
        <path
          d="M120 14 L214 52 L214 138 Q214 214 120 246 Q26 214 26 138 L26 52 Z"
          fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0.16"
        />
        <g opacity="0.22" style={{ transformOrigin: '120px 140px', animation: 'loginSoftPulse 3.2s ease-in-out infinite' }}>
          <rect x="100" y="128" width="40" height="30" rx="4" fill="none" stroke="#ffffff" strokeWidth="1.5" />
          <path d="M108 128 V114 a12 12 0 0 1 24 0 V128" fill="none" stroke="#ffffff" strokeWidth="1.5" />
        </g>
      </svg>

      {/* top-right: scanning security mesh */}
      <svg
        className="absolute -top-10 -right-10 w-[300px] h-[300px] pointer-events-none select-none"
        viewBox="0 0 260 260"
        aria-hidden="true"
      >
        <g stroke="#D4AF37" strokeWidth="1" opacity="0.2">
          <line x1="190" y1="70" x2="120" y2="40" />
          <line x1="190" y1="70" x2="230" y2="120" />
          <line x1="190" y1="70" x2="140" y2="130" />
          <line x1="140" y1="130" x2="90" y2="180" />
          <line x1="140" y1="130" x2="200" y2="190" />
        </g>
        <circle cx="190" cy="70" r="22" fill="none" stroke="#D4AF37" strokeOpacity="0.5" strokeWidth="1" strokeDasharray="3 4" style={{ transformOrigin: '190px 70px', animation: 'loginSpinSlow 18s linear infinite' }} />
        {[{ x: 190, y: 70, r: 5 }, { x: 120, y: 40, r: 3 }, { x: 230, y: 120, r: 3 }, { x: 140, y: 130, r: 4 }, { x: 90, y: 180, r: 3 }, { x: 200, y: 190, r: 3 }].map((n, i) => (
          <circle key={i} cx={n.x} cy={n.y} r={n.r} fill="#ffffff" opacity="0.35"
            style={{ transformOrigin: `${n.x}px ${n.y}px`, animation: `loginSoftPulse 2.8s ease-in-out infinite ${i * 0.4}s` }} />
        ))}
      </svg>

      <style>{`
        @keyframes loginPulseRing {
          0%   { transform: scale(0.6); opacity: 0.28; }
          70%  { transform: scale(1.15); opacity: 0; }
          100% { transform: scale(1.15); opacity: 0; }
        }
        @keyframes loginSoftPulse {
          0%, 100% { opacity: 0.18; transform: scale(1); }
          50%      { opacity: 0.4; transform: scale(1.08); }
        }
        @keyframes loginSpinSlow {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// Full-screen animated state shown while credentials are verified — the logo
// pulses at the center of expanding sonar-style rings until the request
// settles (useLogin navigates away on success; onError clears isPending).
function VerifyingOverlay() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#16324a]">
      <div className="relative flex items-center justify-center w-28 h-28 mb-6">
        <span className="absolute inset-0 rounded-full border border-[#D4AF37]/50 animate-ping" style={{ animationDuration: '2.1s' }} />
        <span className="absolute inset-2.5 rounded-full border border-[#D4AF37]/40 animate-ping" style={{ animationDuration: '2.1s', animationDelay: '0.35s' }} />
        <span className="absolute inset-5 rounded-full border border-white/30 animate-ping" style={{ animationDuration: '2.1s', animationDelay: '0.7s' }} />
        <div className="relative w-14 h-14 animate-pulse" style={{ filter: 'brightness(0) invert(1)' }}>
          <LogoIcon className="w-14 h-14" />
        </div>
      </div>
      <p className="text-white text-[15px] font-semibold tracking-wide" style={{ fontFamily: 'Cinzel, serif' }}>
        Verifying your credentials…
      </p>
      <p className="text-white/50 text-[14px] mt-1.5">Securely signing you in</p>
    </div>
  );
}

export function LoginPage() {
  const loginMutation = useLogin();
  const [entraLoading, setEntraLoading] = useState(false);

  const handleMicrosoftLogin = async () => {
    setEntraLoading(true);
    try {
      const data = await apiClient.get<any>('/entra/auth-url');
      if (data.success && data.data.authUrl) {
        window.location.href = data.data.authUrl;
      } else {
        throw new Error('Entra ID is not configured for this organization');
      }
    } catch (err: any) {
      toast.error(err.message || 'Microsoft sign-in unavailable');
      setEntraLoading(false);
    }
  };

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (data: LoginFormData) => {
    loginMutation.mutate(data);
  };

  return (
    <div
      className="relative h-screen flex items-center justify-center overflow-hidden px-4 py-5"
      style={{ fontFamily: 'Inter, sans-serif' }}
    >
      {loginMutation.isPending && <VerifyingOverlay />}
      <LoginBackdrop />

      <div className="relative z-10 w-full max-w-[440px]">
        <div className="bg-white rounded-2xl shadow-[0_20px_60px_-15px_rgba(15,23,42,0.25)] ring-1 ring-slate-900/[0.04] pt-3 sm:pt-4 px-6 sm:px-7 pb-6 sm:pb-7">
          {/* Logo */}
          <div className="flex flex-col items-center text-center mb-2">
            <LogoIcon className="w-16 h-16" />
            <span className="text-[18px] font-bold text-slate-900 tracking-tight" style={{ fontFamily: 'Cinzel, serif' }}>
              NiyamSaathi
            </span>
            <span className="text-[11.5px] font-semibold text-[#1A3E5C]/70 tracking-[0.18em] uppercase mt-0.5">
              Compliance Workspace
            </span>
          </div>

          <h2 className="text-[20px] font-bold text-slate-900 text-center mb-1 tracking-tight" style={{ fontFamily: 'Cinzel, serif' }}>
            Welcome back
          </h2>
          <p className="text-[14.5px] text-slate-500 text-center mb-4">
            Sign in to continue your compliance workspace
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 mb-3">
            {/* Email */}
            <div>
              <label className="block text-[13px] font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                Email Address
              </label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-[#1A3E5C] transition-colors" />
                <input
                  type="email"
                  placeholder="you@organization.in"
                  {...register('email')}
                  className="w-full h-11 pl-9 pr-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-[14.5px] focus:outline-none focus:bg-white focus:border-[#1A3E5C] focus:ring-2 focus:ring-[#1A3E5C]/10 transition-all duration-150"
                />
              </div>
              {errors.email && (
                <p className="text-[12.5px] text-rose-500 mt-1.5 flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-rose-500 inline-block" />
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[13px] font-semibold text-slate-600 uppercase tracking-wide">
                  Password
                </label>
                <Link to="/forgot-password" className="text-[13px] font-medium text-[#1A3E5C] hover:text-[#D4AF37]">
                  Forgot password?
                </Link>
              </div>
              <PasswordInput register={register} />
              {errors.password && (
                <p className="text-[12.5px] text-rose-500 mt-1.5 flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-rose-500 inline-block" />
                  {errors.password.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full h-11 bg-[#1A3E5C] hover:bg-[#15324a] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed text-white text-[14.5px] font-semibold rounded-full transition-all duration-150 flex items-center justify-center gap-2 mt-1 shadow-sm shadow-[#1A3E5C]/25"
            >
              {loginMutation.isPending ? (
                <>
                  <BrandSpinner size={18} ring="light" />
                  Signing in…
                </>
              ) : 'Sign In'}
            </button>
          </form>

          <div className="relative my-3">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 bg-white text-[13px] text-slate-500">or</span>
            </div>
          </div>

          <button type="button" onClick={handleMicrosoftLogin} disabled={entraLoading}
            className="w-full h-11 bg-neutral-900 hover:bg-neutral-800 active:scale-[0.99] disabled:opacity-60 text-white text-[14.5px] font-medium rounded-full transition-all duration-150 flex items-center justify-center gap-2.5 shadow-sm shadow-neutral-900/20">
            {entraLoading ? (
              <BrandSpinner size={16} ring="light" />
            ) : (
              <svg width="16" height="16" viewBox="0 0 21 21" fill="none">
                <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
                <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
                <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
                <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
              </svg>
            )}
            Sign in with Microsoft
          </button>

          <p className="text-center text-[13.5px] text-slate-500 mt-3">
            Don't have an account?{' '}
            <span className="text-slate-600">Contact your administrator.</span>
          </p>
        </div>

        {/* Status footer */}
        <div className="mt-4 flex flex-col items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white shadow-lg shadow-black/10">
            <Lock className="w-3 h-3 text-[#1A3E5C]/70" />
            <span className="text-[12.5px] font-medium text-slate-500 tracking-wide">
              Data handled per the DPDP Act, 2023
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PasswordInput({ register }: { register: any }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative group">
      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-[#1A3E5C] transition-colors" />
      <input
        type={show ? 'text' : 'password'}
        placeholder="••••••••"
        {...register('password')}
        className="w-full h-11 pl-9 pr-10 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-[14.5px] focus:outline-none focus:bg-white focus:border-[#1A3E5C] focus:ring-2 focus:ring-[#1A3E5C]/10 transition-all duration-150"
      />
      <button type="button" onClick={() => setShow(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-600">
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}
