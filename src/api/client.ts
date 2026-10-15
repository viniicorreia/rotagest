import { tokenStore } from '@/lib/token-store';
import type { ApiErrorBody, TokenResponse } from './types';

/**
 * Cliente HTTP único do app. Toda comunicação com a rotagest-api passa por aqui:
 * URL base configurável (VITE_API_URL), Bearer token, renovação de sessão via
 * cookie HttpOnly e erros no formato padrão da API.
 */
export const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1').replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: string[],
  ) {
    super(message);
  }
}

export type { TokenResponse };

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

/** Rotas em que um 401 é resposta final (credenciais), não sessão expirada. */
const NO_RETRY = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout', '/auth/forgot-password', '/auth/reset-password'];

let refreshing: Promise<TokenResponse | null> | null = null;
let onSessionLost: (() => void) | null = null;

export function setSessionLostHandler(handler: () => void): void {
  onSessionLost = handler;
}

async function doRefresh(): Promise<TokenResponse | null> {
  const run = async () => {
    const res = await fetch(`${API_URL}/auth/refresh`, { method: 'POST', credentials: 'include' });
    if (!res.ok) return null;
    return (await res.json()) as TokenResponse;
  };
  // Serializa o refresh entre abas: o cookie é compartilhado e a rotação
  // concorrente com o mesmo token seria tratada como reuso.
  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined;
  return locks ? locks.request('rg-refresh', run) : run();
}

/** Renova o access token uma única vez, mesmo com várias requisições recebendo 401 juntas. */
export function refreshSession(): Promise<TokenResponse | null> {
  refreshing ??= doRefresh()
    .then((r) => {
      tokenStore.set(r?.accessToken ?? null);
      return r;
    })
    .catch(() => {
      tokenStore.set(null);
      return null;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

async function send(method: Method, path: string, body?: unknown): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  return fetch(`${API_URL}${path}`, {
    method,
    headers,
    credentials: 'include',
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export async function api<T>(method: Method, path: string, body?: unknown): Promise<T> {
  let res = await send(method, path, body);
  if (res.status === 401 && !NO_RETRY.some((p) => path.startsWith(p))) {
    const renewed = await refreshSession();
    if (!renewed) {
      onSessionLost?.();
      throw new ApiError(401, 'SESSION_EXPIRED', 'Sua sessão expirou. Entre novamente.');
    }
    res = await send(method, path, body);
  }
  if (!res.ok) {
    let err: Partial<ApiErrorBody> = {};
    try {
      err = (await res.json()) as ApiErrorBody;
    } catch {
      /* corpo vazio */
    }
    const message =
      res.status >= 500 ? 'Não foi possível concluir. Tente novamente em instantes.' : (err.message ?? 'Erro inesperado');
    throw new ApiError(res.status, err.code ?? 'ERROR', message, err.details);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const http = {
  get: <T>(path: string) => api<T>('GET', path),
  post: <T>(path: string, body?: unknown) => api<T>('POST', path, body ?? {}),
  patch: <T>(path: string, body: unknown) => api<T>('PATCH', path, body),
  delete: <T = void>(path: string) => api<T>('DELETE', path),
};

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.details?.length) return error.details[0];
    return error.message;
  }
  return 'Erro inesperado. Verifique sua conexão.';
}
