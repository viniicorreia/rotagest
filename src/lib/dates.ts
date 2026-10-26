import { addMonths, format, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/*
 * Datas de negócio trafegam como texto: "AAAA-MM-DD" (vencimento, pagamento)
 * e "AAAA-MM" (competência). Aqui só formatamos para exibição; "vencida" e
 * demais regras vêm calculadas da API.
 */

export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function currentMonth(offset = 0): string {
  return format(addMonths(new Date(), offset), 'yyyy-MM');
}

export function shiftMonth(month: string, offset: number): string {
  return format(addMonths(parse(month, 'yyyy-MM', new Date()), offset), 'yyyy-MM');
}

/** "2026-10-15" → "15/10/2026". */
export function formatDateBR(value: string | null | undefined): string {
  if (!value) return '—';
  const [y, m, d] = value.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

/** "2026-10" → "out/2026"; `long` → "outubro de 2026". */
export function formatMonthBR(value: string, long = false): string {
  const date = parse(value, 'yyyy-MM', new Date());
  return long ? format(date, "MMMM 'de' yyyy", { locale: ptBR }) : format(date, 'MMM/yy', { locale: ptBR });
}
