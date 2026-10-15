import { CreditCard, LayoutDashboard, Settings, Users, type LucideIcon } from 'lucide-react';
import type { Permission } from '@/api/types';

export interface NavItem {
  to: string;
  label: string;
  shortLabel?: string;
  icon: LucideIcon;
  permission: Permission;
}

/**
 * Itens de navegação disponíveis. Módulos das próximas fases (veículos,
 * receitas, despesas...) entram aqui quando estiverem implementados de fato.
 */
export const NAV_ITEMS: NavItem[] = [
  { to: '/app/dashboard', label: 'Início', icon: LayoutDashboard, permission: 'company:read' },
  { to: '/app/team', label: 'Equipe', icon: Users, permission: 'members:read' },
  { to: '/app/subscription', label: 'Assinatura', shortLabel: 'Plano', icon: CreditCard, permission: 'subscription:read' },
  { to: '/app/settings', label: 'Configurações', shortLabel: 'Ajustes', icon: Settings, permission: 'company:read' },
];
