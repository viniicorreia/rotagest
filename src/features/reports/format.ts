import { format, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { ReportColumn } from '@/api/types';
import { formatDateBR } from '@/lib/dates';
import { formatBRL, isNegative } from '@/lib/money';

/*
 * Formatação das células dos relatórios. A API devolve todos os números já
 * calculados (dinheiro "1234.56", percentuais "12.34", datas "AAAA-MM-DD",
 * meses "AAAA-MM"); aqui só exibimos. Number é usado apenas para formatar.
 */

export type CellValue = string | number | null | undefined;

const NUMBER = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 });
const PERCENT = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** "2026-10" → "out/2026". */
export function formatReportMonth(value: string): string {
  if (!/^\d{4}-\d{2}$/.test(value)) return value;
  return format(parse(value, 'yyyy-MM', new Date()), 'MMM/yyyy', { locale: ptBR });
}

/** Intervalo de meses do relatório: "out/2026" ou "ago/2026 a out/2026". */
export function formatPeriod(from: string, to: string): string {
  return from === to ? formatReportMonth(from) : `${formatReportMonth(from)} a ${formatReportMonth(to)}`;
}

export function formatCell(type: ReportColumn['type'], value: CellValue): string {
  if (value === null || value === undefined || value === '') return type === 'money' ? formatBRL(null) : '—';
  switch (type) {
    case 'money':
      return formatBRL(String(value));
    case 'percent':
      return `${PERCENT.format(Number(value))}%`;
    case 'number':
      return NUMBER.format(Number(value));
    case 'date':
      return /^\d{4}-\d{2}-\d{2}/.test(String(value)) ? formatDateBR(String(value)) : String(value);
    case 'month':
      return formatReportMonth(String(value));
    default:
      return String(value);
  }
}

/** Dinheiro negativo aparece em vermelho. */
export function isNegativeCell(type: ReportColumn['type'], value: CellValue): boolean {
  return type === 'money' && value !== null && value !== undefined && value !== '' && isNegative(String(value));
}

/** Colunas numéricas alinham à direita. */
export function isNumericColumn(type: ReportColumn['type']): boolean {
  return type === 'money' || type === 'number' || type === 'percent';
}

/**
 * Direção para a seta do comparativo (só compara os dois valores que vieram da
 * API; nenhuma diferença ou variação é calculada). null quando falta um dos lados.
 */
export function trend(current: CellValue, previous: CellValue): 'up' | 'down' | 'same' | null {
  if (current === null || current === undefined || current === '' || previous === null || previous === undefined || previous === '') return null;
  const a = Number(current);
  const b = Number(previous);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return a > b ? 'up' : a < b ? 'down' : 'same';
}
