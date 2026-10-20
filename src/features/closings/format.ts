import { format } from 'date-fns';
import type { ReportColumn } from '@/api/types';
import { formatDateBR, formatMonthBR } from '@/lib/dates';
import { formatBRL } from '@/lib/money';

/** "2026-10-01T13:45:00Z" → "01/10/2026 às 10:45" (horário local). Só exibição. */
export function formatDateTimeBR(value: string | null | undefined): string {
  if (!value) return '—';
  return format(new Date(value), "dd/MM/yyyy 'às' HH:mm");
}

/** Formata uma célula de seção de relatório conforme o tipo da coluna; nenhum cálculo. */
export function formatCell(type: ReportColumn['type'], value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  switch (type) {
    case 'money':
      return formatBRL(String(value));
    case 'number':
      return typeof value === 'number' ? value.toLocaleString('pt-BR') : String(value);
    case 'percent':
      return `${String(value).replace('.', ',')}%`;
    case 'date':
      return formatDateBR(String(value));
    case 'month':
      return /^\d{4}-\d{2}$/.test(String(value)) ? formatMonthBR(String(value)) : String(value);
    default:
      return String(value);
  }
}

export function isNegativeCell(type: ReportColumn['type'], value: string | number | null | undefined): boolean {
  return (type === 'money' || type === 'number' || type === 'percent') && value !== null && value !== undefined && String(value).trim().startsWith('-') && Number(value) !== 0;
}
