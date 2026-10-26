import { describe, expect, it } from 'vitest';
import { auditActionLabel, formatUsage, subscriptionStatusLabel } from './labels';
import { platformSettingsSchema } from './settings-schema';

describe('platform labels', () => {
  it('formats usage with limit or unlimited', () => {
    expect(formatUsage(2, 2, 'veículo', 'veículos')).toBe('2/2 veículos');
    expect(formatUsage(1, 1, 'usuário', 'usuários')).toBe('1/1 usuário');
    expect(formatUsage(1, 2, 'usuário', 'usuários')).toBe('1/2 usuários');
    expect(formatUsage(3, null, 'veículo', 'veículos')).toBe('3 veículos · ilimitado');
  });

  it('maps audit actions to readable text', () => {
    expect(auditActionLabel('platform.company.suspended')).toBe('Empresa suspensa');
    expect(auditActionLabel('platform.company.activated')).toBe('Empresa reativada');
    expect(auditActionLabel('billing.something.new')).toBe('Evento de cobrança');
    expect(auditActionLabel('other.thing')).toBe('other.thing');
  });

  it('labels support access actions', () => {
    expect(auditActionLabel('support.granted')).toBe('Dono autorizou o acesso do suporte');
    expect(auditActionLabel('support.revoked')).toBe('Dono revogou o acesso do suporte');
    expect(auditActionLabel('support.session_started')).toBe('Suporte entrou na empresa');
    expect(auditActionLabel('support.something_new')).toBe('Acesso do suporte');
  });

  it('labels free-text statuses', () => {
    expect(subscriptionStatusLabel('PAST_DUE')).toBe('Em atraso');
    expect(subscriptionStatusLabel('UNKNOWN')).toBe('UNKNOWN');
  });
});

describe('platform settings schema', () => {
  const base = { allowNewCompanies: true, defaultPlanId: 'p1', trialDays: '14', supportEmail: '' };

  it('converts the form into the API payload', () => {
    expect(platformSettingsSchema.parse(base)).toEqual({ allowNewCompanies: true, defaultPlanId: 'p1', trialDays: 14, supportEmail: null });
    expect(platformSettingsSchema.parse({ ...base, defaultPlanId: '', supportEmail: ' Ajuda@X.com ' })).toEqual({
      allowNewCompanies: true,
      trialDays: 14,
      supportEmail: 'ajuda@x.com',
    });
  });

  it('rejects out-of-range trial days and bad e-mails', () => {
    expect(platformSettingsSchema.safeParse({ ...base, trialDays: '91' }).success).toBe(false);
    expect(platformSettingsSchema.safeParse({ ...base, trialDays: '-1' }).success).toBe(false);
    expect(platformSettingsSchema.safeParse({ ...base, trialDays: '' }).success).toBe(false);
    expect(platformSettingsSchema.safeParse({ ...base, supportEmail: 'x@' }).success).toBe(false);
  });
});
