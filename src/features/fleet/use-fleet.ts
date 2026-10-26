import { useQuery, useQueryClient } from '@tanstack/react-query';
import { http } from '@/api/client';
import type { Assignment, Driver, Route } from '@/api/types';

export type EmploymentType = Driver['employmentType'];
export type TransportType = Route['transportType'];
export type RecordStatus = Driver['status'];

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  EMPLOYEE: 'Funcionário (CLT)',
  CONTRACTOR: 'Prestador de serviço',
  PARTNER: 'Sócio',
  OTHER: 'Outro',
};

export const TRANSPORT_TYPE_LABELS: Record<TransportType, string> = {
  SCHOOL: 'Escolar',
  MUNICIPAL: 'Municipal',
  CORPORATE: 'Fretamento empresarial',
  CHARTER: 'Fretamento eventual',
  INTERCITY: 'Intermunicipal',
  OTHER: 'Outro',
};

export const RECORD_STATUS_LABELS: Record<RecordStatus, string> = { ACTIVE: 'Ativo', INACTIVE: 'Inativo' };

/** "Remover dados pessoais" (LGPD) só vale para motorista inativo e ainda não anonimizado. */
export function canAnonymize(d: Pick<Driver, 'status' | 'anonymized'>): boolean {
  return d.status === 'INACTIVE' && !d.anonymized;
}

/** Confirmação forte da anonimização: a pessoa digita a palavra exata. */
export const ANONYMIZE_CONFIRM_WORD = 'REMOVER';

export function isAnonymizeConfirmed(typed: string): boolean {
  return typed.trim().toUpperCase() === ANONYMIZE_CONFIRM_WORD;
}

/** Motoristas, rotas e escalas andam juntos (rotas atuais do motorista, escala atual da rota). */
export function useInvalidateFleet() {
  const qc = useQueryClient();
  return () => Promise.all(['drivers', 'routes', 'assignments'].map((k) => qc.invalidateQueries({ queryKey: [k] })));
}

export function useDrivers(enabled = true) {
  return useQuery({ queryKey: ['drivers'], queryFn: () => http.get<Driver[]>('/drivers'), enabled });
}

export function useRoutes(enabled = true) {
  return useQuery({ queryKey: ['routes'], queryFn: () => http.get<Route[]>('/routes'), enabled });
}

export interface AssignmentFilters {
  routeId?: string;
  vehicleId?: string;
  driverId?: string;
  current?: boolean;
}

export function useAssignments(filters: AssignmentFilters) {
  const params = new URLSearchParams();
  if (filters.routeId) params.set('routeId', filters.routeId);
  if (filters.vehicleId) params.set('vehicleId', filters.vehicleId);
  if (filters.driverId) params.set('driverId', filters.driverId);
  if (filters.current) params.set('current', 'true');
  return useQuery({ queryKey: ['assignments', params.toString()], queryFn: () => http.get<Assignment[]>(`/assignments?${params}`) });
}
