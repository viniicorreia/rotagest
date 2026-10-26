import { ArrowDownCircle, ArrowUpCircle, Bus, CreditCard, Landmark, LayoutDashboard, Settings, Users, type LucideIcon } from 'lucide-react';
import type { Permission } from '@/api/types';

export interface NavItem {
  to: string;
  label: string;
  shortLabel?: string;
  icon: LucideIcon;
  permission: Permission;
}

/**
 * Itens de navegação, na ordem de uso no dia a dia. No celular os primeiros
 * cabem na barra inferior e o restante vai para "Mais". Módulos das próximas
 * fases entram aqui quando estiverem implementados de fato.
 */
export const NAV_ITEMS: NavItem[] = [
  { to: '/app/dashboard', label: 'Início', icon: LayoutDashboard, permission: 'company:read' },
  { to: '/app/expenses', label: 'Despesas', icon: ArrowUpCircle, permission: 'finance:read' },
  { to: '/app/revenues', label: 'Receitas', icon: ArrowDownCircle, permission: 'finance:read' },
  { to: '/app/vehicles', label: 'Veículos', icon: Bus, permission: 'fleet:read' },
  { to: '/app/accounts', label: 'Contas', icon: Landmark, permission: 'finance:read' },
  { to: '/app/team', label: 'Equipe', icon: Users, permission: 'members:read' },
  { to: '/app/subscription', label: 'Assinatura', shortLabel: 'Plano', icon: CreditCard, permission: 'subscription:read' },
  { to: '/app/settings', label: 'Configurações', shortLabel: 'Ajustes', icon: Settings, permission: 'company:read' },
];

/** Quantos itens cabem na barra inferior do celular antes de agrupar em "Mais". */
export const MOBILE_SLOTS = 5;
