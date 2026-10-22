import { ArrowLeft, Building2, CreditCard, LayoutDashboard, Package, Settings, ShieldCheck, type LucideIcon } from 'lucide-react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { Brand } from '@/components/layout/brand';
import { UserMenu } from '@/components/layout/user-menu';
import { SupportBanner } from '@/features/support/support-banner';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

interface PlatformNavItem {
  to: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  end?: boolean;
}

const PLATFORM_NAV: PlatformNavItem[] = [
  { to: '/platform', label: 'Visão geral', shortLabel: 'Início', icon: LayoutDashboard, end: true },
  { to: '/platform/companies', label: 'Empresas', shortLabel: 'Empresas', icon: Building2 },
  { to: '/platform/plans', label: 'Planos', shortLabel: 'Planos', icon: Package },
  { to: '/platform/subscriptions', label: 'Assinaturas', shortLabel: 'Assinaturas', icon: CreditCard },
  { to: '/platform/settings', label: 'Configurações', shortLabel: 'Ajustes', icon: Settings },
];

/** Área administrativa do SaaS. Desktop: barra lateral. Mobile: topo compacto + navegação inferior. */
export function PlatformLayout() {
  const { me } = useAuth();
  const hasCompany = !!me?.activeCompany;

  return (
    <div className="min-h-dvh md:flex">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r bg-card md:flex">
        <div className="flex h-16 items-center border-b px-4">
          <Brand />
        </div>
        <div className="px-3 pt-3">
          <div className="flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-xs font-semibold uppercase tracking-wide text-accent-foreground">
            <ShieldCheck className="size-4 shrink-0" aria-hidden />
            Administração da plataforma
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3" aria-label="Plataforma">
          {PLATFORM_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                  isActive && 'bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground',
                )
              }
            >
              <item.icon className="size-5 shrink-0" aria-hidden />
              {item.label}
            </NavLink>
          ))}
        </nav>
        {hasCompany && (
          <div className="px-3 pb-2">
            <Link
              to="/app"
              className="flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ArrowLeft className="size-5 shrink-0" aria-hidden />
              Voltar ao app
            </Link>
          </div>
        )}
        <div className="flex items-center border-t p-3">
          <UserMenu />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <SupportBanner />
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b bg-card/95 px-4 backdrop-blur md:hidden">
          <div className="flex min-w-0 items-center gap-2">
            <Brand collapsed />
            <span className="flex min-w-0 items-center gap-1 text-sm font-semibold">
              <ShieldCheck className="size-4 shrink-0 text-primary" aria-hidden />
              <span className="truncate">Plataforma</span>
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {hasCompany && (
              <Link to="/app" className="flex h-9 items-center gap-1 rounded-lg px-2 text-sm font-medium text-muted-foreground hover:bg-muted" aria-label="Voltar ao app">
                <ArrowLeft className="size-4" aria-hidden />
                App
              </Link>
            )}
            <UserMenu />
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-4 md:px-8 md:pb-10 md:pt-8">
          <Outlet />
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t bg-card/95 pb-safe backdrop-blur md:hidden" aria-label="Plataforma">
          {PLATFORM_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex h-16 min-w-0 flex-col items-center justify-center gap-1 px-0.5 text-[11px] font-medium text-muted-foreground',
                  isActive && 'text-primary',
                )
              }
            >
              <item.icon className="size-5 shrink-0" aria-hidden />
              <span className="max-w-full truncate">{item.shortLabel}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
