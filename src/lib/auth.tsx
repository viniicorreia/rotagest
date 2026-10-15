import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Permission } from '@/api/types';
import { http, refreshSession, setSessionLostHandler, type TokenResponse } from '@/api/client';
import { tokenStore } from './token-store';
import type { Me } from '@/api/types';

type Status = 'loading' | 'authenticated' | 'anonymous';

interface AuthContextValue {
  status: Status;
  me: Me | undefined;
  /** Grava tokens vindos de login/cadastro/troca de empresa e recarrega o usuário. */
  applyTokens: (tokens: TokenResponse) => Promise<void>;
  switchCompany: (companyId: string) => Promise<void>;
  logout: () => Promise<void>;
  can: (...permissions: Permission[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<Status>('loading');

  // Restaura a sessão a partir do cookie HttpOnly ao abrir o app.
  useEffect(() => {
    let cancelled = false;
    refreshSession().then((r) => {
      if (!cancelled) setStatus(r ? 'authenticated' : 'anonymous');
    });
    setSessionLostHandler(() => {
      tokenStore.set(null);
      queryClient.clear();
      setStatus('anonymous');
    });
    return () => {
      cancelled = true;
    };
  }, [queryClient]);

  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: () => http.get<Me>('/auth/me'),
    enabled: status === 'authenticated',
    staleTime: 60_000,
  });

  const applyTokens = useCallback(
    async (tokens: TokenResponse) => {
      tokenStore.set(tokens.accessToken);
      const fresh = await http.get<Me>('/auth/me');
      // Troca de empresa/usuário: nenhum dado em cache pode atravessar o contexto.
      // A query 'me' é mantida (e substituída) para não desligar o observador ativo.
      queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== 'me' });
      queryClient.setQueryData(['me'], fresh);
      setStatus('authenticated');
    },
    [queryClient],
  );

  const switchCompany = useCallback(
    async (companyId: string) => {
      const tokens = await http.post<TokenResponse>('/auth/switch-company', { companyId });
      await applyTokens(tokens);
    },
    [applyTokens],
  );

  const logout = useCallback(async () => {
    try {
      await http.post('/auth/logout');
    } finally {
      tokenStore.set(null);
      queryClient.clear();
      setStatus('anonymous');
    }
  }, [queryClient]);

  const me = meQuery.data;
  const can = useCallback(
    (...permissions: Permission[]) => !!me?.activeCompany && permissions.every((p) => me.activeCompany!.permissions.includes(p)),
    [me],
  );

  const effectiveStatus: Status = status === 'authenticated' && meQuery.isPending ? 'loading' : status;

  const value = useMemo(
    () => ({ status: effectiveStatus, me, applyTokens, switchCompany, logout, can }),
    [effectiveStatus, me, applyTokens, switchCompany, logout, can],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth fora do AuthProvider');
  return ctx;
}
