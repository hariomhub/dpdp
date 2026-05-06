import React, { useState } from 'react'
import { ShieldCheck, Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useLogin } from '../../../hooks/useAuth'

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginFormData = z.infer<typeof loginSchema>

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
      className="flex h-screen bg-slate-50"
      style={{ fontFamily: 'DM Sans, sans-serif' }}
    >
      {/* Left Panel */}
      <div className="hidden lg:flex w-[45%] flex-col justify-between p-12 bg-slate-900 relative overflow-hidden">
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        {/* Subtle radial glow — bottom left only, very soft */}
        <div
          className="absolute bottom-0 left-0 w-[500px] h-[500px] opacity-[0.06]"
          style={{
            background: 'radial-gradient(circle at 0% 100%, #6366f1, transparent 70%)',
          }}
        />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center ring-1 ring-white/10">
              <ShieldCheck className="w-[18px] h-[18px] text-white" />
            </div>
            <span
              className="text-[18px] font-bold text-white tracking-tight"
              style={{ fontFamily: 'Sora, sans-serif' }}
            >
              DPDP CMS
            </span>
          </div>
        </div>

        {/* Center content */}
        <div className="relative z-10">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4">
            Super Admin Console
          </p>
          <h1
            className="text-[34px] font-bold text-white leading-[1.15] mb-5 tracking-tight"
            style={{ fontFamily: 'Sora, sans-serif' }}
          >
            Platform
            <br />
            Management
            <br />
            Console
          </h1>
          <p className="text-[13.5px] text-slate-400 leading-relaxed max-w-sm">
            Manage tenants, regulations, LMS content, billing, and platform
            configuration from a single interface.
          </p>

          {/* Divider */}
          <div className="w-10 h-px bg-slate-700 mt-8 mb-6" />

          {/* Stats row */}
          <div className="flex gap-7">
            {[
              { label: 'Organizations', value: 'Multi-tenant' },
              { label: 'All actions', value: 'Audit-logged' },
              { label: 'Access', value: 'Role-gated' },
            ].map(item => (
              <div key={item.value}>
                <p className="text-[15px] font-bold text-white">{item.value}</p>
                <p className="text-[10.5px] text-slate-500 mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom badges */}
        <div className="relative z-10 flex gap-3">
          {['Multi-tenant', 'Audit-logged', 'Role-gated'].map(f => (
            <div
              key={f}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.06] ring-1 ring-white/10"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
              <span className="text-[11px] font-medium text-slate-400">{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center bg-white p-8">
        <div className="w-full max-w-[360px]">

          {/* Icon */}
          <div className="flex justify-center mb-7">
            <div className="w-11 h-11 rounded-xl bg-slate-900 flex items-center justify-center shadow-lg shadow-slate-900/20">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
          </div>

          {/* Heading */}
          <h2
            className="text-[21px] font-bold text-slate-900 text-center mb-1 tracking-tight"
            style={{ fontFamily: 'Sora, sans-serif' }}
          >
            Super Admin Sign In
          </h2>
          <p className="text-[13px] text-slate-400 text-center mb-7">
            Platform-level access only
          </p>

          {/* Error state */}
          {error && (
            <div className="mb-5 flex items-center gap-2.5 p-3 bg-red-50 rounded-lg">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
              <p className="text-[12.5px] text-red-700">
                {error.message || 'Invalid email or password'}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mb-5">

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
                  className="w-full h-10 pl-9 pr-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-[13px] focus:outline-none focus:bg-white focus:border-slate-800 focus:ring-2 focus:ring-slate-900/6 transition-all duration-150"
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
                  className="w-full h-10 pl-9 pr-10 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-[13px] focus:outline-none focus:bg-white focus:border-slate-800 focus:ring-2 focus:ring-slate-900/6 transition-all duration-150"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
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
              className="w-full h-10 bg-slate-900 hover:bg-slate-800 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed text-white text-[13px] font-semibold rounded-lg transition-all duration-150 flex items-center justify-center gap-2 mt-1 shadow-sm shadow-slate-900/20"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In to Super Admin'
              )}
            </button>
          </form>

          <p className="text-center text-[11.5px] text-slate-400 leading-relaxed">
            This console is restricted to authorized platform administrators
            only.
          </p>
        </div>
      </div>
    </div>
  )
}