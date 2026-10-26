import { describe, expect, it } from 'vitest';
import { canAnonymize, isAnonymizeConfirmed } from './use-fleet';

describe('remoção de dados pessoais do motorista', () => {
  it('só oferece para motorista inativo ainda não anonimizado', () => {
    expect(canAnonymize({ status: 'INACTIVE', anonymized: false })).toBe(true);
    expect(canAnonymize({ status: 'ACTIVE', anonymized: false })).toBe(false);
    expect(canAnonymize({ status: 'INACTIVE', anonymized: true })).toBe(false);
  });

  it('exige digitar a palavra de confirmação', () => {
    expect(isAnonymizeConfirmed('REMOVER')).toBe(true);
    expect(isAnonymizeConfirmed(' remover ')).toBe(true);
    expect(isAnonymizeConfirmed('remove')).toBe(false);
    expect(isAnonymizeConfirmed('')).toBe(false);
  });
});
