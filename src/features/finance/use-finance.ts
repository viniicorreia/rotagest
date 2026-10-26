import { useQuery, useQueryClient } from '@tanstack/react-query';
import { http } from '@/api/client';
import type { AccountList, Category, CategoryType, VehicleList } from '@/api/types';

/** Chaves de cache do financeiro. Qualquer escrita invalida todas: saldos, listas e dashboard andam juntos. */
export const FINANCE_KEYS = ['payables', 'receivables', 'accounts', 'statement', 'transfers', 'dashboard', 'vehicles', 'vehicle', 'recurrences', 'categories'] as const;

export function useInvalidateFinance() {
  const qc = useQueryClient();
  return () => Promise.all(FINANCE_KEYS.map((k) => qc.invalidateQueries({ queryKey: [k] })));
}

export function useCategories(type?: CategoryType, includeInactive = false, enabled = true) {
  const params = new URLSearchParams();
  if (type) params.set('type', type);
  if (includeInactive) params.set('includeInactive', 'true');
  return useQuery({
    queryKey: ['categories', type ?? 'all', includeInactive],
    queryFn: () => http.get<Category[]>(`/categories?${params}`),
    staleTime: 60_000,
    enabled,
  });
}

export function useAccounts(includeInactive = false, enabled = true) {
  return useQuery({
    queryKey: ['accounts', includeInactive],
    queryFn: () => http.get<AccountList>(`/accounts${includeInactive ? '?includeInactive=true' : ''}`),
    enabled,
  });
}

export function useVehicles(archived = false, enabled = true) {
  return useQuery({
    queryKey: ['vehicles', archived],
    queryFn: () => http.get<VehicleList>(`/vehicles${archived ? '?archived=true' : ''}`),
    enabled,
  });
}

/** Chave de idempotência nova por tentativa de envio de formulário. */
export function newIdempotencyKey(): string {
  return crypto.randomUUID();
}
