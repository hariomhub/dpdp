import React, { useState } from 'react'
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Building2,
  Database,
  Users,
  FileCheck,
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useLogin } from '../../../hooks/useAuth'
import { BrandSpinner, LogoIcon } from '../../components/shared/DesignSystem'

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginFormData = z.infer<typeof loginSchema>

// Nodes represent tenant orgs / platform resources governed from this console —
// the card sits over the hub, and lines converge into it. Same hub-and-spoke
// concept as before, reskinned to navy/cyan with proper staggered animation
// instead of static blur blobs.
const NODES: { top: string; left: string; Icon: typeof Building2 }[] = [
  { top: '10%', left: '14%', Icon: Building2 },
  { top: '8%', left: '82%', Icon: Database },
  { top: '82%', left: '10%', Icon: Users },
  { top: '86%', left: '84%', Icon: FileCheck },
]

function LoginBackdrop() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#132C40]">
      {/* dot grid texture */}
      <div
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)',
          backgroundSize: '44px 44px',
        }}
      />

      {/* concentric protection rings, centered on the card, slowly breathing */}
      {[420, 620, 820].map((size, i) => (
        <div
          key={size}
          className="absolute top-1/2 left-1/2 rounded-full border border-[#94A3B8]/[0.08]"
          style={{
            width: size, height: size, transform: 'translate(-50%, -50%)',
            animation: `adminRingPulse 5s ease-in-out infinite ${i * 0.6}s`,
          }}
        />
      ))}

      {/* connector lines from center hub to each governed node */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {NODES.map((n, i) => (
          <line
            key={i}
            x1={50} y1={50}
            x2={parseFloat(n.left)} y2={parseFloat(n.top)}
            stroke="#94A3B8" strokeOpacity={0.16} strokeWidth={0.15}
          />
        ))}
      </svg>

      {/* governed-node markers, staggered pulse */}
      {NODES.map(({ top, left, Icon }, i) => (
        <div
          key={i}
          className="absolute w-10 h-10 rounded-xl bg-white/[0.06] ring-1 ring-[#94A3B8]/20 flex items-center justify-center backdrop-blur-sm shadow-lg shadow-black/20"
          style={{ top, left, transform: 'translate(-50%, -50%)', animation: `adminNodePulse 3s ease-in-out infinite ${i * 0.4}s` }}
        >
          <Icon className="w-[18px] h-[18px] text-[#CBD5E1]" />
        </div>
      ))}

      {/* slow scan ring around the hub */}
      <div
        className="absolute top-1/2 left-1/2 w-16 h-16 rounded-full border border-dashed border-[#94A3B8]/30"
        style={{ transform: 'translate(-50%, -50%)', animation: 'adminSpinSlow 16s linear infinite' }}
      />

      <style>{`
        @keyframes adminRingPulse {
          0%, 100% { opacity: 0.35; transform: translate(-50%, -50%) scale(0.97); }
          50%      { opacity: 0.7; transform: translate(-50%, -50%) scale(1.02); }
        }
        @keyframes adminNodePulse {
          0%, 100% { opacity: 0.7; transform: translate(-50%, -50%) scale(1); }
          50%      { opacity: 1; transform: translate(-50%, -50%) scale(1.06); }
        }
        @keyframes adminSpinSlow {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to   { transform: translate(-50%, -50%) rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

// Full-screen animated state shown while credentials are verified.
function VerifyingOverlay() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#132C40]">
      <div className="relative flex items-center justify-center w-28 h-28 mb-6">
        <span className="absolute inset-0 rounded-full border border-[#94A3B8]/50 animate-ping" style={{ animationDuration: '2.1s' }} />
        <span className="absolute inset-2.5 rounded-full border border-[#94A3B8]/40 animate-ping" style={{ animationDuration: '2.1s', animationDelay: '0.35s' }} />
        <span className="absolute inset-5 rounded-full border border-white/30 animate-ping" style={{ animationDuration: '2.1s', animationDelay: '0.7s' }} />
        <div className="relative w-14 h-14 animate-pulse" style={{ filter: 'brightness(0) invert(1)' }}>
          <LogoIcon className="w-14 h-14" />
        </div>
      </div>
      <p className="text-white text-[15px] font-semibold tracking-wide" style={{ fontFamily: 'Cinzel, serif' }}>
        Authenticating session…
      </p>
      <p className="text-white/50 text-[14px] mt-1.5">Verifying platform administrator access</p>
    </div>
  )
}

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const { mutate: login, isPending, error } = useLogin()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = (data: LoginFormData) => {
    login(data)
  }

  return (
    <div
      className="relative h-screen flex items-center justify-center overflow-hidden px-4 py-5"
      style={{ fontFamily: 'Inter, sans-serif' }}
    >
      {isPending && <VerifyingOverlay />}
      <LoginBackdrop />

      <div className="relative z-10 w-full max-w-[440px]">
        <div className="bg-white rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.55)] pt-4 px-6 sm:px-7 pb-6 sm:pb-7">
          {/* Logo */}
          <div className="flex flex-col items-center text-center mb-2">
            <LogoIcon className="w-16 h-16" />
            <span
              className="text-[18px] font-bold text-slate-900 tracking-tight"
              style={{ fontFamily: 'Cinzel, serif' }}
            >
              NiyamSaathi
            </span>
            <span className="text-[12px] font-semibold text-[#64748B] tracking-[0.18em] uppercase mt-0.5">
              Admin Console
            </span>
          </div>

          {/* Heading */}
          <h2
            className="text-[20px] font-bold text-slate-900 text-center mb-1 tracking-tight"
            style={{ fontFamily: 'Cinzel, serif' }}
          >
            System Access
          </h2>
          <p className="text-[14.5px] text-slate-500 text-center mb-4">
            Authenticate to manage platform infrastructure
          </p>

          {/* Error state */}
          {error && (
            <div className="mb-4 flex items-center gap-2.5 p-3 bg-red-50 rounded-lg">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
              <p className="text-[14px] text-red-700">
                {error.message || 'Invalid email or password'}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 mb-3">
            {/* Email field */}
            <div>
              <label className="block text-[13px] font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                Email Address
              </label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-[#1A3E5C] transition-colors" />
                <input
                  type="email"
                  placeholder="admin@niyamsaathi.in"
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

            {/* Password field */}
            <div>
              <label className="block text-[13px] font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-[#1A3E5C] transition-colors" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  {...register('password')}
                  className="w-full h-11 pl-9 pr-10 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-[14.5px] focus:outline-none focus:bg-white focus:border-[#1A3E5C] focus:ring-2 focus:ring-[#1A3E5C]/10 transition-all duration-150"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-[12.5px] text-rose-500 mt-1.5 flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-rose-500 inline-block" />
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isPending}
              className="w-full h-11 bg-[#1A3E5C] hover:bg-[#15324a] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed text-white text-[14.5px] font-semibold rounded-full transition-all duration-150 flex items-center justify-center gap-2 mt-1 shadow-sm shadow-[#1A3E5C]/25"
            >
              {isPending ? (
                <>
                  <BrandSpinner size={18} ring="light" />
                  Authenticating...
                </>
              ) : (
                'Authenticate Session'
              )}
            </button>
          </form>

          <p className="text-center text-[13px] text-slate-500 leading-relaxed">
            This console is restricted to authorized platform administrators only.
          </p>
        </div>

        {/* Status footer */}
        <div className="mt-4 flex flex-col items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.06] ring-1 ring-white/10 backdrop-blur-sm">
            <span className="relative flex w-1.5 h-1.5">
              <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-75 animate-ping motion-reduce:animate-none" />
              <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-emerald-400" />
            </span>
            <span className="text-[12.5px] font-medium text-slate-200 tracking-wide">
              All systems operational
            </span>
          </div>
          <p className="text-[12.5px] text-slate-500">Restricted access — authorized personnel only</p>
        </div>
      </div>
    </div>
  )
}
