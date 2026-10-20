import { useQuery, useQueryClient } from '@tanstack/react-query';
import { http } from '@/api/client';
import type {
  CompanyStatus,
  PlatformCompanyDetail,
  PlatformCompanyList,
  PlatformOverview,
  PlatformPlanList,
  PlatformSettings,
  PlatformSubscriptionList,
  SubscriptionStatus,
} from '@/api/types';

/** Todas as consultas da área da plataforma ficam sob ['platform', ...]. */
export const PLATFORM_KEY = ['platform'] as const;

export function useInvalidatePlatform() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: PLATFORM_KEY });
}

function toQuery(params: Record<string, string | number | boolean | null | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') q.set(k, String(v));
  const s = q.toString();
  return s ? `?${s}` : '';
}

export function usePlatformOverview() {
  return useQuery({
    queryKey: ['platform', 'overview'],
    queryFn: () => http.get<PlatformOverview>('/platform/overview'),
  });
}

export interface PlatformCompaniesParams {
  search?: string;
  status?: CompanyStatus;
  page?: number;
  pageSize?: number;
}

export function usePlatformCompanies(params: PlatformCompaniesParams) {
  return useQuery({
    queryKey: ['platform', 'companies', params],
    queryFn: () => http.get<PlatformCompanyList>(`/platform/companies${toQuery({ ...params })}`),
    placeholderData: (prev) => prev,
  });
}

export function usePlatformCompany(id: string | null) {
  return useQuery({
    queryKey: ['platform', 'company', id],
    queryFn: () => http.get<PlatformCompanyDetail>(`/platform/companies/${id}`),
    enabled: !!id,
  });
}

export function usePlatformPlans() {
  return useQuery({
    queryKey: ['platform', 'plans'],
    queryFn: () => http.get<PlatformPlanList>('/platform/plans'),
  });
}

export interface PlatformSubscriptionsParams {
  status?: SubscriptionStatus;
  planId?: string;
  trialEnding?: boolean;
  page?: number;
  pageSize?: number;
}

export function usePlatformSubscriptions(params: PlatformSubscriptionsParams = {}) {
  return useQuery({
    queryKey: ['platform', 'subscriptions', params],
    queryFn: () => http.get<PlatformSubscriptionList>(`/platform/subscriptions${toQuery({ ...params, trialEnding: params.trialEnding || undefined })}`),
    placeholderData: (prev) => prev,
  });
}

export function usePlatformSettings() {
  return useQuery({
    queryKey: ['platform', 'settings'],
    queryFn: () => http.get<PlatformSettings>('/platform/settings'),
  });
}
