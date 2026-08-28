import React, { useState } from 'react'
import {
  ShieldCheck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  Building2,
  Database,
  Users,
  FileCheck,
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useLogin } from '../../../hooks/useAuth'

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginFormData = z.infer<typeof loginSchema>

// Nodes represent tenant orgs / platform resources governed from this console —
// the card sits over the hub, and lines converge into it.
const NODES: { top: string; left: string; Icon: typeof Building2 }[] = [
  { top: '10%', left: '14%', Icon: Building2 },
  { top: '8%', left: '82%', Icon: Database },
  { top: '82%', left: '10%', Icon: Users },
  { top: '86%', left: '84%', Icon: FileCheck },
]

function LoginBackdrop() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-gradient-to-br from-[#05070f] via-slate-900 to-[#170b30]">
      {/* deep color wash for richness */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(135deg, rgba(79,70,229,0.28) 0%, rgba(30,27,75,0.15) 45%, rgba(88,28,135,0.22) 100%)',
        }}
      />

      {/* dot grid texture */}
      <div
        className="absolute inset-0 opacity-[0.1]"
        style={{
          backgroundImage:
            'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)',
          backgroundSize: '44px 44px',
        }}
      />

      {/* ambient glows */}
      <div
        className="absolute top-[-14%] right-[-8%] w-[620px] h-[620px] rounded-full opacity-30 blur-3xl"
        style={{ background: 'radial-gradient(circle, #6366f1, transparent 70%)' }}
      />
      <div
        className="absolute bottom-[-18%] left-[-10%] w-[560px] h-[560px] rounded-full opacity-25 blur-3xl"
        style={{ background: 'radial-gradient(circle, #7c3aed, transparent 70%)' }}
      />
      <div
        className="absolute top-[38%] left-[45%] w-[380px] h-[380px] rounded-full opacity-[0.14] blur-3xl"
        style={{ background: 'radial-gradient(circle, #22d3ee, transparent 70%)' }}
      />

      {/* concentric protection rings, centered on the card */}
      {[420, 620, 820].map((size) => (
        <div
          key={size}
          className="absolute top-1/2 left-1/2 rounded-full border border-white/[0.06]"
          style={{ width: size, height: size, transform: 'translate(-50%, -50%)' }}
        />
      ))}

      {/* connector lines from center hub to each governed node */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {NODES.map((n, i) => (
          <line
            key={i}
            x1={50}
            y1={50}
            x2={parseFloat(n.left)}
            y2={parseFloat(n.top)}
            stroke="white"
            strokeOpacity={0.14}
            strokeWidth={0.15}
          />
        ))}
      </svg>

      {/* governed-node markers */}
      {NODES.map(({ top, left, Icon }, i) => (
        <div
          key={i}
          className="absolute w-10 h-10 rounded-xl bg-white/[0.06] ring-1 ring-white/[0.12] flex items-center justify-center backdrop-blur-sm shadow-lg shadow-black/20"
          style={{ top, left, transform: 'translate(-50%, -50%)' }}
        >
          <Icon className="w-[18px] h-[18px] text-indigo-200/70" />
        </div>
      ))}
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
      style={{ fontFamily: 'DM Sans, sans-serif' }}
    >
      <LoginBackdrop />

      <div className="relative z-10 w-full max-w-[440px]">
        <div className="bg-white rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.55)] p-7 sm:p-8">
          {/* Logo */}
          <div className="flex flex-col items-center text-center mb-5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 flex items-center justify-center shadow-lg shadow-slate-900/25 mb-2.5 ring-1 ring-slate-900/5">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <span
              className="text-[18px] font-bold text-slate-900 tracking-tight"
              style={{ fontFamily: 'Sora, sans-serif' }}
            >
              DPDP CMS
            </span>
            <span className="text-[10px] font-semibold text-slate-400 tracking-[0.18em] uppercase mt-0.5">
              Admin Console
            </span>
          </div>

          {/* Heading */}
          <h2
            className="text-[20px] font-bold text-slate-900 text-center mb-1 tracking-tight"
            style={{ fontFamily: 'Sora, sans-serif' }}
          >
            System Access
          </h2>
          <p className="text-[13px] text-slate-400 text-center mb-5">
            Authenticate to manage platform infrastructure
          </p>

          {/* Error state */}
          {error && (
            <div className="mb-4 flex items-center gap-2.5 p-3 bg-red-50 rounded-lg">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
              <p className="text-[12.5px] text-red-700">
                {error.message || 'Invalid email or password'}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 mb-5">
            {/* Email field */}
            <div>
              <label className="block text-[11.5px] font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                Email Address
              </label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-700 transition-colors" />
                <input
                  type="email"
                  placeholder="admin@dpdpcms.in"
                  {...register('email')}
                  className="w-full h-11 pl-9 pr-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-[13px] focus:outline-none focus:bg-white focus:border-slate-800 focus:ring-2 focus:ring-slate-900/6 transition-all duration-150"
                />
              </div>
              {errors.email && (
                <p className="text-[11px] text-rose-500 mt-1.5 flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-rose-500 inline-block" />
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password field */}
            <div>
              <label className="block text-[11.5px] font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-700 transition-colors" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  {...register('password')}
                  className="w-full h-11 pl-9 pr-10 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-[13px] focus:outline-none focus:bg-white focus:border-slate-800 focus:ring-2 focus:ring-slate-900/6 transition-all duration-150"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-[11px] text-rose-500 mt-1.5 flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-rose-500 inline-block" />
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isPending}
              className="w-full h-11 bg-slate-900 hover:bg-slate-800 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed text-white text-[13px] font-semibold rounded-xl transition-all duration-150 flex items-center justify-center gap-2 mt-1 shadow-sm shadow-slate-900/20"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Authenticate Session'
              )}
            </button>
          </form>

          <p className="text-center text-[11.5px] text-slate-400 leading-relaxed">
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
            <span className="text-[11px] font-medium text-slate-300 tracking-wide">
              All systems operational
            </span>
          </div>
          <p className="text-[11px] text-slate-500">Restricted access — authorized personnel only</p>
        </div>
      </div>
    </div>
  )
}
