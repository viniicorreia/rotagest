import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, Info, Pencil, Receipt } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import { errorMessage, http } from '@/api/client';
import type { PlatformSubscription, SubscriptionStatus } from '@/api/types';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { Input, NativeSelect } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateBR } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { CompanyStatusBadge, SUBSCRIPTION_STATUS_LABELS, SubscriptionStatusBadge, formatUsage } from './labels';
import { buildSubscriptionPatch, hasSubscriptionChanges, subscriptionFormDefaults, type SubscriptionFormValues } from './platform-forms';
import { ErrorState, Pagination } from './platform-ui';
import { useInvalidatePlatform, usePlatformPlans, usePlatformSubscriptions } from './use-platform';

const PAGE_SIZE = 20;
const STATUSES = Object.keys(SUBSCRIPTION_STATUS_LABELS) as SubscriptionStatus[];

export function PlatformSubscriptionsPage() {
  const [params, setParams] = useSearchParams();
  const statusParam = params.get('status') ?? '';
  const status = STATUSES.includes(statusParam as SubscriptionStatus) ? (statusParam as SubscriptionStatus) : undefined;
  const planId = params.get('planId') ?? '';
  const trialEnding = params.get('trialEnding') === 'true';
  const page = Math.max(1, Number(params.get('page') ?? '1') || 1);

  const list = usePlatformSubscriptions({
    status,
    planId: planId || undefined,
    trialEnding,
    page,
    pageSize: PAGE_SIZE,
  });
  const plans = usePlatformPlans();
  const [editing, setEditing] = useState<PlatformSubscription | null>(null);

  function set(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next, { replace: true });
  }

  const data = list.data;
  const filtered = !!(status || planId || trialEnding);

  return (
    <>
      <PageHeader title="Assinaturas" description="Plano, situação e limites de cada empresa." />

      <div className="mb-4 flex gap-3 rounded-xl border bg-muted/40 p-3 text-sm text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
        <p>
          Alterações aqui são ativação administrativa: nenhuma cobrança é feita enquanto não houver gateway de pagamento integrado.{' '}
          <strong className="font-medium text-foreground">Suspensa</strong> ou <strong className="font-medium text-foreground">Cancelada</strong>{' '}
          bloqueia o acesso da empresa; <strong className="font-medium text-foreground">Em atraso</strong> não bloqueia.
        </p>
      </div>

      <Card className="mb-4 grid gap-2 p-3 sm:grid-cols-3">
        <NativeSelect aria-label="Status" value={status ?? ''} onChange={(e) => set('status', e.target.value)}>
          <option value="">Todos os status</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {SUBSCRIPTION_STATUS_LABELS[s]}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect aria-label="Plano" value={planId} onChange={(e) => set('planId', e.target.value)}>
          <option value="">Todos os planos</option>
          {plans.data?.items.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
              {p.status === 'ARCHIVED' ? ' (arquivado)' : ''}
            </option>
          ))}
        </NativeSelect>
        <label className="flex h-11 items-center gap-3 rounded-lg border px-3 text-sm md:h-10">
          <input
            type="checkbox"
            className="size-4 accent-[var(--primary)]"
            checked={trialEnding}
            onChange={(e) => set('trialEnding', e.target.checked ? 'true' : '')}
          />
          Teste terminando
        </label>
      </Card>

      {list.isPending ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : list.isError ? (
        <ErrorState error={list.error} onRetry={() => list.refetch()} />
      ) : !data?.items.length ? (
        <EmptyState
          icon={Receipt}
          title={filtered ? 'Nenhuma assinatura com estes filtros' : 'Nenhuma assinatura ainda'}
          description={filtered ? 'Tente remover algum filtro.' : 'As assinaturas aparecem aqui quando as empresas se cadastram.'}
          action={
            filtered && (
              <Button variant="outline" onClick={() => setParams(new URLSearchParams(), { replace: true })}>
                Limpar filtros
              </Button>
            )
          }
        />
      ) : (
        <Card className={cn('overflow-hidden', list.isFetching && 'opacity-70')}>
          {/* Celular: cartões. Desktop: tabela. */}
          <ul className="divide-y md:hidden">
            {data.items.map((s) => (
              <li key={s.id} className="space-y-2 px-4 py-3">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{s.company.tradeName}</p>
                    <p className="truncate text-xs text-muted-foreground">Plano {s.plan.name}</p>
                  </div>
                  <Button variant="ghost" size="icon" aria-label={`Editar assinatura de ${s.company.tradeName}`} onClick={() => setEditing(s)}>
                    <Pencil />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <SubscriptionStatusBadge status={s.status} />
                  {s.company.status !== 'ACTIVE' && <CompanyStatusBadge status={s.company.status} />}
                </div>
                <p className="text-xs text-muted-foreground">
                  {s.trialEndsAt && <>Teste até {formatDateBR(s.trialEndsAt)} · </>}
                  Período até {formatDateBR(s.currentPeriodEnd)}
                </p>
                <UsageLines sub={s} />
                <Warnings warnings={s.warnings} />
              </li>
            ))}
          </ul>
          <table className="hidden w-full text-sm md:table">
            <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Empresa</th>
                <th className="px-4 py-2 font-medium">Plano</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Teste até</th>
                <th className="px-4 py-2 font-medium">Período até</th>
                <th className="px-4 py-2 font-medium">Uso</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.items.map((s) => (
                <tr key={s.id} className="align-top">
                  <td className="max-w-xs px-4 py-3">
                    <p className="truncate font-medium">{s.company.tradeName}</p>
                    <div className="mt-1">
                      <CompanyStatusBadge status={s.company.status} />
                    </div>
                    <Warnings warnings={s.warnings} className="mt-2" />
                  </td>
                  <td className="px-4 py-3">{s.plan.name}</td>
                  <td className="px-4 py-3">
                    <SubscriptionStatusBadge status={s.status} />
                  </td>
                  <td className="px-4 py-3 tabular-nums">{formatDateBR(s.trialEndsAt)}</td>
                  <td className="px-4 py-3 tabular-nums">{formatDateBR(s.currentPeriodEnd)}</td>
                  <td className="px-4 py-3">
                    <UsageLines sub={s} />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Button size="sm" variant="outline" onClick={() => setEditing(s)}>
                      <Pencil /> Editar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} pageSize={data.pageSize} total={data.total} noun="assinaturas" onPage={(n) => set('page', String(n))} />
        </Card>
      )}

      <EditSubscriptionDialog sub={editing} onClose={() => setEditing(null)} />
    </>
  );
}

