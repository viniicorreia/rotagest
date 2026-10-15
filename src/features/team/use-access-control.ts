import { useQuery } from '@tanstack/react-query';
import { http } from '@/api/client';
import type { AccessControl } from '@/api/types';

/** Catálogo de papéis e permissões publicado pela API (fonte única das regras). */
export function useAccessControl() {
  return useQuery({
    queryKey: ['meta', 'access-control'],
    queryFn: () => http.get<AccessControl>('/meta/access-control'),
    staleTime: Infinity,
  });
}
