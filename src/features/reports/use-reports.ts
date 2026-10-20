import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { http } from '@/api/client';
import type { CategoryType, Report, ReportCatalog, ReportKey } from '@/api/types';

export type ReportRegime = Report['regime'];
export type ReportStatus = 'OPEN' | 'OVERDUE' | 'SETTLED';
export type FilterName = 'vehicleId' | 'routeId' | 'contractId' | 'categoryId' | 'accountId' | 'status';

export const REGIME_LABELS: Record<ReportRegime, string> = {
  CASH: 'Regime de caixa',
  ACCRUAL: 'Competência',
  DUE: 'Pelo vencimento',
  OPERATIONAL: 'Operacional',
};

export const STATUS_LABELS: Record<ReportStatus, string> = { OPEN: 'Em aberto', OVERDUE: 'Vencidas', SETTLED: 'Liquidadas' };

/** Filtros que cada relatório aceita (mesma regra da API). */
export const REPORT_FILTERS: Record<ReportKey, readonly FilterName[]> = {
  'cash-flow': ['accountId'],
  'revenue-by-contract': ['vehicleId', 'contractId'],
  'expenses-by-category': ['vehicleId', 'categoryId'],
  'result-by-vehicle': ['vehicleId', 'categoryId'],
  'result-by-route': ['routeId'],
  'result-by-period': ['categoryId'],
  payables: ['vehicleId', 'routeId', 'categoryId', 'status'],
  receivables: ['vehicleId', 'contractId', 'categoryId', 'status'],
  fuel: ['vehicleId'],
  maintenance: ['vehicleId'],
};

/** Tipo de categoria oferecido no filtro (undefined = todas). */
export const CATEGORY_TYPE: Partial<Record<ReportKey, CategoryType>> = {
  'expenses-by-category': 'EXPENSE',
  payables: 'EXPENSE',
  receivables: 'INCOME',
};

export const ALL_FILTERS: readonly FilterName[] = ['vehicleId', 'routeId', 'contractId', 'categoryId', 'accountId', 'status'];

export interface ReportParams {
  from: string;
  to: string;
  compare: boolean;
  filters: Partial<Record<FilterName, string>>;
}

/** Query string da API (mesma para a tela e para a exportação). Só envia os filtros do relatório. */
export function reportQuery(key: ReportKey, p: ReportParams): URLSearchParams {
  const q = new URLSearchParams({ from: p.from, to: p.to });
  for (const f of REPORT_FILTERS[key]) {
    const v = p.filters[f];
    if (v) q.set(f, v);
  }
  if (p.compare) q.set('compare', 'true');
  return q;
}

export function useReportCatalog() {
  return useQuery({ queryKey: ['reports', 'catalog'], queryFn: () => http.get<ReportCatalog>('/reports'), staleTime: 5 * 60_000 });
}

export function useReport(key: ReportKey | null, p: ReportParams) {
  const qs = key ? reportQuery(key, p).toString() : '';
  return useQuery({
    queryKey: ['reports', key, qs],
    queryFn: () => http.get<Report>(`/reports/${key}?${qs}`),
    enabled: !!key,
    placeholderData: keepPreviousData,
  });
}

/** Baixa o PDF/Excel com os mesmos parâmetros da tela e dispara o "salvar" do navegador. */
export async function exportReport(key: ReportKey, p: ReportParams, format: 'pdf' | 'xlsx'): Promise<void> {
  const q = reportQuery(key, p);
  q.set('format', format);
  const { blob, fileName } = await http.download(`/reports/${key}/export?${q}`);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
