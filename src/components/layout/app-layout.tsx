import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { Brand } from './brand';
import { CompanySwitcher } from './company-switcher';
import { NAV_ITEMS } from './nav';
import { UserMenu } from './user-menu';

function readCollapsed(): boolean {
  try {
    return localStorage.getItem('rg-sidebar') === 'collapsed';
  } catch {
    return false;
  }
}

/** Desktop: sidebar recolhível. Mobile: topo compacto + bottom navigation. */
export function AppLayout() {
  const { can } = useAuth();
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const items = NAV_ITEMS.filter((i) => can(i.permission));

  function toggle() {
    setCollapsed((c) => {
      try {
        localStorage.setItem('rg-sidebar', c ? 'expanded' : 'collapsed');
      } catch {
        /* sem armazenamento */
      }
      return !c;
    });
  }

  return (
    <div className="min-h-dvh md:flex">
      <aside
        className={cn(
          'sticky top-0 hidden h-dvh shrink-0 flex-col border-r bg-card transition-[width] duration-200 md:flex',
          collapsed ? 'w-[72px]' : 'w-64',
        )}
      >
        <div className={cn('flex h-16 items-center border-b px-4', collapsed && 'justify-center px-0')}>
          <Brand collapsed={collapsed} />
        </div>
        {!collapsed && (
          <div className="p-3">
            <CompanySwitcher />
          </div>
        )}
        <nav className="flex-1 space-y-1 p-3" aria-label="Principal">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                cn(
                  'flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                  isActive && 'bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground',
                  collapsed && 'justify-center px-0',
                )
              }
            >
              <item.icon className="size-5 shrink-0" aria-hidden />
              {!collapsed && item.label}
            </NavLink>
          ))}
        </nav>
        <div className={cn('flex items-center border-t p-3', collapsed ? 'flex-col gap-3' : 'justify-between')}>
          <UserMenu />
          <button
            onClick={toggle}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
            aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            {collapsed ? <PanelLeftOpen className="size-5" /> : <PanelLeftClose className="size-5" />}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b bg-card/95 px-4 backdrop-blur md:hidden">
          <Brand collapsed />
          <div className="flex min-w-0 items-center gap-2">
            <CompanySwitcher compact />
            <UserMenu />
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-4 md:px-8 md:pb-10 md:pt-8">
          <Outlet />
        </main>

        <nav
          className="fixed inset-x-0 bottom-0 z-30 grid border-t bg-card/95 pb-safe backdrop-blur md:hidden"
          style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
          aria-label="Principal"
        >
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground',
                  isActive && 'text-primary',
                )
              }
            >
              <item.icon className="size-5" aria-hidden />
              {item.shortLabel ?? item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
