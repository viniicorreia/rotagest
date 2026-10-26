import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { http } from '@/api/client';
import type { ClosingDetail, ClosingList, ClosingSnapshot } from '@/api/types';

/** Todas as consultas de fechamento ficam sob ['closings'] para invalidar juntas após fechar/reabrir. */
export const closingKeys = {
  all: ['closings'] as const,
  list: (year: number) => ['closings', 'list', year] as const,
  detail: (month: string) => ['closings', 'detail', month] as const,
  preview: (month: string) => ['closings', 'preview', month] as const,
};

export function useClosingList(year: number) {
  return useQuery({
    queryKey: closingKeys.list(year),
    queryFn: () => http.get<ClosingList>(`/closings?year=${year}`),
    placeholderData: keepPreviousData,
  });
}

export function useClosingDetail(month: string) {
  return useQuery({
    queryKey: closingKeys.detail(month),
    queryFn: () => http.get<ClosingDetail>(`/closings/${month}`),
  });
}

/** Prévia só é pedida quando a pessoa clica em "Ver prévia" (calcula tudo no servidor). */
export function useClosingPreview(month: string, enabled: boolean) {
  return useQuery({
    queryKey: closingKeys.preview(month),
    queryFn: () => http.get<ClosingSnapshot>(`/closings/${month}/preview`),
    enabled,
    staleTime: 0,
  });
}

export function useInvalidateClosings() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: closingKeys.all });
}

/** Baixa o fechamento (ou a prévia, se o mês não estiver fechado) em PDF ou Excel. */
export async function downloadClosing(month: string, format: 'pdf' | 'xlsx') {
  const { blob, fileName } = await http.download(`/closings/${month}/export?format=${format}`);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
