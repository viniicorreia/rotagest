import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { CreditCard } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { errorMessage, http } from '@/api/client';
import type { PlatformPlan, PlatformSettings, UpdatePlatformSettingsRequest } from '@/api/types';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input, NativeSelect } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { INTERVAL_LABELS } from './labels';
import { ErrorState } from './platform-ui';
import { platformSettingsSchema, settingsToForm, type PlatformSettingsForm } from './settings-schema';
import { useInvalidatePlatform, usePlatformPlans, usePlatformSettings } from './use-platform';

export function PlatformSettingsPage() {
  const settings = usePlatformSettings();

  return (
    <>
      <PageHeader title="Configurações" description="Regras para novas empresas e contato de suporte." />
      {settings.isPending ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-96 lg:col-span-2" />
          <Skeleton className="h-40" />
        </div>
      ) : settings.isError ? (
        <ErrorState error={settings.error} onRetry={() => settings.refetch()} />
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Novas empresas</CardTitle>
              <CardDescription>
                {settings.data.updatedAt ? `Atualizado em ${format(new Date(settings.data.updatedAt), 'dd/MM/yyyy HH:mm')}.` : 'Valores padrão da plataforma.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SettingsForm key={settings.dataUpdatedAt} settings={settings.data} />
            </CardContent>
          </Card>
          <BillingCard billing={settings.data.billing} />
        </div>
      )}
    </>
  );
}

function SettingsForm({ settings }: { settings: PlatformSettings }) {
  const plans = usePlatformPlans();
  const invalidate = useInvalidatePlatform();
  const form = useForm<PlatformSettingsForm, unknown, UpdatePlatformSettingsRequest>({
    resolver: zodResolver(platformSettingsSchema),
    defaultValues: settingsToForm(settings),
  });
  const { errors, isSubmitting, isDirty } = form.formState;
  const activePlans: PlatformPlan[] = plans.data?.items.filter((p) => p.status === 'ACTIVE') ?? [];
  const currentId = settings.defaultPlan?.id;
  const currentMissing = !!currentId && !!plans.data && !activePlans.some((p) => p.id === currentId);

  async function save(values: UpdatePlatformSettingsRequest) {
    try {
      const saved = await http.patch<PlatformSettings>('/platform/settings', values);
      form.reset(settingsToForm(saved));
      toast.success('Configurações salvas');
      await invalidate();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <form className="space-y-5" onSubmit={form.handleSubmit(save)} noValidate>
      <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring">
        <input type="checkbox" className="mt-0.5 size-4 shrink-0 accent-[var(--primary)]" {...form.register('allowNewCompanies')} />
        <span className="space-y-0.5">
          <span className="block text-sm font-medium">Permitir cadastro de novas empresas</span>
          <span className="block text-xs text-muted-foreground">Desligado, novos usuários conseguem criar conta, mas não abrir uma empresa. Empresas existentes não são afetadas.</span>
        </span>
      </label>

      <Field id="defaultPlanId" label="Plano padrão das novas empresas" error={errors.defaultPlanId?.message} hint="Somente planos ativos podem ser escolhidos.">
        <NativeSelect id="defaultPlanId" disabled={plans.isPending} {...form.register('defaultPlanId')}>
          {!currentId && <option value="">Selecione um plano</option>}
          {currentMissing && (
            <option value={currentId} disabled>
              {settings.defaultPlan?.name} (indisponível)
            </option>
          )}
          {activePlans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} · {INTERVAL_LABELS[p.interval].toLowerCase()}
            </option>
          ))}
        </NativeSelect>
      </Field>
      {plans.isError && <p className="text-sm text-destructive">Não foi possível carregar os planos: {errorMessage(plans.error)}</p>}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="trialDays" label="Dias de teste" error={errors.trialDays?.message} hint="De 0 a 90. Com 0, a assinatura já começa ativa.">
          <Input id="trialDays" inputMode="numeric" aria-invalid={!!errors.trialDays} {...form.register('trialDays')} />
        </Field>
        <Field id="supportEmail" label="E-mail de suporte (opcional)" error={errors.supportEmail?.message} hint="Mostrado às empresas que querem mudar de plano.">
          <Input id="supportEmail" type="email" autoComplete="email" placeholder="suporte@exemplo.com" aria-invalid={!!errors.supportEmail} {...form.register('supportEmail')} />
        </Field>
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" disabled={!isDirty || isSubmitting} onClick={() => form.reset()}>
          Descartar
        </Button>
        <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
          Salvar alterações
        </Button>
      </div>
    </form>
  );
}

function BillingCard({ billing }: { billing: PlatformSettings['billing'] }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="size-4 text-muted-foreground" aria-hidden /> Cobrança
          </CardTitle>
          <Badge variant={billing.configured ? 'default' : 'secondary'}>{billing.configured ? 'Integrada' : 'Não integrada'}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        {billing.configured ? (
          <p>
            As assinaturas são cobradas automaticamente pelo gateway <span className="font-medium text-foreground">{billing.provider ?? '—'}</span>. A situação de cada
            assinatura pode mudar a partir dos avisos do gateway.
          </p>
        ) : (
          <p>
            Nenhum gateway de pagamento está integrado. Os planos são ativados administrativamente e nada é cobrado automaticamente das empresas.
          </p>
        )}
        <p className="text-xs">A integração é configurada no servidor e não pode ser alterada por esta tela.</p>
      </CardContent>
    </Card>
  );
}
