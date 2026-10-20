import { useQuery, useQueryClient } from '@tanstack/react-query';
import { http } from '@/api/client';
import type { Contract, ContractDetail, Contractor } from '@/api/types';
import { FINANCE_KEYS } from '../finance/use-finance';

export type ContractStatus = Contract['status'];
export type BillingType = Contract['billingType'];
export type ContractorKind = Contractor['kind'];
export type StatusChange = Exclude<ContractStatus, 'DRAFT'>;

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  DRAFT: 'Rascunho',
  ACTIVE: 'Ativo',
  SUSPENDED: 'Suspenso',
  ENDED: 'Encerrado',
  CANCELED: 'Cancelado',
};

export const BILLING_TYPE_LABELS: Record<BillingType, string> = {
  MONTHLY: 'Mensal',
  FIXED_PERIOD: 'Mensal por período',
  VARIABLE: 'Variável (km/manual)',
};

export const CONTRACTOR_KIND_LABELS: Record<ContractorKind, string> = {
  SCHOOL: 'Escola',
  CITY_HALL: 'Prefeitura',
  PRIVATE_COMPANY: 'Empresa',
  INDIVIDUAL: 'Pessoa física',
  OTHER: 'Outro',
};

/** Transições aceitas pela API (POST /contracts/:id/status). */
export const STATUS_TRANSITIONS: Record<ContractStatus, StatusChange[]> = {
  DRAFT: ['ACTIVE', 'CANCELED'],
  ACTIVE: ['SUSPENDED', 'ENDED', 'CANCELED'],
  SUSPENDED: ['ACTIVE', 'ENDED', 'CANCELED'],
  ENDED: [],
  CANCELED: [],
};

export const STATUS_ACTION_LABELS: Record<StatusChange, string> = {
  ACTIVE: 'Ativar',
  SUSPENDED: 'Suspender',
  ENDED: 'Encerrar',
  CANCELED: 'Cancelar contrato',
};

/** Contratos geram contas a receber: qualquer escrita invalida também o financeiro. */
export function useInvalidateContracts() {
  const qc = useQueryClient();
  return () => Promise.all(['contracts', 'contract', 'contractors', ...FINANCE_KEYS].map((k) => qc.invalidateQueries({ queryKey: [k] })));
}

export function useContractors(enabled = true) {
  return useQuery({ queryKey: ['contractors'], queryFn: () => http.get<Contractor[]>('/contractors'), enabled });
}

export function useContracts(status: ContractStatus | '') {
  return useQuery({ queryKey: ['contracts', status], queryFn: () => http.get<Contract[]>(`/contracts${status ? `?status=${status}` : ''}`) });
}

export function useContract(id: string | null) {
  return useQuery({ queryKey: ['contract', id], queryFn: () => http.get<ContractDetail>(`/contracts/${id}`), enabled: !!id });
}
