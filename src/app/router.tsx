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
import { ContractsPage } from '@/features/contracts/contracts-page';
import { CostsPage } from '@/features/costs/costs-page';
import { ApprovalsPage } from '@/features/driver/approvals-page';
import { AppIndexRedirect, MyDayPage } from '@/features/driver/my-day-page';
import { OperationsPage } from '@/features/fleet/operations-page';
import { KmPage } from '@/features/mileage/km-page';
import { ClosingsPage } from '@/features/closings/closings-page';
import { ReportsPage } from '@/features/reports/reports-page';
import { NotFoundPage } from './error-pages';
import { PlatformLayout } from '@/features/platform/platform-layout';
import { PlatformOverviewPage } from '@/features/platform/overview-page';
import { PlatformCompaniesPage } from '@/features/platform/companies-page';
import { PlatformPlansPage } from '@/features/platform/plans-page';
import { PlatformSubscriptionsPage } from '@/features/platform/subscriptions-page';
import { PlatformSettingsPage } from '@/features/platform/settings-page';
import { GuestOnly, RequireAuth, RequireCompany, RequirePermission, RequirePlatformAdmin } from './guards';

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
        element: <RequirePlatformAdmin />,
        children: [
          {
            path: '/platform',
            element: <PlatformLayout />,
            children: [
              { index: true, element: <PlatformOverviewPage /> },
              { path: 'companies', element: <PlatformCompaniesPage /> },
              { path: 'plans', element: <PlatformPlansPage /> },
              { path: 'subscriptions', element: <PlatformSubscriptionsPage /> },
              { path: 'settings', element: <PlatformSettingsPage /> },
            ],
          },
        ],
      },
      {
        element: <RequireCompany />,
        children: [
          {
            path: '/app',
            element: <AppLayout />,
            children: [
              { index: true, element: <AppIndexRedirect /> },
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
                path: 'km',
                element: (
                  <RequirePermission permission="fleet:read">
                    <KmPage />
                  </RequirePermission>
                ),
              },
              {
                path: 'my',
                element: (
                  <RequirePermission permission="assignments:own">
                    <MyDayPage />
                  </RequirePermission>
                ),
              },
              {
                path: 'approvals',
                element: (
                  <RequirePermission permission="expenses:approve">
                    <ApprovalsPage />
                  </RequirePermission>
                ),
              },
              {
                path: 'operations',
                element: (
                  <RequirePermission permission="fleet:read">
                    <OperationsPage />
                  </RequirePermission>
                ),
              },
              {
                path: 'contracts',
                element: (
                  <RequirePermission permission="contracts:read">
                    <ContractsPage />
                  </RequirePermission>
                ),
              },
              {
                path: 'costs',
                element: (
                  <RequirePermission permission="finance:read">
                    <CostsPage />
                  </RequirePermission>
                ),
              },
              {
                path: 'reports',
                element: (
                  <RequirePermission permission="reports:read">
                    <ReportsPage />
                  </RequirePermission>
                ),
              },
              {
                path: 'monthly-closing',
                element: (
                  <RequirePermission permission="reports:read">
                    <ClosingsPage />
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
