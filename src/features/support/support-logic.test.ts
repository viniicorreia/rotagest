import { describe, expect, it } from 'vitest';
import { formatAccessCount, formatSupportUntil, shortApiPath, supportGrantSchema, supportGrantStatusLabel } from './support-logic';

describe('acesso do suporte', () => {
  it('rotula o status da autorização', () => {
    expect(supportGrantStatusLabel('ACTIVE')).toBe('Ativa');
    expect(supportGrantStatusLabel('EXPIRED')).toBe('Expirada');
    expect(supportGrantStatusLabel('REVOKED')).toBe('Revogada');
    expect(supportGrantStatusLabel('OUTRO')).toBe('OUTRO');
  });

  it('conta os acessos no singular e no plural', () => {
    expect(formatAccessCount(0)).toBe('Nenhum acesso');
    expect(formatAccessCount(1)).toBe('1 acesso');
    expect(formatAccessCount(12)).toBe('12 acessos');
  });

  it('mostra só a hora quando o modo suporte termina hoje', () => {
    const now = new Date(2026, 9, 22, 10, 0);
    expect(formatSupportUntil(new Date(2026, 9, 22, 14, 30), now)).toBe('14:30');
    expect(formatSupportUntil(new Date(2026, 9, 24, 9, 5), now)).toBe('24/10 09:05');
    expect(formatSupportUntil(new Date(2026, 9, 22, 23, 59).toISOString(), now)).toBe('23:59');
  });

  it('tira o prefixo da API do caminho registrado', () => {
    expect(shortApiPath('/api/v1/reports/vehicle-result?month=2026-09')).toBe('/reports/vehicle-result?month=2026-09');
    expect(shortApiPath('/api/v1')).toBe('/');
    expect(shortApiPath('/outra/coisa')).toBe('/outra/coisa');
  });
});

describe('formulário de autorização', () => {
  it('converte as horas e limpa a justificativa', () => {
    expect(supportGrantSchema.parse({ hours: '24', reason: '  Conferir o fechamento de setembro  ' })).toEqual({
      hours: 24,
      reason: 'Conferir o fechamento de setembro',
    });
  });

  it('recusa prazo fora das opções e justificativa curta ou longa', () => {
    expect(supportGrantSchema.safeParse({ hours: '5', reason: 'Conferir o fechamento' }).success).toBe(false);
    expect(supportGrantSchema.safeParse({ hours: '2', reason: 'curto    ' }).success).toBe(false);
    expect(supportGrantSchema.safeParse({ hours: '72', reason: 'x'.repeat(501) }).success).toBe(false);
    expect(supportGrantSchema.safeParse({ hours: '72', reason: 'x'.repeat(500) }).success).toBe(true);
  });
});
