import { describe, expect, it } from 'vitest';
import { firstStepsProgress, isStepBlocked } from './use-first-steps';

const none = { vehicles: 0, drivers: 0, routes: 0, km: 0 };

describe('primeiros passos', () => {
  it('começa pelos veículos quando nada foi cadastrado', () => {
    expect(firstStepsProgress(none)).toEqual({ done: 0, total: 4, next: 'vehicles', complete: false });
  });

  it('aponta o primeiro passo pendente, mesmo fora de ordem', () => {
    expect(firstStepsProgress({ vehicles: 2, drivers: 0, routes: 3, km: 0 })).toMatchObject({ done: 2, next: 'drivers' });
  });

  it('completa quando todos os passos têm cadastro', () => {
    expect(firstStepsProgress({ vehicles: 1, drivers: 1, routes: 1, km: 5 })).toEqual({ done: 4, total: 4, next: null, complete: true });
  });

  it('só libera o km depois de existir um veículo', () => {
    expect(isStepBlocked('km', none)).toBe(true);
    expect(isStepBlocked('km', { ...none, vehicles: 1 })).toBe(false);
    expect(isStepBlocked('drivers', none)).toBe(false);
  });
});
