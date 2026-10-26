import { useQuery, useQueryClient } from '@tanstack/react-query';
import { http } from '@/api/client';
import type { Driver } from '@/api/types';
import { useInvalidateFinance } from '@/features/finance/use-finance';

/** Manutenção e abastecimento geram contas a pagar: invalida o financeiro junto com as listas de custos. */
export function useInvalidateCosts() {
  const qc = useQueryClient();
  const invalidateFinance = useInvalidateFinance();
  return () =>
    Promise.all([
      invalidateFinance(),
      qc.invalidateQueries({ queryKey: ['maintenances'] }),
      qc.invalidateQueries({ queryKey: ['fuelings'] }),
      qc.invalidateQueries({ queryKey: ['fleet-costs'] }),
    ]);
}

/** Motoristas ativos para vincular ao abastecimento (opcional). */
export function useActiveDrivers(enabled = true) {
  return useQuery({
    queryKey: ['drivers', 'ACTIVE'],
    queryFn: () => http.get<Driver[]>('/drivers?status=ACTIVE'),
    staleTime: 60_000,
    enabled,
  });
}
