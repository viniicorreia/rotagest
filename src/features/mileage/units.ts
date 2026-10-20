/*
 * Entrada e exibição de km e de R$/km. Como o dinheiro, trafegam como texto
 * ("120.5", "3.50"); o valor de cada dia (km × taxa) é sempre calculado pela API.
 */

/** "3,50", "R$ 3,5/km", "2.875" → "3.50" / "3.5" / "2.875" (até 4 casas). Null se inválido. */
export function parseRateInput(input: string): string | null {
  let s = input.replace(/R\$|\/\s*km|\s/gi, '');
  if (!s) return null;
  // Vírgula é decimal; com vírgula, pontos são milhar. Sem vírgula, o ponto é decimal.
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  if (!/^\d{1,6}(\.\d{1,4})?$/.test(s)) return null;
  const [int, dec] = s.split('.');
  return dec ? `${Number(int)}.${dec}` : String(Number(int));
}

/** "3.50" → "3,50" (para preencher campos de edição). */
export function toRateInput(value: string | null | undefined): string {
  return value ? value.replace('.', ',') : '';
}

/** Mesma taxa escrita de jeitos diferentes ("3.5" e "3.50")? Só compara texto normalizado. */
export function sameRate(a: string | null, b: string | null): boolean {
  const norm = (v: string | null) => (v === null ? null : v.includes('.') ? v.replace(/0+$/, '').replace(/\.$/, '') : v);
  return norm(a) === norm(b);
}

const RATE = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 4 });

/** "3.5" → "R$ 3,50/km". */
export function formatRate(value: string | null | undefined): string {
  if (!value) return '—';
  // Number só para exibir: até 4 casas, nunca volta para cálculo.
  return `${RATE.format(Number(value))}/km`;
}

/** "120,5" ou "120.5" → "120.5" (até 4 dígitos e 1 casa). Null se inválido. */
export function parseKmInput(input: string): string | null {
  const s = input.replace(/km|\s/gi, '').replace(',', '.');
  if (!/^\d{1,4}(\.\d)?$/.test(s)) return null;
  const [int, dec] = s.split('.');
  return dec ? `${Number(int)}.${dec}` : String(Number(int));
}

/** "120.5" → "120,5"; "120.0" → "120". */
export function toKmInput(value: string): string {
  return value.replace(/\.0$/, '').replace('.', ',');
}

const KM = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

/** "2450.5" → "2.450,5 km". */
export function formatKm(value: string | null | undefined): string {
  return `${KM.format(Number(value ?? 0))} km`;
}
