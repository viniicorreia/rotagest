import { useQuery } from '@tanstack/react-query';
import { http } from '@/api/client';
import type { DailyLogList } from '@/api/types';
import { useVehicles } from '../finance/use-finance';
import { useDrivers, useRoutes } from '../fleet/use-fleet';

/** Cadastros mínimos para o sistema funcionar, na ordem em que fazem sentido. */
export const FIRST_STEP_KEYS = ['vehicles', 'drivers', 'routes', 'km'] as const;
export type FirstStepKey = (typeof FIRST_STEP_KEYS)[number];
export type FirstStepsCounts = Record<FirstStepKey, number>;

export interface FirstStepsProgress {
  done: number;
  total: number;
  /** Primeiro passo ainda não feito; null quando tudo está pronto. */
  next: FirstStepKey | null;
  complete: boolean;
}

export function firstStepsProgress(counts: FirstStepsCounts): FirstStepsProgress {
  const pending = FIRST_STEP_KEYS.filter((k) => counts[k] === 0);
  return { done: FIRST_STEP_KEYS.length - pending.length, total: FIRST_STEP_KEYS.length, next: pending[0] ?? null, complete: pending.length === 0 };
}

/** O km depende de um veículo cadastrado; os demais passos são livres. */
export function isStepBlocked(key: FirstStepKey, counts: FirstStepsCounts): boolean {
  return key === 'km' && counts.vehicles === 0;
}

// Ocultar o cartão do Início vale por empresa e só neste navegador.
const hiddenKey = (companyId: string) => `rg-first-steps-hidden:${companyId}`;

export function isFirstStepsHidden(companyId: string): boolean {
  try {
    return localStorage.getItem(hiddenKey(companyId)) === '1';
  } catch {
    return false;
  }
}

export function hideFirstSteps(companyId: string): void {
  try {
    localStorage.setItem(hiddenKey(companyId), '1');
  } catch {
    // Sem armazenamento o cartão volta no próximo acesso; não é um erro.
  }
}

/** Busca o que já foi cadastrado. Km: basta um registro no mês atual (padrão da API). */
export function useFirstSteps(enabled = true) {
  const vehicles = useVehicles(false, enabled);
  const drivers = useDrivers(enabled);
  const routes = useRoutes(enabled);
  const logs = useQuery({ queryKey: ['daily-logs', 'first-steps'], queryFn: () => http.get<DailyLogList>('/daily-logs'), enabled });

  const loading = vehicles.isPending || drivers.isPending || routes.isPending || logs.isPending;
  const counts: FirstStepsCounts = {
    vehicles: vehicles.data?.items.length ?? 0,
    drivers: drivers.data?.length ?? 0,
    routes: routes.data?.length ?? 0,
    km: logs.data?.items.length ?? 0,
  };
  return { loading, counts, progress: firstStepsProgress(counts), vehicles, drivers, routes };
}
