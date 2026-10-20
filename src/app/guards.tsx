import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import type { Permission } from '@/api/types';
import { FullPageLoader } from '@/components/layout/full-page-loader';
import { SelectCompanyPage } from '@/features/companies/select-company-page';
import { ForbiddenPage } from './error-pages';
import { useAuth } from '@/lib/auth';

export function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <FullPageLoader />;
  if (status === 'anonymous') {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  return <Outlet />;
}

/** Exige empresa ativa. Sem nenhuma empresa → onboarding; com várias e nenhuma ativa → seletor. */
export function RequireCompany() {
  const { me } = useAuth();
  if (!me) return <FullPageLoader />;
  if (!me.activeCompany) {
    if (me.companies.length > 0) return <SelectCompanyPage />;
    // Administrador da plataforma sem empresa própria vai direto para o painel.
    return <Navigate to={me.user.platformRole === 'SUPER_ADMIN' ? '/platform' : '/onboarding'} replace />;
  }
  return <Outlet />;
}

export function RequirePermission({ permission, children }: { permission: Permission; children: ReactNode }) {
  const { can } = useAuth();
  return can(permission) ? <>{children}</> : <ForbiddenPage />;
}

/** Páginas de visitante (login, cadastro): quem já está logado vai para o app. */
export function GuestOnly() {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <FullPageLoader />;
  if (status === 'authenticated') {
    const next = new URLSearchParams(location.search).get('next');
    return <Navigate to={safeNext(next) ?? '/app'} replace />;
  }
  return <Outlet />;
}

/** Só aceita caminhos internos para evitar open redirect. */
export function safeNext(next: string | null): string | null {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return null;
  return next;
}

/** Painel da plataforma: só SUPER_ADMIN (a API também confere em cada chamada). */
export function RequirePlatformAdmin() {
  const { me } = useAuth();
  if (!me) return <FullPageLoader />;
  return me.user.platformRole === 'SUPER_ADMIN' ? <Outlet /> : <ForbiddenPage />;
}
