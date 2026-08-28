import React, { useState } from 'react';
import { Link } from 'react-router';
import {
  ShieldCheck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Lock as LockIcon,
  FileCheck,
  UserCheck,
  Building2,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLogin } from '../../../hooks/useAuth';
import toast from 'react-hot-toast';
import { apiClient } from '../../../lib/api-client';

const loginSchema = z.object({
  email:    z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

// Nodes represent the compliance ecosystem around a tenant workspace —
// the card sits over the hub, and lines converge into it.
const NODES: { top: string; left: string; Icon: typeof LockIcon }[] = [
  { top: '10%', left: '15%', Icon: LockIcon },
  { top: '9%', left: '83%', Icon: FileCheck },
  { top: '83%', left: '12%', Icon: Building2 },
  { top: '87%', left: '85%', Icon: UserCheck },
];

function LoginBackdrop() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-gradient-to-br from-[#eef3fd] via-[#e4ecfb] to-[#dbe7fb]">
      {/* single-tone blue wash for richness */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(135deg, rgba(37,99,235,0.16) 0%, rgba(59,130,246,0.12) 50%, rgba(37,99,235,0.18) 100%)',
        }}
      />

      {/* dot grid texture */}
      <div
        className="absolute inset-0 opacity-[0.5]"
        style={{
          backgroundImage:
            'linear-gradient(#64748b 1px, transparent 1px), linear-gradient(90deg, #64748b 1px, transparent 1px)',
          backgroundSize: '44px 44px',
          maskImage: 'radial-gradient(circle at center, black, transparent 72%)',
          WebkitMaskImage: 'radial-gradient(circle at center, black, transparent 72%)',
        }}
      />

      {/* ambient glows — one consistent blue family, no hue shifts */}
      <div
        className="absolute top-[-16%] right-[-10%] w-[620px] h-[620px] rounded-full opacity-45 blur-3xl"
        style={{ background: 'radial-gradient(circle, #60a5fa, transparent 70%)' }}
      />
      <div
        className="absolute bottom-[-18%] left-[-12%] w-[560px] h-[560px] rounded-full opacity-40 blur-3xl"
        style={{ background: 'radial-gradient(circle, #3b82f6, transparent 70%)' }}
      />
      <div
        className="absolute top-[35%] left-[42%] w-[380px] h-[380px] rounded-full opacity-20 blur-3xl"
        style={{ background: 'radial-gradient(circle, #2563eb, transparent 70%)' }}
      />

      {/* concentric protection rings, centered on the card */}
      {[420, 620, 820].map((size) => (
        <div
          key={size}
          className="absolute top-1/2 left-1/2 rounded-full border border-slate-900/[0.06]"
          style={{ width: size, height: size, transform: 'translate(-50%, -50%)' }}
        />
      ))}

      {/* connector lines from center hub to each ecosystem node */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {NODES.map((n, i) => (
          <line
            key={i}
            x1={50}
            y1={50}
            x2={parseFloat(n.left)}
            y2={parseFloat(n.top)}
            stroke="#1e293b"
            strokeOpacity={0.1}
            strokeWidth={0.15}
          />
        ))}
      </svg>

      {/* ecosystem node markers */}
      {NODES.map(({ top, left, Icon }, i) => (
        <div
          key={i}
          className="absolute w-10 h-10 rounded-xl bg-white/80 ring-1 ring-slate-900/[0.08] flex items-center justify-center backdrop-blur-sm shadow-md shadow-slate-900/10"
          style={{ top, left, transform: 'translate(-50%, -50%)' }}
        >
          <Icon className="w-[18px] h-[18px] text-blue-600/60" />
        </div>
      ))}
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
      style={{ fontFamily: 'DM Sans, sans-serif' }}
    >
      <LoginBackdrop />

      <div className="relative z-10 w-full max-w-[440px]">
        <div className="bg-white rounded-2xl shadow-[0_20px_60px_-15px_rgba(15,23,42,0.25)] ring-1 ring-slate-900/[0.04] p-7 sm:p-8">
          {/* Logo */}
          <div className="flex flex-col items-center text-center mb-5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-600/25 mb-2.5">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <span className="text-[18px] font-bold text-slate-900 tracking-tight" style={{ fontFamily: 'Sora, sans-serif' }}>
              DPDP CMS
            </span>
            <span className="text-[10px] font-semibold text-blue-600/70 tracking-[0.18em] uppercase mt-0.5">
              Compliance Workspace
            </span>
          </div>

          <h2 className="text-[20px] font-bold text-slate-900 text-center mb-1 tracking-tight" style={{ fontFamily: 'Sora, sans-serif' }}>
            Welcome back
          </h2>
          <p className="text-[13px] text-slate-400 text-center mb-5">
            Sign in to continue your compliance workspace
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 mb-4">
            {/* Email */}
            <div>
              <label className="block text-[11.5px] font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                Email Address
              </label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                <input
                  type="email"
                  placeholder="you@organization.in"
                  {...register('email')}
                  className="w-full h-11 pl-9 pr-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-[13px] focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all duration-150"
                />
              </div>
              {errors.email && (
                <p className="text-[11px] text-rose-500 mt-1.5 flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-rose-500 inline-block" />
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11.5px] font-semibold text-slate-600 uppercase tracking-wide">
                  Password
                </label>
                <Link to="/forgot-password" className="text-[11.5px] font-medium text-blue-600 hover:text-blue-700">
                  Forgot password?
                </Link>
              </div>
              <PasswordInput register={register} />
              {errors.password && (
                <p className="text-[11px] text-rose-500 mt-1.5 flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-rose-500 inline-block" />
                  {errors.password.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full h-11 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed text-white text-[13px] font-semibold rounded-xl transition-all duration-150 flex items-center justify-center gap-2 mt-1 shadow-sm shadow-blue-600/25"
            >
              {loginMutation.isPending ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in…
                </>
              ) : 'Sign In'}
            </button>
          </form>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 bg-white text-[11.5px] text-slate-400">or</span>
            </div>
          </div>

          <button type="button" onClick={handleMicrosoftLogin} disabled={entraLoading}
            className="w-full h-11 bg-neutral-900 hover:bg-neutral-800 active:scale-[0.99] disabled:opacity-60 text-white text-[13px] font-medium rounded-xl transition-all duration-150 flex items-center justify-center gap-2.5 shadow-sm shadow-neutral-900/20">
            {entraLoading ? (
              <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
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

          <p className="text-center text-[12px] text-slate-400 mt-4">
            Don't have an account?{' '}
            <span className="text-slate-600">Contact your administrator.</span>
          </p>
        </div>

        {/* Status footer */}
        <div className="mt-4 flex flex-col items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/70 ring-1 ring-slate-900/[0.06] backdrop-blur-sm shadow-sm shadow-slate-900/5">
            <Lock className="w-3 h-3 text-blue-600/70" />
            <span className="text-[11px] font-medium text-slate-500 tracking-wide">
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
      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
      <input
        type={show ? 'text' : 'password'}
        placeholder="••••••••"
        {...register('password')}
        className="w-full h-11 pl-9 pr-10 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-[13px] focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all duration-150"
      />
      <button type="button" onClick={() => setShow(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}
