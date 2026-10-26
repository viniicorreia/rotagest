import { format, isSameDay } from 'date-fns';
import { z } from 'zod';
import type { CreateSupportGrantRequest, SupportGrantStatus } from '@/api/types';

/*
 * Regras de exibição do acesso do suporte. Quem decide prazo, status e
 * contagem de acessos é a API; aqui só formatamos e validamos o formulário.
 */

export const SUPPORT_GRANT_STATUS_LABELS: Record<SupportGrantStatus, string> = {
  ACTIVE: 'Ativa',
  EXPIRED: 'Expirada',
  REVOKED: 'Revogada',
};

export const SUPPORT_GRANT_STATUS_TONE: Record<SupportGrantStatus, 'default' | 'secondary' | 'destructive'> = {
  ACTIVE: 'default',
  EXPIRED: 'secondary',
  REVOKED: 'destructive',
};

export function supportGrantStatusLabel(status: string): string {
  return SUPPORT_GRANT_STATUS_LABELS[status as SupportGrantStatus] ?? status;
}

/** "Nenhum acesso", "1 acesso", "12 acessos". */
export function formatAccessCount(count: number): string {
  if (count === 0) return 'Nenhum acesso';
  return count === 1 ? '1 acesso' : `${count} acessos`;
}

/** Prazos oferecidos ao dono (a API aceita de 1 a 72 h). */
export const SUPPORT_HOURS_OPTIONS = [
  { value: '2', label: '2 horas' },
  { value: '24', label: '24 horas' },
  { value: '72', label: '3 dias (72 horas)' },
] as const;

export const supportGrantSchema = z
  .object({
    hours: z.enum(['2', '24', '72'], { message: 'Escolha por quanto tempo' }),
    reason: z.string().trim().min(10, 'Explique em pelo menos 10 caracteres').max(500, 'Máximo de 500 caracteres'),
  })
  .transform((v): CreateSupportGrantRequest => ({ hours: Number(v.hours), reason: v.reason }));

export type SupportGrantForm = z.input<typeof supportGrantSchema>;

/**
 * Fim do modo suporte para o banner: "14:30" se termina hoje,
 * "23/10 14:30" se termina em outro dia (autorizações de até 72 h).
 */
export function formatSupportUntil(expiresAt: string | Date, now: Date = new Date()): string {
  const end = new Date(expiresAt);
  return isSameDay(end, now) ? format(end, 'HH:mm') : format(end, 'dd/MM HH:mm');
}

/** Data e hora completas: "23/10/2026 às 14:30". */
export function formatDateTime(value: string | Date): string {
  return format(new Date(value), "dd/MM/yyyy 'às' HH:mm");
}

/** Caminho lido pelo suporte sem o prefixo da API: "/api/v1/reports/x?y" → "/reports/x?y". */
export function shortApiPath(path: string): string {
  return path.replace(/^\/api\/v\d+(?=\/|$)/, '') || '/';
}
