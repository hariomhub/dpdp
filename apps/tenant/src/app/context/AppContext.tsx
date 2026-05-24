import React, { createContext, useContext, useState, useEffect } from 'react';

export type TenantRole = 'ceo' | 'co' | 'it_admin' | 'internal_auditor' | 'external_auditor';
export type AppMode = 'tenant' | 'superadmin';

interface AppContextType {
  role:               TenantRole;
  setRole:            (role: TenantRole) => void;
  mode:               AppMode;
  setMode:            (mode: AppMode) => void;
  sidebarCollapsed:   boolean;
  setSidebarCollapsed:(v: boolean) => void;
  orgName:            string;
  setOrgName:         (name: string) => void;
  userName:           string;
  setUserName:        (name: string) => void;
  userEmail:          string;
  setUserEmail:       (email: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [role,             setRole]             = useState<TenantRole>('ceo');
  const [mode,             setMode]             = useState<AppMode>('tenant');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [orgName,          setOrgName]          = useState('My Organization');
  const [userName,         setUserName]         = useState('');
  const [userEmail,        setUserEmail]        = useState('');

  useEffect(() => {
    document.documentElement.classList.remove('dark');
    document.documentElement.setAttribute('data-theme', 'light');
  }, []);

  return (
    <AppContext.Provider value={{
      role, setRole,
      mode, setMode,
      sidebarCollapsed, setSidebarCollapsed,
      orgName, setOrgName,
      userName, setUserName,
      userEmail, setUserEmail,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export const ROLE_LABELS: Record<TenantRole, string> = {
  ceo:               'Organization CEO',
  co:                'Compliance Officer',
  it_admin:          'IT Admin',
  internal_auditor:  'Internal Auditor',
  external_auditor:  'External Auditor',
};

export const ROLE_COLORS: Record<TenantRole, string> = {
  ceo:               '#8B5CF6',
  co:                '#3B82F6',
  it_admin:          '#F97316',
  internal_auditor:  '#06B6D4',
  external_auditor:  '#EAB308',
};

export const ROLE_INITIALS: Record<TenantRole, string> = {
  ceo:               'AR',
  co:                'PS',
  it_admin:          'MK',
  internal_auditor:  'RM',
  external_auditor:  'SJ',
};

export const ROLE_NAMES: Record<TenantRole, string> = {
  ceo:               'Amit Rao',
  co:                'Priya Sharma',
  it_admin:          'Manish Kumar',
  internal_auditor:  'Rahul Mehta',
  external_auditor:  'Sunita Joshi',
};