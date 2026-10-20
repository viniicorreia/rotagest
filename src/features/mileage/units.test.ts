import { describe, expect, it } from 'vitest';
import { formatKm, parseKmInput, parseRateInput, sameRate, toKmInput, toRateInput } from './units';

describe('valor por km', () => {
  it('aceita formato brasileiro e devolve o formato da API', () => {
    expect(parseRateInput('3,50')).toBe('3.50');
    expect(parseRateInput('R$ 3,5/km')).toBe('3.5');
    expect(parseRateInput('2.875')).toBe('2.875');
    expect(parseRateInput('04')).toBe('4');
    expect(toRateInput('3.50')).toBe('3,50');
  });

  it('recusa entradas inválidas', () => {
    expect(parseRateInput('')).toBeNull();
    expect(parseRateInput('3,12345')).toBeNull();
    expect(parseRateInput('abc')).toBeNull();
  });

  it('compara taxas escritas de jeitos diferentes', () => {
    expect(sameRate('3.5', '3.50')).toBe(true);
    expect(sameRate('3', '3.00')).toBe(true);
    expect(sameRate('3.5', '3.55')).toBe(false);
    expect(sameRate(null, '3')).toBe(false);
    expect(sameRate(null, null)).toBe(true);
  });
});

describe('km rodados', () => {
  it('normaliza a entrada', () => {
    expect(parseKmInput('120,5')).toBe('120.5');
    expect(parseKmInput('87')).toBe('87');
    expect(parseKmInput('120,55')).toBeNull();
    expect(parseKmInput('12345')).toBeNull();
    expect(toKmInput('120.0')).toBe('120');
    expect(toKmInput('87.5')).toBe('87,5');
  });

  it('formata para exibição', () => {
    expect(formatKm('2450.5')).toBe('2.450,5 km');
  });
});
