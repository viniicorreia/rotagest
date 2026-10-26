/*
 * Formatação de quantidades da frota (km, litros, km/l, R$/km). Os valores
 * chegam da API como texto decimal ("1234.5"); aqui só exibimos. Number é
 * usado apenas para formatar e nunca volta para a API.
 */

const formatters = new Map<string, Intl.NumberFormat>();

function nf(min: number, max: number, style: 'decimal' | 'currency' = 'decimal') {
  const key = `${style}:${min}:${max}`;
  let f = formatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat('pt-BR', { style, currency: 'BRL', minimumFractionDigits: min, maximumFractionDigits: max });
    formatters.set(key, f);
  }
  return f;
}

/** "1234.5" → "1.234,5" (até `max` casas). */
export function formatDecimal(value: string | null | undefined, max = 2, min = 0): string {
  if (value === null || value === undefined || value === '') return '—';
  return nf(min, max).format(Number(value));
}

/** "0.4321" → "R$ 0,4321/km" (4 casas, como a API calcula). */
export function formatCostPerKm(value: string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  return `${nf(4, 4, 'currency').format(Number(value))}/km`;
}

/** "6.0990" → "R$ 6,099" (preço por litro, até 4 casas). */
export function formatPricePerLiter(value: string): string {
  return nf(2, 4, 'currency').format(Number(value));
}

/**
 * Converte o que a pessoa digitou ("45,320" ou "45.320") em decimal da API
 * ("45.320"), com no máximo `intDigits` dígitos inteiros e `decimals` casas.
 * Retorna null se não for válido.
 */
export function parseDecimalInput(input: string, intDigits: number, decimals: number): string | null {
  const s = input.trim().replace(/\s/g, '').replace(',', '.');
  const pattern = new RegExp(`^\\d{1,${intDigits}}(\\.\\d{1,${decimals}})?$`);
  if (!pattern.test(s)) return null;
  const [int, dec] = s.split('.');
  return dec ? `${String(Number(int))}.${dec}` : String(Number(int));
}

/** Litros: até 5 dígitos e 3 casas (mesma regra da API). */
export const parseLiters = (input: string) => parseDecimalInput(input, 5, 3);
/** Preço por litro: até 3 dígitos e 4 casas (mesma regra da API). */
export const parsePricePerLiter = (input: string) => parseDecimalInput(input, 3, 4);

/**
 * Prévia NÃO oficial de litros × preço para quem está digitando. O total
 * gravado (e a conta a pagar) é calculado pela API; isto só ajuda a conferir
 * a nota. Aritmética inteira para não exibir lixo de ponto flutuante.
 */
export function previewFuelTotal(liters: string | null, pricePerLiter: string | null): string | null {
  if (!liters || !pricePerLiter) return null;
  const scaled = (v: string, dp: number) => {
    const [i, d = ''] = v.split('.');
    return BigInt(i + d.padEnd(dp, '0').slice(0, dp));
  };
  const product = scaled(liters, 3) * scaled(pricePerLiter, 4); // 7 casas
  const cents = (product + 50_000n) / 100_000n; // arredonda meio para cima
  const str = cents.toString().padStart(3, '0');
  return `${str.slice(0, -2)}.${str.slice(-2)}`;
}

/** Odômetro opcional: inteiro de 0 a 9.999.999. undefined = vazio; null = inválido. */
export function parseOdometer(input: string): number | undefined | null {
  const s = input.trim().replace(/\./g, '');
  if (!s) return undefined;
  if (!/^\d{1,7}$/.test(s)) return null;
  return Number(s);
}
