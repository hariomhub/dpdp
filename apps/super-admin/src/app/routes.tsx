import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import { AdminLayout } from './components/layout/AdminLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/auth/Login';
import { SetPasswordPage } from './pages/auth/SetPassword';
import { AdminDashboardPage } from './pages/superadmin/AdminDashboard';
import { AdminOrganizationsPage } from './pages/superadmin/AdminOrganizations';
import { AdminControlsPage } from './pages/superadmin/AdminControls';
import { AdminLMSPage } from './pages/superadmin/AdminLMS';
import { AdminSettingsPage } from './pages/superadmin/AdminSettings';
import { AdminBillingPage } from './pages/superadmin/AdminBilling';
import { AdminAuditLogPage } from './pages/superadmin/AdminAuditLog';

const Protected = (C: React.ComponentType) => () => (
  <ProtectedRoute>
    <AdminLayout>
      <C />
    </AdminLayout>
  </ProtectedRoute>
)

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/forgot-password', element: <SetPasswordPage /> },
  { path: '/set-password', element: <SetPasswordPage /> },
  { path: '/invite/:token', element: <SetPasswordPage /> },

  // Super Admin
  { path: '/admin/dashboard', Component: Protected(AdminDashboardPage) },
  { path: '/admin/organizations', Component: Protected(AdminOrganizationsPage) },
  { path: '/admin/organizations/new', Component: Protected(AdminOrganizationsPage) },
  { path: '/admin/organizations/:id', Component: Protected(AdminOrganizationsPage) },
  { path: '/admin/controls', Component: Protected(AdminControlsPage) },
  { path: '/admin/lms', Component: Protected(AdminLMSPage) },
  { path: '/admin/settings', Component: Protected(AdminSettingsPage) },
  { path: '/admin/billing', Component: Protected(AdminBillingPage) },
  { path: '/admin/audit-log', Component: Protected(AdminAuditLogPage) },

  { path: '*', element: <Navigate to="/login" replace /> },
]);
