import { describe, expect, it } from 'vitest';
import { formatCell, isNegativeCell } from './format';

const nbsp = (s: string) => s.replace(/ /g, ' ');

describe('formatCell (fechamento)', () => {
  it('formata dinheiro, percentual, data e mês sem calcular', () => {
    expect(nbsp(formatCell('money', '1234.56'))).toBe('R$ 1.234,56');
    expect(formatCell('percent', '12.34')).toBe('12,34%');
    expect(formatCell('date', '2026-09-30')).toBe('30/09/2026');
    expect(formatCell('text', null)).toBe('—');
  });

  it('marca negativos só em colunas numéricas', () => {
    expect(isNegativeCell('money', '-10.00')).toBe(true);
    expect(isNegativeCell('money', '-0.00')).toBe(false);
    expect(isNegativeCell('text', '-x')).toBe(false);
  });
});
