import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ShieldCheck, Mail, Lock, Eye, EyeOff, ChevronDown } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useApp, ROLE_LABELS, ROLE_COLORS, TenantRole } from '../../context/AppContext';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const { setRole } = useApp();
  const [selectedRole, setSelectedRole] = useState<TenantRole>('ceo');
  const [roleDropOpen, setRoleDropOpen] = useState(false);

  const roles: TenantRole[] = ['ceo', 'co', 'it_admin', 'internal_auditor', 'external_auditor'];

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = (_data: LoginFormData) => {
    setRole(selectedRole);
    if (selectedRole === 'ceo') {
      navigate('/org/onboarding');
    } else {
      navigate('/org/dashboard');
    }
  };

  return (
    <div className="flex h-screen bg-slate-50" style={{ fontFamily: 'DM Sans, sans-serif' }}>
      {/* Left Panel */}
      <div className="hidden lg:flex w-[50%] flex-col justify-between p-12 bg-gradient-to-br from-blue-700 to-blue-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)', backgroundSize: '50px 50px' }} />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/20 backdrop-blur flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <span className="text-[20px] font-bold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>DPDP CMS</span>
          </div>
        </div>

        <div className="relative z-10">
          <h1 className="text-[36px] font-bold text-white leading-tight mb-4" style={{ fontFamily: 'Sora, sans-serif' }}>
            India's DPDP<br />Compliance,<br />Simplified.
          </h1>
          <p className="text-[15px] text-blue-100 leading-relaxed max-w-md">
            Assess, manage, and prove compliance with the Digital Personal Data Protection Act 2023. Built for Indian organizations, by compliance experts.
          </p>
        </div>

        <div className="relative z-10 flex gap-4">
          {['Evidence-Based', 'Audit-Ready', 'Role-Governed'].map(f => (
            <div key={f} className="flex items-center gap-2 text-blue-100">
              <div className="w-2 h-2 rounded-full bg-blue-300" />
              <span className="text-[13px] font-medium">{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center bg-white p-8">
        <div className="w-full max-w-[360px]">
          <div className="flex justify-center mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
          </div>

          <h2 className="text-[20px] font-bold text-slate-900 text-center mb-1" style={{ fontFamily: 'Sora, sans-serif' }}>Sign in to your account</h2>
          <p className="text-[13px] text-slate-500 text-center mb-6">Enter your credentials to continue</p>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 mb-4">
            <div>
              <label className="block text-[12px] font-medium text-slate-600 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  placeholder="you@organization.in"
                  {...register('email')}
                  className="w-full h-9 pl-9 pr-3 rounded-md bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 text-[13px] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100"
                />
              </div>
              {errors.email && <p className="text-[11px] text-rose-500 mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-[12px] font-medium text-slate-600 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <PasswordInput register={register} />
              </div>
              {errors.password && <p className="text-[11px] text-rose-500 mt-1">{errors.password.message}</p>}
            </div>

            {/* Role Dropdown */}
            <div>
              <label className="block text-[12px] font-medium text-slate-600 mb-1">Demo Role</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setRoleDropOpen(v => !v)}
                  className="w-full h-9 px-3 pr-8 rounded-md bg-slate-50 border border-slate-300 text-slate-900 text-[13px] text-left focus:outline-none focus:border-blue-500 flex items-center gap-2"
                >
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: ROLE_COLORS[selectedRole] }} />
                  {ROLE_LABELS[selectedRole]}
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3" />
                </button>
                {roleDropOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-md shadow-lg z-20 overflow-hidden">
                    {roles.map(r => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => { setSelectedRole(r); setRoleDropOpen(false); }}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-[12.5px] text-left hover:bg-slate-50 transition-colors
                          ${selectedRole === r ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700'}`}
                      >
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: ROLE_COLORS[r] }} />
                        {ROLE_LABELS[r]}
                        {r === 'ceo' && <span className="ml-auto text-[10px] text-slate-400">→ Onboarding</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-3.5 h-3.5 accent-blue-600" />
                <span className="text-[12px] text-slate-500">Remember me</span>
              </label>
              <Link to="/forgot-password" className="text-[12px] text-blue-600 hover:text-blue-700">Forgot password?</Link>
            </div>

            <button
              type="submit"
              className="w-full h-9 bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-semibold rounded-md transition-colors"
            >
              Sign In as {ROLE_LABELS[selectedRole]}
            </button>
          </form>

          <p className="text-center text-[12px] text-slate-400 mt-5">
            Don't have an account?{' '}
            <span className="text-slate-600">Contact your administrator.</span>
          </p>
        </div>
      </div>
    </div>
  );
}

function PasswordInput({ register }: { register: any }) {
  const [show, setShow] = useState(false);
  return (
    <>
      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
      <input
        type={show ? 'text' : 'password'}
        placeholder="••••••••"
        {...register('password')}
        className="w-full h-9 pl-9 pr-10 rounded-md bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 text-[13px] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100"
      />
      <button type="button" onClick={() => setShow(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </>
  );
}
