import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/app-layout';
import { ForgotPasswordPage } from '@/features/auth/forgot-password-page';
import { LoginPage } from '@/features/auth/login-page';
import { RegisterPage } from '@/features/auth/register-page';
import { ResetPasswordPage } from '@/features/auth/reset-password-page';
import { OnboardingPage } from '@/features/companies/onboarding-page';
import { AccountsPage } from '@/features/accounts/accounts-page';
import { StatementPage } from '@/features/accounts/statement-page';
import { DashboardPage } from '@/features/dashboard/dashboard-page';
import { ObligationsPage } from '@/features/finance/obligations-page';
import { InvitePage } from '@/features/invitations/invite-page';
import { SettingsPage } from '@/features/settings/settings-page';
import { SubscriptionPage } from '@/features/subscriptions/subscription-page';
import { TeamPage } from '@/features/team/team-page';
import { VehicleDetailPage } from '@/features/vehicles/vehicle-detail-page';
import { VehiclesPage } from '@/features/vehicles/vehicles-page';
import { NotFoundPage } from './error-pages';
import { GuestOnly, RequireAuth, RequireCompany, RequirePermission } from './guards';

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/app" replace /> },
  {
    element: <GuestOnly />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
    ],
  },
  { path: '/reset-password', element: <ResetPasswordPage /> },
  { path: '/invite/:token', element: <InvitePage /> },
  {
    element: <RequireAuth />,
    children: [
      { path: '/onboarding', element: <OnboardingPage /> },
      {
        element: <RequireCompany />,
        children: [
          {
            path: '/app',
            element: <AppLayout />,
            children: [
              { index: true, element: <Navigate to="dashboard" replace /> },
              { path: 'dashboard', element: <DashboardPage /> },
              {
                path: 'expenses',
                element: (
                  <RequirePermission permission="finance:read">
                    <ObligationsPage key="payables" side="payables" />
                  </RequirePermission>
                ),
              },
              {
                path: 'revenues',
                element: (
                  <RequirePermission permission="finance:read">
                    <ObligationsPage key="receivables" side="receivables" />
                  </RequirePermission>
                ),
              },
              {
                path: 'vehicles',
                element: (
                  <RequirePermission permission="fleet:read">
                    <VehiclesPage />
                  </RequirePermission>
                ),
              },
              {
                path: 'vehicles/:id',
                element: (
                  <RequirePermission permission="fleet:read">
                    <VehicleDetailPage />
                  </RequirePermission>
                ),
              },
              {
                path: 'accounts',
                element: (
                  <RequirePermission permission="finance:read">
                    <AccountsPage />
                  </RequirePermission>
                ),
              },
              {
                path: 'accounts/:id',
                element: (
                  <RequirePermission permission="finance:read">
                    <StatementPage />
                  </RequirePermission>
                ),
              },
              {
                path: 'team',
                element: (
                  <RequirePermission permission="members:read">
                    <TeamPage />
                  </RequirePermission>
                ),
              },
              {
                path: 'subscription',
                element: (
                  <RequirePermission permission="subscription:read">
                    <SubscriptionPage />
                  </RequirePermission>
                ),
              },
              { path: 'settings', element: <SettingsPage /> },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);
