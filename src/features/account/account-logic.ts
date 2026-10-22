import { z } from 'zod';
import { ApiError } from '@/api/client';
import type { DeleteAccountRequest } from '@/api/types';

/** Exclusão de conta: senha atual + ciência explícita de que não dá para desfazer. */
export const deleteAccountSchema = z
  .object({
    password: z.string().min(1, 'Informe sua senha atual'),
    confirm: z.boolean().refine((v) => v, 'Confirme que entendeu que a exclusão é definitiva'),
  })
  .transform((v): DeleteAccountRequest => ({ password: v.password }));

export type DeleteAccountForm = z.input<typeof deleteAccountSchema>;

export type DeleteAccountFailure = { field: 'password' | 'root'; message: string };

/**
 * Onde mostrar o erro da exclusão: senha errada (401) no campo de senha;
 * dono de empresa (409 ACCOUNT_OWNS_COMPANY) e demais erros no topo do formulário.
 * Sessão expirada não é senha errada.
 */
export function deleteAccountFailure(error: unknown): DeleteAccountFailure | null {
  if (!(error instanceof ApiError)) return null;
  if (error.status === 401 && error.code !== 'SESSION_EXPIRED') return { field: 'password', message: 'Senha incorreta' };
  if (error.status === 409) return { field: 'root', message: error.message };
  return null;
}