function UsageLines({ sub }: { sub: PlatformSubscription }) {
  return (
    <div className="space-y-0.5 text-xs tabular-nums">
      <p>
        {formatUsage(sub.usage.vehicles, sub.usage.maxVehicles, 'veículo', 'veículos')}
        {sub.overrideMaxVehicles !== null && <span className="text-muted-foreground"> (exceção)</span>}
      </p>
      <p>
        {formatUsage(sub.usage.users, sub.usage.maxUsers, 'usuário', 'usuários')}
        {sub.overrideMaxUsers !== null && <span className="text-muted-foreground"> (exceção)</span>}
      </p>
    </div>
  );
}

function Warnings({ warnings, className }: { warnings: string[]; className?: string }) {
  if (!warnings.length) return null;
  return (
    <ul className={cn('space-y-1', className)}>
      {warnings.map((w) => (
        <li key={w} className="flex gap-1.5 text-xs text-warning">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span>{w}</span>
        </li>
      ))}
    </ul>
  );
}

const override = z
  .string()
  .trim()
  .refine((v) => v === '' || (/^\d{1,6}$/.test(v) && Number(v) >= 1 && Number(v) <= 100000), 'Use um número de 1 a 100.000 ou deixe vazio');

const schema = z.object({
  planId: z.string().min(1, 'Escolha o plano'),
  status: z.enum(['TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'SUSPENDED']),
  trialEndsAt: z.string(),
  currentPeriodEnd: z.string(),
  overrideMaxVehicles: override,
  overrideMaxUsers: override,
  reason: z.string().trim().min(10, 'Explique em pelo menos 10 caracteres').max(500, 'Use até 500 caracteres'),
}) satisfies z.ZodType<SubscriptionFormValues>;

const EMPTY: SubscriptionFormValues = {
  planId: '',
  status: 'ACTIVE',
  trialEndsAt: '',
  currentPeriodEnd: '',
  overrideMaxVehicles: '',
  overrideMaxUsers: '',
  reason: '',
};

function EditSubscriptionDialog({ sub, onClose }: { sub: PlatformSubscription | null; onClose: () => void }) {
  const plans = usePlatformPlans();
  const invalidate = useInvalidatePlatform();
  const form = useForm<SubscriptionFormValues>({
    resolver: zodResolver(schema),
    defaultValues: sub ? subscriptionFormDefaults(sub) : EMPTY,
  });
  const { errors, isSubmitting } = form.formState;
  const [warnings, setWarnings] = useState<string[]>([]);

  useEffect(() => {
    if (sub) {
      form.reset(subscriptionFormDefaults(sub));
      setWarnings([]);
    }
  }, [sub, form]);

  const planOptions = [
    ...(plans.data?.items.filter((p) => p.status === 'ACTIVE' || p.id === sub?.plan.id) ?? []).map((p) => ({
      id: p.id,
      label: `${p.name}${p.status === 'ARCHIVED' ? ' (arquivado)' : ''}`,
    })),
  ];
  if (sub && !planOptions.some((p) => p.id === sub.plan.id)) planOptions.unshift({ id: sub.plan.id, label: sub.plan.name });

  async function submit(values: SubscriptionFormValues) {
    if (!sub) return;
    const patch = buildSubscriptionPatch(sub, values);
    if (!hasSubscriptionChanges(patch)) {
      form.setError('root', { message: 'Nenhuma alteração para salvar.' });
      return;
    }
    try {
      const updated = await http.patch<PlatformSubscription>(`/platform/subscriptions/${sub.id}`, patch);
      await invalidate();
      if (updated.warnings.length) {
        toast.warning('Assinatura atualizada com avisos', {
          description: updated.warnings.join(' '),
        });
        setWarnings(updated.warnings);
      } else {
        toast.success('Assinatura atualizada');
        onClose();
      }
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  const done = warnings.length > 0;

  return (
    <Dialog open={!!sub} onOpenChange={(o) => !o && !isSubmitting && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Editar assinatura</DialogTitle>
          <DialogDescription>{sub?.company.tradeName}</DialogDescription>
        </DialogHeader>
        {done ? (
          <>
            <p className="mb-3 text-sm">A assinatura foi atualizada. Confira os avisos:</p>
            <Warnings warnings={warnings} className="[&_li]:text-sm" />
            <DialogFooter>
              <Button onClick={onClose}>Concluir</Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={form.handleSubmit(submit)} onChange={() => errors.root && form.clearErrors('root')} noValidate className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="sub-plan" label="Plano" error={errors.planId?.message}>
                <NativeSelect id="sub-plan" {...form.register('planId')} aria-invalid={!!errors.planId}>
                  {planOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field id="sub-status" label="Status" hint="Suspensa e Cancelada bloqueiam o acesso">
                <NativeSelect id="sub-status" {...form.register('status')}>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {SUBSCRIPTION_STATUS_LABELS[s]}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field id="sub-trial" label="Teste até" hint="Vazio remove a data">
                <Input id="sub-trial" type="date" {...form.register('trialEndsAt')} />
              </Field>
              <Field id="sub-period" label="Período pago até" hint="Vazio remove a data">
                <Input id="sub-period" type="date" {...form.register('currentPeriodEnd')} />
              </Field>
              <Field id="sub-vehicles" label="Exceção de veículos" error={errors.overrideMaxVehicles?.message} hint="Vazio = vale o do plano">
                <Input
                  id="sub-vehicles"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={100000}
                  {...form.register('overrideMaxVehicles')}
                  aria-invalid={!!errors.overrideMaxVehicles}
                />
              </Field>
              <Field id="sub-users" label="Exceção de usuários" error={errors.overrideMaxUsers?.message} hint="Vazio = vale o do plano">
                <Input
                  id="sub-users"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={100000}
                  {...form.register('overrideMaxUsers')}
                  aria-invalid={!!errors.overrideMaxUsers}
                />
              </Field>
            </div>
            <Field id="sub-reason" label="Justificativa" error={errors.reason?.message} hint="Fica registrada na auditoria (10 a 500 caracteres)">
              <Input
                id="sub-reason"
                maxLength={500}
                placeholder="Ex.: Contrato anual assinado em 15/10"
                {...form.register('reason')}
                aria-invalid={!!errors.reason}
              />
            </Field>
            <p className="text-xs text-muted-foreground">Nenhuma cobrança é feita: a alteração só muda o que a empresa pode usar.</p>
            {errors.root && (
              <p role="alert" className="text-sm text-destructive">
                {errors.root.message}
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" loading={isSubmitting}>
                Salvar
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
