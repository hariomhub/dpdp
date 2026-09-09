import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Loader2, AlertCircle } from 'lucide-react';
import { apiClient } from '../../../lib/api-client';
import { useApp } from '../../context/AppContext';
import { LogoIcon } from '../../components/shared/DesignSystem';

const ROLE_MAP: Record<string, any> = {
  CEO: 'ceo', CO: 'co', IT_ADMIN: 'it_admin',
  INTERNAL_AUDITOR: 'internal_auditor', EXTERNAL_AUDITOR: 'external_auditor',
};

export function AuthCallbackPage() {
  const navigate        = useNavigate();
  const { setRole, setOrgName } = useApp();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params    = new URLSearchParams(window.location.search);
    const code      = params.get('code');
    const tenantId  = params.get('state');
    const errParam  = params.get('error');
    const errDesc   = params.get('error_description');

    if (errParam) {
      setError(errDesc?.replace(/\+/g, ' ') || 'Microsoft login was cancelled or denied.');
      return;
    }

    if (!code || !tenantId) {
      setError('Invalid callback — missing required parameters.');
      return;
    }

    const redirectUri = `${window.location.origin}/auth/callback`;

    apiClient.post<any>('/entra/login', { code, tenantId, redirectUri })
      .then((res: any) => {
        apiClient.tokens.set(res.data.accessToken, res.data.refreshToken);
        setRole(ROLE_MAP[res.data.user.role] ?? 'co');
        navigate('/org/dashboard', { replace: true });
      })
      .catch((err: Error) => {
        setError(err.message || 'Failed to complete Microsoft sign-in.');
      });
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center"
      style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="bg-white rounded-2xl shadow-xl p-10 w-full max-w-md text-center">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-md">
            <LogoIcon className="w-8 h-8" />
          </div>
          <span className="text-[22px] font-bold text-slate-900"
            style={{ fontFamily: 'Cinzel, serif' }}>NiyamSaathi</span>
        </div>

        {error ? (
          <>
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-[22px] font-bold text-slate-900 mb-2"
              style={{ fontFamily: 'Cinzel, serif' }}>Sign-in Failed</h2>
            <p className="text-[15px] text-slate-500 mb-6 leading-relaxed">{error}</p>
            <button onClick={() => navigate('/login')}
              className="w-full h-10 bg-[#1A3E5C] hover:bg-[#15324a] text-white text-[15px] font-semibold rounded-lg transition-colors">
              Back to Login
            </button>
          </>
        ) : (
          <>
            <Loader2 className="w-10 h-10 text-[#1A3E5C] animate-spin mx-auto mb-4" />
            <h2 className="text-[19px] font-bold text-slate-900 mb-1"
              style={{ fontFamily: 'Cinzel, serif' }}>Signing you in…</h2>
            <p className="text-[15px] text-slate-400">Verifying your Microsoft account</p>
          </>
        )}
      </div>
    </div>
  );
}