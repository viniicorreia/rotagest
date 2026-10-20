import { ArrowDownCircle, ArrowUpCircle, Bus, ClipboardCheck, CreditCard, FileSignature, Gauge, Landmark, LayoutDashboard, Route, Settings, Sun, Users, Wrench, type LucideIcon } from 'lucide-react';
import type { Permission } from '@/api/types';

export interface NavItem {
  to: string;
  label: string;
  shortLabel?: string;
  icon: LucideIcon;
  permission: Permission;
  /** Esconde o item de quem tem esta permissão (ex.: "Meu dia" é só do motorista). */
  hiddenWith?: Permission;
}

/**
 * Itens de navegação, na ordem de uso no dia a dia. No celular os primeiros
 * cabem na barra inferior e o restante vai para "Mais". Módulos das próximas
 * fases entram aqui quando estiverem implementados de fato.
 */
export const NAV_ITEMS: NavItem[] = [
  { to: '/app/dashboard', label: 'Início', icon: LayoutDashboard, permission: 'company:read' },
  { to: '/app/my', label: 'Meu dia', icon: Sun, permission: 'assignments:own', hiddenWith: 'fleet:read' },
  { to: '/app/km', label: 'Km diário', shortLabel: 'Km', icon: Gauge, permission: 'fleet:read' },
  { to: '/app/expenses', label: 'Despesas', icon: ArrowUpCircle, permission: 'finance:read' },
  { to: '/app/revenues', label: 'Receitas', icon: ArrowDownCircle, permission: 'finance:read' },
  { to: '/app/vehicles', label: 'Veículos', icon: Bus, permission: 'fleet:read' },
  { to: '/app/operations', label: 'Motoristas e rotas', shortLabel: 'Rotas', icon: Route, permission: 'fleet:read' },
  { to: '/app/contracts', label: 'Contratos', icon: FileSignature, permission: 'finance:read' },
  { to: '/app/costs', label: 'Manutenção e combustível', shortLabel: 'Custos', icon: Wrench, permission: 'finance:read' },
  { to: '/app/approvals', label: 'Aprovações', icon: ClipboardCheck, permission: 'expenses:approve' },
  { to: '/app/accounts', label: 'Contas', icon: Landmark, permission: 'finance:read' },
  { to: '/app/team', label: 'Equipe', icon: Users, permission: 'members:read' },
  { to: '/app/subscription', label: 'Assinatura', shortLabel: 'Plano', icon: CreditCard, permission: 'subscription:read' },
  { to: '/app/settings', label: 'Configurações', shortLabel: 'Ajustes', icon: Settings, permission: 'company:read' },
];

/** Quantos itens cabem na barra inferior do celular antes de agrupar em "Mais". */
export const MOBILE_SLOTS = 5;
