import type { BillingInterval, CompanyStatus, SubscriptionStatus } from '@/api/types';

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  TRIALING: 'Em teste',
  ACTIVE: 'Ativa',
  PAST_DUE: 'Em atraso',
  CANCELED: 'Cancelada',
  SUSPENDED: 'Suspensa',
};

export const COMPANY_STATUS_LABELS: Record<CompanyStatus, string> = {
  ACTIVE: 'Ativa',
  SUSPENDED: 'Suspensa',
  CANCELED: 'Cancelada',
};

export const INTERVAL_LABELS: Record<BillingInterval, string> = {
  MONTHLY: 'Mensal',
  YEARLY: 'Anual',
};

export const PLAN_STATUS_LABELS = {
  ACTIVE: 'Ativo',
  ARCHIVED: 'Arquivado',
} as const;

export type BadgeTone = 'default' | 'secondary' | 'warning' | 'destructive' | 'outline';

export const SUBSCRIPTION_STATUS_TONE: Record<SubscriptionStatus, BadgeTone> = {
  TRIALING: 'outline',
  ACTIVE: 'default',
  PAST_DUE: 'warning',
  CANCELED: 'secondary',
  SUSPENDED: 'destructive',
};

export const COMPANY_STATUS_TONE: Record<CompanyStatus, BadgeTone> = {
  ACTIVE: 'default',
  SUSPENDED: 'destructive',
  CANCELED: 'secondary',
};

/** Rótulo de status vindo como texto livre (ex.: contagens da visão geral). */
export function subscriptionStatusLabel(status: string): string {
  return SUBSCRIPTION_STATUS_LABELS[status as SubscriptionStatus] ?? status;
}

export function companyStatusLabel(status: string): string {
  return COMPANY_STATUS_LABELS[status as CompanyStatus] ?? status;
}

const AUDIT_ACTION_LABELS: Record<string, string> = {
  'platform.company.suspended': 'Empresa suspensa',
  'platform.company.activated': 'Empresa reativada',
  'platform.company.canceled': 'Empresa cancelada',
  'platform.subscription.updated': 'Assinatura alterada',
  'platform.plan.created': 'Plano criado',
  'platform.plan.updated': 'Plano alterado',
  'platform.settings.updated': 'Configurações alteradas',
  'billing.subscription.status': 'Status da assinatura alterado pelo gateway',
};

/** Converte a chave de auditoria (platform.company.suspended) em texto legível. */
export function auditActionLabel(action: string): string {
  if (AUDIT_ACTION_LABELS[action]) return AUDIT_ACTION_LABELS[action];
  if (action.startsWith('billing.')) return 'Evento de cobrança';
  if (action.startsWith('platform.')) return 'Ação da plataforma';
  return action;
}

/** "2/5 veículos", "1 usuário (ilimitado)": limite nulo = sem limite. */
export function formatUsage(used: number, max: number | null, singular: string, plural: string): string {
  const noun = (max ?? used) === 1 ? singular : plural;
  return max === null ? `${used} ${noun} · ilimitado` : `${used}/${max} ${noun}`;
}

/** Limite de plano para exibição: null = ilimitado. */
export function formatLimit(max: number | null): string {
  return max === null ? 'Ilimitado' : String(max);
}

export { CompanyStatusBadge, SubscriptionStatusBadge } from './status-badge';
