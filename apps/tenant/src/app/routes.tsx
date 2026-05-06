import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import { AppLayout } from './components/layout/AppLayout';

import { LoginPage } from './pages/auth/Login';
import { SetPasswordPage } from './pages/auth/SetPassword';
import { OnboardingPage } from './pages/onboarding/Onboarding';
import { DashboardPage } from './pages/dashboard/Dashboard';
import { AssetsPage } from './pages/assets/Assets';
import { AssetDetailPage } from './pages/assets/AssetDetail';
import { AssetNewPage } from './pages/assets/AssetNew';
import { ControlsPage } from './pages/controls/Controls';
import { ControlDetailPage } from './pages/controls/ControlDetail';
import { AssessmentsPage } from './pages/assessments/Assessments';
import { AssessmentNewPage } from './pages/assessments/AssessmentNew';
import { AssessmentDetailPage } from './pages/assessments/AssessmentDetail';
import { ComplianceTasksPage } from './pages/tasks/ComplianceTasks';
import { RiskPage } from './pages/risk/Risk';
import { RiskReportsPage } from './pages/risk/RiskReports';
import { ReportsPage } from './pages/reports/Reports';
import { AlertsPage } from './pages/alerts/Alerts';
import { LMSPage } from './pages/lms/LMS';
import { UsersPage } from './pages/users/Users';
import { SettingsPage } from './pages/settings/Settings';

const T = (C: React.ComponentType) => () => <AppLayout><C /></AppLayout>;

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/forgot-password', element: <SetPasswordPage /> },
  { path: '/set-password', element: <SetPasswordPage /> },
  { path: '/invite/:token', element: <SetPasswordPage /> },
  { path: '/org/onboarding', element: <OnboardingPage /> },

  // Tenant Portal
  { path: '/org/dashboard', Component: T(DashboardPage) },
  { path: '/org/risk/reports', Component: T(RiskReportsPage) },
  { path: '/org/risk/analysis', Component: T(RiskPage) },
  { path: '/org/risk', element: <Navigate to="/org/risk/analysis" replace /> },
  { path: '/org/assets', Component: T(AssetsPage) },
  { path: '/org/assets/new', Component: T(AssetNewPage) },
  { path: '/org/assets/:id/edit', Component: T(AssetNewPage) },
  { path: '/org/assets/:id', Component: T(AssetDetailPage) },
  { path: '/org/controls', Component: T(ControlsPage) },
  { path: '/org/controls/custom/new', Component: T(ControlsPage) },
  { path: '/org/controls/:id', Component: T(ControlDetailPage) },
  { path: '/org/assessments', Component: T(AssessmentsPage) },
  { path: '/org/assessments/new', Component: T(AssessmentNewPage) },
  { path: '/org/assessments/:id', Component: T(AssessmentDetailPage) },
  { path: '/org/compliance-tasks', Component: T(ComplianceTasksPage) },
  { path: '/org/compliance-tasks/:id', Component: T(ComplianceTasksPage) },
  { path: '/org/reports', Component: T(ReportsPage) },
  { path: '/org/alerts', Component: T(AlertsPage) },
  { path: '/org/lms', Component: T(LMSPage) },
  { path: '/org/lms/courses/:id', Component: T(LMSPage) },
  { path: '/org/users', Component: T(UsersPage) },
  { path: '/org/settings', Component: T(SettingsPage) },

  // Legacy redirects
  { path: '/org/tasks', element: <Navigate to="/org/compliance-tasks" replace /> },
  { path: '/org/actions', element: <Navigate to="/org/compliance-tasks" replace /> },
  { path: '/org/evidence', element: <Navigate to="/org/compliance-tasks" replace /> },
  { path: '/org/policies', element: <Navigate to="/org/dashboard" replace /> },
  { path: '/org/admin/users', element: <Navigate to="/org/users" replace /> },
  { path: '/org/admin/settings', element: <Navigate to="/org/settings" replace /> },

  { path: '*', element: <Navigate to="/login" replace /> },
]);
