import { useQuery } from '@tanstack/react-query';
import { http } from '@/api/client';
import type { SubscriptionInfo } from '@/api/types';

export function useSubscription(enabled = true) {
  return useQuery({ queryKey: ['subscription'], queryFn: () => http.get<SubscriptionInfo>('/subscription'), enabled });
}

export const SUBSCRIPTION_STATUS: Record<SubscriptionInfo['status'], { label: string; variant: 'default' | 'secondary' | 'warning' | 'destructive' }> = {
  TRIALING: { label: 'Em teste', variant: 'warning' },
  ACTIVE: { label: 'Ativa', variant: 'default' },
  PAST_DUE: { label: 'Pagamento pendente', variant: 'destructive' },
  CANCELED: { label: 'Cancelada', variant: 'secondary' },
  SUSPENDED: { label: 'Suspensa', variant: 'destructive' },
};
