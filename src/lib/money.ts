/**
 * Entrada e exibição de dinheiro no web. Valores trafegam como texto
 * "1234.56" (nunca float) e todo cálculo financeiro é feito pela API.
 */

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** "1234.56" → "R$ 1.234,56". */
export function formatBRL(value: string | null | undefined): string {
  if (value === null || value === undefined || value === '') return BRL.format(0);
  // Number só para exibir: a API manda no máximo 2 casas e o valor nunca volta para cálculo.
  return BRL.format(Number(value));
}

/**
 * Converte o que a pessoa digitou ("1.234,56", "1234,5", "R$ 80") no formato
 * da API ("1234.56"). Retorna null se não for um valor válido.
 */
export function parseMoneyInput(input: string): string | null {
  let s = input.replace(/[R$\s]/g, '');
  if (!s) return null;
  const negative = s.startsWith('-');
  if (negative) s = s.slice(1);
  if (s.includes(',')) {
    // Formato brasileiro: ponto é milhar, vírgula é decimal.
    s = s.replace(/\./g, '').replace(',', '.');
  } else if ((s.match(/\./g) ?? []).length > 1 || /\.\d{3}$/.test(s)) {
    // "1.234" ou "1.234.567": pontos de milhar.
    s = s.replace(/\./g, '');
  }
  if (!/^\d{1,12}(\.\d{1,2})?$/.test(s)) return null;
  const [int, dec = ''] = s.split('.');
  return `${negative ? '-' : ''}${String(Number(int))}.${dec.padEnd(2, '0')}`;
}

/** "1234.56" → "1.234,56" (para preencher campos de edição). */
export function toMoneyInput(value: string | null | undefined): string {
  if (!value) return '';
  const [int, dec = '00'] = value.replace('-', '').split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${value.startsWith('-') ? '-' : ''}${grouped},${dec.padEnd(2, '0').slice(0, 2)}`;
}

export function isNegative(value: string): boolean {
  return value.trim().startsWith('-') && Number(value) !== 0;
}
