import { describe, expect, it } from 'vitest';
import { formatCostPerKm, parseLiters, parseOdometer, parsePricePerLiter, previewFuelTotal, toDecimalInput } from './format';

describe('parseLiters', () => {
  it('aceita vírgula ou ponto com até 3 casas', () => {
    expect(parseLiters('45,320')).toBe('45.320');
    expect(parseLiters('45.32')).toBe('45.32');
    expect(parseLiters('045')).toBe('45');
  });
  it('rejeita formatos inválidos', () => {
    expect(parseLiters('45,3201')).toBeNull();
    expect(parseLiters('123456')).toBeNull();
    expect(parseLiters('abc')).toBeNull();
    expect(parseLiters('')).toBeNull();
  });
});

describe('parsePricePerLiter', () => {
  it('aceita até 4 casas', () => {
    expect(parsePricePerLiter('6,0990')).toBe('6.0990');
    expect(parsePricePerLiter('6.09901')).toBeNull();
    expect(parsePricePerLiter('1000')).toBeNull();
  });
});

describe('previewFuelTotal', () => {
  it('multiplica com arredondamento em centavos sem erro de ponto flutuante', () => {
    expect(previewFuelTotal('45.320', '6.099')).toBe('276.41');
    expect(previewFuelTotal('0.1', '0.2')).toBe('0.02');
    expect(previewFuelTotal('1', '0.005')).toBe('0.01');
    expect(previewFuelTotal(null, '6')).toBeNull();
  });
});

describe('parseOdometer', () => {
  it('vazio é opcional; texto inválido é null', () => {
    expect(parseOdometer('')).toBeUndefined();
    expect(parseOdometer('123.456')).toBe(123456);
    expect(parseOdometer('-1')).toBeNull();
  });
});

describe('formatCostPerKm', () => {
  it('exibe 4 casas', () => {
    expect(formatCostPerKm('0.4321').replace(/\s/g, ' ')).toBe('R$ 0,4321/km');
    expect(formatCostPerKm(null)).toBe('—');
  });
});

describe('toDecimalInput', () => {
  it('converte o decimal da API para o formato do campo, sem zeros à direita', () => {
    expect(toDecimalInput('6.0990')).toBe('6,099');
    expect(toDecimalInput('45.000')).toBe('45');
    expect(toDecimalInput('45.320')).toBe('45,32');
    expect(toDecimalInput(null)).toBe('');
    expect(parseLiters(toDecimalInput('45.320'))).toBe('45.32');
  });
});
