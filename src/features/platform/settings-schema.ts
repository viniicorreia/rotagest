import { z } from 'zod';
import type { PlatformSettings, UpdatePlatformSettingsRequest } from '@/api/types';

/** Formulário de configurações da plataforma (campos como o usuário digita). A API revalida tudo. */
export const platformSettingsSchema = z
  .object({
    allowNewCompanies: z.boolean(),
    defaultPlanId: z.string(),
    trialDays: z
      .string()
      .trim()
      .regex(/^\d{1,2}$/, 'Informe um número inteiro de 0 a 90')
      .refine((v) => Number(v) <= 90, 'Máximo de 90 dias'),
    supportEmail: z.string().trim().toLowerCase().max(254).email('E-mail inválido').or(z.literal('')),
  })
  .transform(
    (v): UpdatePlatformSettingsRequest => ({
      allowNewCompanies: v.allowNewCompanies,
      ...(v.defaultPlanId ? { defaultPlanId: v.defaultPlanId } : {}),
      trialDays: Number(v.trialDays),
      supportEmail: v.supportEmail || null,
    }),
  );

export type PlatformSettingsForm = z.input<typeof platformSettingsSchema>;

export function settingsToForm(s: PlatformSettings): PlatformSettingsForm {
  return {
    allowNewCompanies: s.allowNewCompanies,
    defaultPlanId: s.defaultPlan?.id ?? '',
    trialDays: String(s.trialDays),
    supportEmail: s.supportEmail ?? '',
  };
}
