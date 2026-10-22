import { afterEach, describe, expect, it, vi } from 'vitest';
import { safeNext } from '@/app/guards';
import { tokenStore } from '@/lib/token-store';
import { API_URL, ApiError, http, refreshSession, setReadOnlyHandler } from './client';

afterEach(() => {
  vi.restoreAllMocks();
  tokenStore.set(null);
});

describe('safeNext', () => {
  it('aceita só caminhos internos (evita open redirect)', () => {
    expect(safeNext('/app/team')).toBe('/app/team');
    expect(safeNext('//evil.com')).toBeNull();
    expect(safeNext('https://evil.com')).toBeNull();
    expect(safeNext(null)).toBeNull();
  });
});

describe('cliente HTTP', () => {
  it('usa a URL da API configurada por ambiente (VITE_API_URL)', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await http.get('/meta/access-control');
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/meta/access-control`, expect.objectContaining({ credentials: 'include' }));
    expect(API_URL).toMatch(/\/api\/v1$/);
  });

  it('renova o token uma única vez para 401s simultâneos e repete as requisições', async () => {
    let refreshCalls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        if (url === `${API_URL}/auth/refresh`) {
          refreshCalls += 1;
          return new Response(JSON.stringify({ accessToken: 'novo', expiresIn: 900, activeCompanyId: null }), { status: 200 });
        }
        const auth = (init?.headers as Record<string, string>)?.Authorization;
        if (auth !== 'Bearer novo') return new Response(JSON.stringify({ code: 'SESSION_EXPIRED', message: 'x' }), { status: 401 });
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }),
    );
    tokenStore.set('velho');
    const results = await Promise.all([http.get('/members'), http.get('/subscription'), http.get('/companies/current')]);
    expect(results).toEqual([{ ok: true }, { ok: true }, { ok: true }]);
    expect(refreshCalls).toBe(1);
    expect(tokenStore.get()).toBe('novo');
  });

  it('mantém o access token só em memória', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 401 })));
    expect(await refreshSession()).toBeNull();
    expect(tokenStore.get()).toBeNull();
    expect(JSON.stringify(localStorage)).not.toContain('Bearer');
  });
});

describe('modo suporte (somente leitura)', () => {
  afterEach(() => setReadOnlyHandler(null));

  it('avisa o handler global e ainda rejeita com o erro da API', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ code: 'SUPPORT_READ_ONLY', message: 'O acesso de suporte é somente leitura.' }), { status: 403 })),
    );
    const handler = vi.fn();
    setReadOnlyHandler(handler);
    const error = await http.post('/vehicles', { plate: 'ABC1D23' }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe('SUPPORT_READ_ONLY');
    expect(handler).toHaveBeenCalledWith('O acesso de suporte é somente leitura.');
  });

  it('não dispara o aviso para outros 403', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ code: 'FORBIDDEN', message: 'Sem permissão' }), { status: 403 })));
    const handler = vi.fn();
    setReadOnlyHandler(handler);
    await expect(http.post('/vehicles', {})).rejects.toBeInstanceOf(ApiError);
    expect(handler).not.toHaveBeenCalled();
  });
});
