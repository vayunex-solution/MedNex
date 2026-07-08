import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { PrivateRoute } from './PrivateRoute';
import { Spinner } from '@/components/feedback/Skeleton';

const PageLoader = () => (
  <div className="flex h-64 items-center justify-center">
    <Spinner size="lg" />
  </div>
);

const wrap = (Comp: React.LazyExoticComponent<() => React.ReactElement>) => (
  <Suspense fallback={<PageLoader />}>
    <Comp />
  </Suspense>
);

/* ── Lazy page imports ───────────────────────────────────────── */
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));

const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'));
const UsersPage     = lazy(() => import('@/pages/users/UsersPage'));
const UserDetailPage = lazy(() => import('@/pages/users/UserDetailPage'));
const TenantsPage   = lazy(() => import('@/pages/tenants/TenantsPage'));
const TenantDetailPage = lazy(() => import('@/pages/tenants/TenantDetailPage'));
const BusinessesPage = lazy(() => import('@/pages/businesses/BusinessesPage'));
const BranchesPage  = lazy(() => import('@/pages/branches/BranchesPage'));
const AuditPage     = lazy(() => import('@/pages/audit/AuditPage'));
const JobsPage      = lazy(() => import('@/pages/jobs/JobsPage'));
const HealthPage    = lazy(() => import('@/pages/health/HealthPage'));
const ApiKeysPage   = lazy(() => import('@/pages/api-keys/ApiKeysPage'));
const SettingsPage  = lazy(() => import('@/pages/settings/SettingsPage'));
const ApplicationsPage = lazy(() => import('@/pages/applications/ApplicationsPage'));
const ApplicationDetailsPage = lazy(() => import('@/pages/applications/ApplicationDetailsPage'));
const NotFoundPage  = lazy(() => import('@/pages/NotFoundPage'));

export const router = createBrowserRouter([
  /* ── Public routes ──── */
  { path: '/login', element: wrap(LoginPage) },

  /* ── Protected routes ──── */
  {
    element: <PrivateRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: 'dashboard',    element: wrap(DashboardPage) },
          { path: 'applications',  element: wrap(ApplicationsPage) },
          { path: 'applications/:uuid', element: wrap(ApplicationDetailsPage) },
          { path: 'users',        element: wrap(UsersPage) },
          { path: 'users/:uuid',  element: wrap(UserDetailPage) },
          { path: 'tenants',      element: wrap(TenantsPage) },
          { path: 'tenants/:uuid', element: wrap(TenantDetailPage) },
          { path: 'businesses',   element: wrap(BusinessesPage) },
          { path: 'branches',     element: wrap(BranchesPage) },
          { path: 'audit',        element: wrap(AuditPage) },
          { path: 'jobs',         element: wrap(JobsPage) },
          { path: 'health',       element: wrap(HealthPage) },
          { path: 'api-keys',     element: wrap(ApiKeysPage) },
          { path: 'settings',     element: wrap(SettingsPage) },
          { path: 'settings/:tab', element: wrap(SettingsPage) },
          { path: '*',            element: wrap(NotFoundPage) },
        ],
      },
    ],
  },
]);
