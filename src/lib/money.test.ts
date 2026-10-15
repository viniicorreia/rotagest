import { describe, expect, it } from 'vitest';
import { formatBRL, parseMoneyInput, toMoneyInput } from './money';

describe('entrada de dinheiro', () => {
  it('aceita formato brasileiro e devolve o formato da API', () => {
    expect(parseMoneyInput('1.234,56')).toBe('1234.56');
    expect(parseMoneyInput('R$ 80')).toBe('80.00');
    expect(parseMoneyInput('12000')).toBe('12000.00');
    expect(parseMoneyInput('0,5')).toBe('0.50');
    expect(parseMoneyInput('1.234')).toBe('1234.00');
    expect(parseMoneyInput('99.9')).toBe('99.90');
    expect(parseMoneyInput('-150,30')).toBe('-150.30');
  });

  it('recusa entradas inválidas', () => {
    expect(parseMoneyInput('')).toBeNull();
    expect(parseMoneyInput('abc')).toBeNull();
    expect(parseMoneyInput('1,234,56')).toBeNull();
    expect(parseMoneyInput('10,123')).toBeNull();
  });

  it('formata para exibição e edição', () => {
    expect(formatBRL('1234.5').replace(/\s/g, ' ')).toBe('R$ 1.234,50');
    expect(toMoneyInput('1234567.8')).toBe('1.234.567,80');
  });
});
