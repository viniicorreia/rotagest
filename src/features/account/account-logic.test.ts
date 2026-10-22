import { describe, expect, it } from 'vitest';
import { ApiError } from '@/api/client';
import { deleteAccountFailure, deleteAccountSchema } from './account-logic';

describe('exclusão de conta', () => {
  it('exige senha e confirmação, e só envia a senha', () => {
    expect(deleteAccountSchema.parse({ password: 'Senha123', confirm: true })).toEqual({ password: 'Senha123' });
    expect(deleteAccountSchema.safeParse({ password: '', confirm: true }).success).toBe(false);
    expect(deleteAccountSchema.safeParse({ password: 'Senha123', confirm: false }).success).toBe(false);
  });

  it('mostra senha errada no campo e o 409 da API no topo', () => {
    expect(deleteAccountFailure(new ApiError(401, 'INVALID_CREDENTIALS', 'Senha incorreta'))).toEqual({ field: 'password', message: 'Senha incorreta' });
    const owns = new ApiError(409, 'ACCOUNT_OWNS_COMPANY', 'Você é dono de Transportes X.');
    expect(deleteAccountFailure(owns)).toEqual({ field: 'root', message: 'Você é dono de Transportes X.' });
  });

  it('deixa sessão expirada e falhas de rede para o tratamento padrão', () => {
    expect(deleteAccountFailure(new ApiError(401, 'SESSION_EXPIRED', 'Sua sessão expirou.'))).toBeNull();
    expect(deleteAccountFailure(new ApiError(500, 'ERROR', 'x'))).toBeNull();
    expect(deleteAccountFailure(new TypeError('fetch failed'))).toBeNull();
  });
});
