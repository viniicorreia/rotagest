import { describe, expect, it } from 'vitest';
import { formatCell, formatPeriod, isNegativeCell, trend } from './format';

const nbsp = (s: string) => s.replace(/ /g, ' ');

describe('formatCell', () => {
  it('formata dinheiro, percentual, número, data e mês', () => {
    expect(nbsp(formatCell('money', '1234.56'))).toBe('R$ 1.234,56');
    expect(formatCell('percent', '12.34')).toBe('12,34%');
    expect(formatCell('number', 1234)).toBe('1.234');
    expect(formatCell('number', '45.320')).toBe('45,32');
    expect(formatCell('date', '2026-10-15')).toBe('15/10/2026');
    expect(formatCell('month', '2026-10')).toBe('out/2026');
    expect(formatCell('text', 'Van 01')).toBe('Van 01');
  });
  it('trata vazios', () => {
    expect(formatCell('percent', null)).toBe('—');
    expect(formatCell('text', undefined)).toBe('—');
    expect(nbsp(formatCell('money', null))).toBe('R$ 0,00');
  });
});

describe('isNegativeCell', () => {
  it('só marca dinheiro negativo', () => {
    expect(isNegativeCell('money', '-10.00')).toBe(true);
    expect(isNegativeCell('money', '10.00')).toBe(false);
    expect(isNegativeCell('money', '-0.00')).toBe(false);
    expect(isNegativeCell('percent', '-5.00')).toBe(false);
  });
});

describe('formatPeriod', () => {
  it('mostra um mês ou um intervalo', () => {
    expect(formatPeriod('2026-10', '2026-10')).toBe('out/2026');
    expect(formatPeriod('2026-01', '2026-10')).toBe('jan/2026 a out/2026');
  });
});

describe('trend', () => {
  it('compara os dois valores recebidos', () => {
    expect(trend('10.00', '5.00')).toBe('up');
    expect(trend('5.00', '10.00')).toBe('down');
    expect(trend('5.00', '5.00')).toBe('same');
    expect(trend(null, '5.00')).toBeNull();
  });
});
