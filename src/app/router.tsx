import { AlertTriangle, Loader2 } from 'lucide-react';
import { lazy, Suspense, type ComponentType } from 'react';
import { createBrowserRouter, isRouteErrorResponse, Navigate, Outlet, useRouteError } from 'react-router-dom';
import { AppLayout } from '@/components/layout/app-layout';
import { FullPageLoader } from '@/components/layout/full-page-loader';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ForgotPasswordPage } from '@/features/auth/forgot-password-page';
import { LoginPage } from '@/features/auth/login-page';
import { RegisterPage } from '@/features/auth/register-page';
import { ResetPasswordPage } from '@/features/auth/reset-password-page';
import { NotFoundPage } from './error-pages';
import { GuestOnly, RequireAuth, RequireCompany, RequirePermission, RequirePlatformAdmin } from './guards';

/**
 * Carrega a página sob demanda (um chunk por módulo de página). As páginas usam
 * export nomeado; aqui viram o default que o React.lazy espera.
 * Telas de visitante (login, cadastro) e o shell do app ficam no bundle inicial.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- aceita qualquer página e preserva as props dela
function lazyPage<M extends Record<K, ComponentType<any>>, K extends keyof M>(load: () => Promise<M>, name: K) {
  return lazy(async () => ({ default: (await load())[name] }));
}

// Entrada e empresa
const OnboardingPage = lazyPage(() => import('@/features/companies/onboarding-page'), 'OnboardingPage');
const InvitePage = lazyPage(() => import('@/features/invitations/invite-page'), 'InvitePage');
// Início e motorista
const AppIndexRedirect = lazyPage(() => import('@/features/driver/my-day-page'), 'AppIndexRedirect');
const MyDayPage = lazyPage(() => import('@/features/driver/my-day-page'), 'MyDayPage');
const ApprovalsPage = lazyPage(() => import('@/features/driver/approvals-page'), 'ApprovalsPage');
const DashboardPage = lazyPage(() => import('@/features/dashboard/dashboard-page'), 'DashboardPage');
// Financeiro
const ObligationsPage = lazyPage(() => import('@/features/finance/obligations-page'), 'ObligationsPage');
const AccountsPage = lazyPage(() => import('@/features/accounts/accounts-page'), 'AccountsPage');
const StatementPage = lazyPage(() => import('@/features/accounts/statement-page'), 'StatementPage');
const ContractsPage = lazyPage(() => import('@/features/contracts/contracts-page'), 'ContractsPage');
const ReportsPage = lazyPage(() => import('@/features/reports/reports-page'), 'ReportsPage');
const ClosingsPage = lazyPage(() => import('@/features/closings/closings-page'), 'ClosingsPage');
// Frota
const VehiclesPage = lazyPage(() => import('@/features/vehicles/vehicles-page'), 'VehiclesPage');
const VehicleDetailPage = lazyPage(() => import('@/features/vehicles/vehicle-detail-page'), 'VehicleDetailPage');
const KmPage = lazyPage(() => import('@/features/mileage/km-page'), 'KmPage');
const OperationsPage = lazyPage(() => import('@/features/fleet/operations-page'), 'OperationsPage');
const CostsPage = lazyPage(() => import('@/features/costs/costs-page'), 'CostsPage');
// Conta
const TeamPage = lazyPage(() => import('@/features/team/team-page'), 'TeamPage');
const SubscriptionPage = lazyPage(() => import('@/features/subscriptions/subscription-page'), 'SubscriptionPage');
const SettingsPage = lazyPage(() => import('@/features/settings/settings-page'), 'SettingsPage');
// Painel da plataforma (SUPER_ADMIN)
const PlatformLayout = lazyPage(() => import('@/features/platform/platform-layout'), 'PlatformLayout');
const PlatformOverviewPage = lazyPage(() => import('@/features/platform/overview-page'), 'PlatformOverviewPage');
const PlatformCompaniesPage = lazyPage(() => import('@/features/platform/companies-page'), 'PlatformCompaniesPage');
const PlatformPlansPage = lazyPage(() => import('@/features/platform/plans-page'), 'PlatformPlansPage');
const PlatformSubscriptionsPage = lazyPage(() => import('@/features/platform/subscriptions-page'), 'PlatformSubscriptionsPage');
const PlatformSettingsPage = lazyPage(() => import('@/features/platform/settings-page'), 'PlatformSettingsPage');

/** Mesmo spinner do FullPageLoader, mas dentro da área de conteúdo (o shell continua visível). */
function PageLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center" role="status" aria-label="Carregando">
      <Loader2 className="size-6 animate-spin text-primary" />
    </div>
  );
}

/** Rota sem caminho que segura o carregamento das páginas lazy filhas. */
function LazyOutlet({ fullPage }: { fullPage?: boolean }) {
  return (
    <Suspense fallback={fullPage ? <FullPageLoader /> : <PageLoader />}>
      <Outlet />
    </Suspense>
  );
}

/**
 * Erro de renderização ou de carregamento de chunk (ex.: deploy novo trocou os
 * hashes e a aba antiga pede um arquivo que não existe mais). Recarregar resolve.
 */
function RouteError({ fullPage }: { fullPage?: boolean }) {
  const error = useRouteError();
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />;
  const chunk = error instanceof Error && /dynamically imported module|Importing a module script|Loading chunk/i.test(error.message);
  const content = (
    <EmptyState
      icon={AlertTriangle}
      title={chunk ? 'Nova versão disponível' : 'Algo deu errado'}
      description={
        chunk
          ? 'O RotaGest foi atualizado enquanto esta página estava aberta. Recarregue para continuar.'
          : 'Não foi possível exibir esta página. Tente recarregar; se persistir, fale com o suporte.'
      }
      action={<Button onClick={() => window.location.reload()}>Recarregar</Button>}
    />
  );
  return fullPage ? <div className="flex min-h-dvh items-center justify-center p-4">{content}</div> : content;
}

export const router = createBrowserRouter([
  {
    // Raiz sem caminho: boundary de erro e Suspense para as telas fora do shell.
    element: <LazyOutlet fullPage />,
    errorElement: <RouteError fullPage />,
    children: [
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
                  {
                    element: <LazyOutlet />,
                    errorElement: <RouteError />,
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
            ],
          },
          {
            element: <RequireCompany />,
            children: [
              {
                path: '/app',
                element: <AppLayout />,
                children: [
                  {
                    // Erros e carregamento ficam dentro do shell: menu continua utilizável.
                    element: <LazyOutlet />,
                    errorElement: <RouteError />,
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
                      // Nomes de rota da especificação → páginas existentes (a permissão é conferida no destino).
                      { path: 'drivers', element: <Navigate to="/app/operations" replace /> },
                      { path: 'routes', element: <Navigate to="/app/operations?tab=routes" replace /> },
                      { path: 'maintenance', element: <Navigate to="/app/costs?tab=maintenances" replace /> },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
