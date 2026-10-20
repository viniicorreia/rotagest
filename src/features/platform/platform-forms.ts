import type { PlanFeatureKey, PlatformSubscription, SubscriptionStatus, UpdateSubscriptionRequest } from '@/api/types';

/*
 * Conversões puras entre o que o formulário guarda (texto) e o que a API
 * espera. Nenhuma regra de negócio: a API valida e decide tudo.
 */

/** "2026-10-15T00:00:00.000Z" → "2026-10-15" (valor de <input type="date">); null → "". */
export function toDateInput(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : '';
}

/** Limite opcional digitado: "" → null; "12" → 12. */
export function parseOptionalInt(raw: string): number | null {
  const s = raw.trim();
  return s === '' ? null : Number(s);
}

/** Texto do campo de limite a partir do valor da API (null = vazio). */
export function toIntInput(value: number | null | undefined): string {
  return value === null || value === undefined ? '' : String(value);
}

/** Recursos do catálogo marcados no formulário, no formato que a API espera (lista completa). */
export function featuresPayload(catalog: { key: string }[], enabled: string[]): { key: PlanFeatureKey; enabled: boolean }[] {
  const on = new Set(enabled);
  return catalog.map((c) => ({ key: c.key as PlanFeatureKey, enabled: on.has(c.key) }));
}

export interface SubscriptionFormValues {
  planId: string;
  status: SubscriptionStatus;
  trialEndsAt: string;
  currentPeriodEnd: string;
  overrideMaxVehicles: string;
  overrideMaxUsers: string;
  reason: string;
}

export function subscriptionFormDefaults(sub: PlatformSubscription): SubscriptionFormValues {
  return {
    planId: sub.plan.id,
    status: sub.status,
    trialEndsAt: toDateInput(sub.trialEndsAt),
    currentPeriodEnd: toDateInput(sub.currentPeriodEnd),
    overrideMaxVehicles: toIntInput(sub.overrideMaxVehicles),
    overrideMaxUsers: toIntInput(sub.overrideMaxUsers),
    reason: '',
  };
}

/**
 * Corpo do PATCH /platform/subscriptions/:id: só os campos alterados, mais a
 * justificativa. Datas vazias e exceções vazias viram null (a API aceita null
 * para limpar a data e para voltar ao limite do plano).
 */
export type SubscriptionPatch = Omit<UpdateSubscriptionRequest, 'trialEndsAt' | 'currentPeriodEnd'> & {
  trialEndsAt?: string | null;
  currentPeriodEnd?: string | null;
};

export function buildSubscriptionPatch(sub: PlatformSubscription, values: SubscriptionFormValues): SubscriptionPatch {
  const before = subscriptionFormDefaults(sub);
  const patch: SubscriptionPatch = { reason: values.reason.trim() };
  if (values.planId !== before.planId) patch.planId = values.planId;
  if (values.status !== before.status) patch.status = values.status;
  if (values.trialEndsAt !== before.trialEndsAt) patch.trialEndsAt = values.trialEndsAt || null;
  if (values.currentPeriodEnd !== before.currentPeriodEnd) patch.currentPeriodEnd = values.currentPeriodEnd || null;
  if (values.overrideMaxVehicles.trim() !== before.overrideMaxVehicles) patch.overrideMaxVehicles = parseOptionalInt(values.overrideMaxVehicles);
  if (values.overrideMaxUsers.trim() !== before.overrideMaxUsers) patch.overrideMaxUsers = parseOptionalInt(values.overrideMaxUsers);
  return patch;
}

/** Há algo além da justificativa para enviar? */
export function hasSubscriptionChanges(patch: SubscriptionPatch): boolean {
  return Object.keys(patch).some((k) => k !== 'reason');
}
