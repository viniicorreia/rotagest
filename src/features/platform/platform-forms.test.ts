import { describe, expect, it } from 'vitest';
import type { PlatformSubscription } from '@/api/types';
import { buildSubscriptionPatch, featuresPayload, hasSubscriptionChanges, parseOptionalInt, subscriptionFormDefaults, toDateInput } from './platform-forms';

const sub: PlatformSubscription = {
  id: 's1',
  company: { id: 'c1', tradeName: 'Transportes X', status: 'ACTIVE' },
  plan: { id: 'p1', code: 'basico', name: 'Básico' },
  status: 'TRIALING',
  trialEndsAt: '2026-10-30T00:00:00.000Z',
  currentPeriodStart: '2026-10-01T00:00:00.000Z',
  currentPeriodEnd: null,
  canceledAt: null,
  overrideMaxVehicles: 10,
  overrideMaxUsers: null,
  externalProvider: null,
  usage: { users: 2, vehicles: 3, maxUsers: 5, maxVehicles: 10 },
  warnings: [],
};

describe('platform forms', () => {
  it('converte datas e limites', () => {
    expect(toDateInput('2026-10-30T00:00:00.000Z')).toBe('2026-10-30');
    expect(toDateInput(null)).toBe('');
    expect(parseOptionalInt(' ')).toBeNull();
    expect(parseOptionalInt('12')).toBe(12);
  });

  it('envia só a justificativa quando nada mudou', () => {
    const patch = buildSubscriptionPatch(sub, { ...subscriptionFormDefaults(sub), reason: '  ajuste combinado  ' });
    expect(patch).toEqual({ reason: 'ajuste combinado' });
    expect(hasSubscriptionChanges(patch)).toBe(false);
  });

  it('envia campos alterados e null para limpar', () => {
    const patch = buildSubscriptionPatch(sub, {
      ...subscriptionFormDefaults(sub),
      planId: 'p2',
      status: 'ACTIVE',
      trialEndsAt: '',
      currentPeriodEnd: '2026-11-30',
      overrideMaxVehicles: '',
      overrideMaxUsers: '8',
      reason: 'Contrato anual assinado',
    });
    expect(patch).toEqual({
      reason: 'Contrato anual assinado',
      planId: 'p2',
      status: 'ACTIVE',
      trialEndsAt: null,
      currentPeriodEnd: '2026-11-30',
      overrideMaxVehicles: null,
      overrideMaxUsers: 8,
    });
    expect(hasSubscriptionChanges(patch)).toBe(true);
  });

  it('monta a lista completa de recursos', () => {
    expect(featuresPayload([{ key: 'reports.basic' }, { key: 'allocations' }], ['allocations'])).toEqual([
      { key: 'reports.basic', enabled: false },
      { key: 'allocations', enabled: true },
    ]);
  });
});
