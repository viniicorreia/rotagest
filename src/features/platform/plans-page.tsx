import { zodResolver } from '@hookform/resolvers/zod';
import { Archive, Check, EyeOff, Info, Layers, MoreVertical, Pencil, Plus, RotateCcw, Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { errorMessage, http } from '@/api/client';
import type { BillingInterval, CreatePlanRequest, PlatformPlan, PlatformPlanFeature, UpdatePlanRequest } from '@/api/types';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/ui/empty-state';
import { Fab } from '@/components/ui/fab';
import { Field } from '@/components/ui/field';
import { Input, NativeSelect } from '@/components/ui/input';
import { MoneyInput } from '@/components/ui/money-input';
import { Skeleton } from '@/components/ui/skeleton';
import { formatBRL, parseMoneyInput, toMoneyInput } from '@/lib/money';
import { cn } from '@/lib/utils';
import { INTERVAL_LABELS, PLAN_STATUS_LABELS, formatLimit } from './labels';
import { featuresPayload, parseOptionalInt, toIntInput } from './platform-forms';
import { useInvalidatePlatform, usePlatformPlans } from './use-platform';

export function PlatformPlansPage() {
  const plans = usePlatformPlans();
  const invalidate = useInvalidatePlatform();
  const [form, setForm] = useState<{ plan: PlatformPlan | null } | null>(null);
  const [toggling, setToggling] = useState<PlatformPlan | null>(null);

  async function toggleStatus(plan: PlatformPlan) {
    const archiving = plan.status === 'ACTIVE';
    try {
      await http.patch<PlatformPlan>(`/platform/plans/${plan.id}`, { status: archiving ? 'ARCHIVED' : 'ACTIVE' } satisfies UpdatePlanRequest);
      toast.success(archiving ? 'Plano arquivado' : 'Plano reativado');
      await invalidate();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  const catalog = plans.data?.catalog ?? [];

  return (
    <>
      <PageHeader
        title="Planos"
        description="Preço, limites e recursos oferecidos às empresas."
        actions={
          <Button className="hidden md:inline-flex" onClick={() => setForm({ plan: null })} disabled={!plans.data}>
            <Plus /> Novo plano
          </Button>
        }
      />

      <div className="mb-4 flex gap-3 rounded-xl border bg-muted/40 p-3 text-sm text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
        <p>
          Os limites de veículos e usuários são aplicados em novos cadastros (novos veículos e novos convites). Ao reduzir um limite ou trocar
          o plano, nada do que a empresa já tem é removido.
        </p>
      </div>

      {plans.isPending ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      ) : plans.isError ? (
        <div className="rounded-xl border border-dashed p-6 text-center">
          <p className="text-sm text-destructive">{errorMessage(plans.error)}</p>
          <Button variant="outline" className="mt-3" onClick={() => plans.refetch()}>
            Tentar novamente
          </Button>
        </div>
      ) : !plans.data.items.length ? (
        <EmptyState
          icon={Layers}
          title="Nenhum plano cadastrado"
          description="Crie o primeiro plano para definir preço, limites e recursos das empresas."
          action={
            <Button onClick={() => setForm({ plan: null })}>
              <Plus /> Novo plano
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {plans.data.items.map((plan) => (
            <PlanCard key={plan.id} plan={plan} onEdit={() => setForm({ plan })} onToggle={() => setToggling(plan)} />
          ))}
        </div>
      )}

      <Fab icon={Plus} label="Novo plano" onClick={() => plans.data && setForm({ plan: null })} />
      <PlanFormDialog state={form} catalog={catalog} onClose={() => setForm(null)} />
      {toggling && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setToggling(null)}
          title={toggling.status === 'ACTIVE' ? `Arquivar o plano ${toggling.name}?` : `Reativar o plano ${toggling.name}?`}
          description={
            toggling.status === 'ACTIVE'
              ? `O plano deixa de aceitar novas assinaturas. As ${toggling.subscriptions} assinatura(s) atuais continuam com ele até serem trocadas.`
              : 'O plano volta a poder ser escolhido para assinaturas.'
          }
          confirmLabel={toggling.status === 'ACTIVE' ? 'Arquivar' : 'Reativar'}
          destructive={toggling.status === 'ACTIVE'}
          onConfirm={() => toggleStatus(toggling)}
        />
      )}
    </>
  );
}

function PlanCard({ plan, onEdit, onToggle }: { plan: PlatformPlan; onEdit: () => void; onToggle: () => void }) {
  const archived = plan.status === 'ARCHIVED';
  const enabled = plan.features.filter((f) => f.enabled);
  return (
    <Card className={cn('flex flex-col', archived && 'opacity-75')}>
      <CardHeader>
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1 space-y-1">
            <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
              <span className="break-words">{plan.name}</span>
              {plan.isDefault && (
                <Badge>
                  <Star className="size-3" aria-hidden /> Padrão
                </Badge>
              )}
            </CardTitle>
            <p className="truncate font-mono text-xs text-muted-foreground">{plan.code}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={`Ações para ${plan.name}`}>
                <MoreVertical />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={onEdit}>
                <Pencil /> Editar
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onToggle} className={archived ? undefined : 'text-destructive focus:text-destructive'}>
                {archived ? (
                  <>
                    <RotateCcw /> Reativar
                  </>
                ) : (
                  <>
                    <Archive /> Arquivar
                  </>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant={archived ? 'secondary' : 'default'}>{PLAN_STATUS_LABELS[plan.status]}</Badge>
          {plan.isPublic ? (
            <Badge variant="outline">Público</Badge>
          ) : (
            <Badge variant="outline">
              <EyeOff className="size-3" aria-hidden /> Oculto
            </Badge>
          )}
        </div>
        {plan.description && <CardDescription>{plan.description}</CardDescription>}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4 text-sm">
        <p>
          <span className="text-2xl font-semibold tabular-nums">{formatBRL(plan.price)}</span>
          <span className="text-muted-foreground"> · {INTERVAL_LABELS[plan.interval]}</span>
        </p>
        <dl className="grid grid-cols-3 gap-2">
          <div>
            <dt className="text-xs text-muted-foreground">Veículos</dt>
            <dd className="font-medium tabular-nums">{formatLimit(plan.maxVehicles)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Usuários</dt>
            <dd className="font-medium tabular-nums">{formatLimit(plan.maxUsers)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Assinaturas</dt>
            <dd className="font-medium tabular-nums">{plan.subscriptions}</dd>
          </div>
        </dl>
        <div>
          <p className="mb-1 text-xs text-muted-foreground">Recursos</p>
          {enabled.length ? (
            <ul className="space-y-1">
              {enabled.map((f) => (
                <li key={f.key} className="flex items-center gap-2">
                  <Check className="size-4 shrink-0 text-primary" aria-hidden /> {f.label}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">Nenhum recurso adicional</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

const limitField = z.object({ unlimited: z.boolean(), value: z.string() });

const schema = z
  .object({
    code: z.string().trim(),
    name: z.string().trim().min(2, 'Informe o nome').max(60, 'Use até 60 caracteres'),
    description: z.string().trim().max(300, 'Use até 300 caracteres'),
    price: z.string().refine((v) => parseMoneyInput(v) !== null && !v.trim().startsWith('-'), 'Informe um preço válido'),
    interval: z.enum(['MONTHLY', 'YEARLY']),
    maxVehicles: limitField,
    maxUsers: limitField,
    isPublic: z.boolean(),
    sortOrder: z.string().regex(/^\d{1,4}$/, 'Use um número de 0 a 1000').refine((v) => Number(v) <= 1000, 'Use um número de 0 a 1000'),
    features: z.array(z.string()),
    creating: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.creating) {
      if (!v.code) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['code'], message: 'Informe o código' });
      else if (v.code.length > 40 || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(v.code))
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['code'], message: 'Use minúsculas, números e hífen (ex.: frota-50)' });
    }
    for (const key of ['maxVehicles', 'maxUsers'] as const) {
      const f = v[key];
      if (!f.unlimited && !(/^\d{1,6}$/.test(f.value.trim()) && Number(f.value) >= 1 && Number(f.value) <= 100000))
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [key, 'value'], message: 'Informe um número de 1 a 100.000 ou marque ilimitado' });
    }
  });
type FormValues = z.infer<typeof schema>;

function defaults(plan: PlatformPlan | null): FormValues {
  return {
    code: plan?.code ?? '',
    name: plan?.name ?? '',
    description: plan?.description ?? '',
    price: plan ? toMoneyInput(plan.price) : '',
    interval: plan?.interval ?? 'MONTHLY',
    maxVehicles: { unlimited: plan ? plan.maxVehicles === null : false, value: toIntInput(plan?.maxVehicles) },
    maxUsers: { unlimited: plan ? plan.maxUsers === null : false, value: toIntInput(plan?.maxUsers) },
    isPublic: plan?.isPublic ?? true,
    sortOrder: String(plan?.sortOrder ?? 0),
    features: plan?.features.filter((f) => f.enabled).map((f) => f.key) ?? [],
    creating: !plan,
  };
}

function PlanFormDialog({ state, catalog, onClose }: { state: { plan: PlatformPlan | null } | null; catalog: PlatformPlanFeature[]; onClose: () => void }) {
  const plan = state?.plan ?? null;
  const invalidate = useInvalidatePlatform();
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: defaults(plan) });
  const { errors, isSubmitting } = form.formState;

  useEffect(() => {
    if (state) form.reset(defaults(state.plan));
  }, [state, form]);

  const vehiclesUnlimited = form.watch('maxVehicles.unlimited');
  const usersUnlimited = form.watch('maxUsers.unlimited');

  async function submit(v: FormValues) {
    const body = {
      name: v.name,
      description: v.description || null,
      price: parseMoneyInput(v.price)!,
      interval: v.interval as BillingInterval,
      maxVehicles: v.maxVehicles.unlimited ? null : parseOptionalInt(v.maxVehicles.value),
      maxUsers: v.maxUsers.unlimited ? null : parseOptionalInt(v.maxUsers.value),
      isPublic: v.isPublic,
      sortOrder: Number(v.sortOrder),
      features: featuresPayload(catalog, v.features),
    };
    try {
      if (plan) {
        await http.patch<PlatformPlan>(`/platform/plans/${plan.id}`, body satisfies UpdatePlanRequest);
        toast.success('Plano atualizado');
      } else {
        await http.post<PlatformPlan>('/platform/plans', { ...body, code: v.code } satisfies CreatePlanRequest);
        toast.success('Plano criado');
      }
      await invalidate();
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <Dialog open={!!state} onOpenChange={(o) => !o && !isSubmitting && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{plan ? `Editar ${plan.name}` : 'Novo plano'}</DialogTitle>
          <DialogDescription>
            {plan && plan.subscriptions > 0
              ? `Alterações valem para as ${plan.subscriptions} assinatura(s) deste plano. Limites menores só barram novos cadastros.`
              : 'Limites valem para novos cadastros de veículos e convites.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(submit)} noValidate className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="plan-name" label="Nome" error={errors.name?.message}>
              <Input id="plan-name" placeholder="Ex.: Frota 50" {...form.register('name')} aria-invalid={!!errors.name} />
            </Field>
            {plan ? (
              <Field id="plan-code" label="Código" hint="O código não pode ser alterado">
                <Input id="plan-code" value={plan.code} disabled readOnly className="font-mono" />
              </Field>
            ) : (
              <Field id="plan-code" label="Código" error={errors.code?.message} hint="Minúsculas, números e hífen">
                <Input id="plan-code" placeholder="frota-50" autoCapitalize="none" autoCorrect="off" className="font-mono" {...form.register('code')} aria-invalid={!!errors.code} />
              </Field>
            )}
          </div>
          <Field id="plan-description" label="Descrição (opcional)" error={errors.description?.message}>
            <Input id="plan-description" maxLength={300} {...form.register('description')} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="plan-price" label="Preço" error={errors.price?.message}>
              <MoneyInput id="plan-price" {...form.register('price')} aria-invalid={!!errors.price} />
            </Field>
            <Field id="plan-interval" label="Periodicidade">
              <NativeSelect id="plan-interval" {...form.register('interval')}>
                {(Object.keys(INTERVAL_LABELS) as BillingInterval[]).map((k) => (
                  <option key={k} value={k}>
                    {INTERVAL_LABELS[k]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <LimitField
              id="plan-vehicles"
              label="Limite de veículos"
              unlimited={vehiclesUnlimited}
              error={errors.maxVehicles?.value?.message}
              valueProps={form.register('maxVehicles.value')}
              toggleProps={form.register('maxVehicles.unlimited')}
            />
            <LimitField
              id="plan-users"
              label="Limite de usuários"
              hint="Membros ativos + convites pendentes"
              unlimited={usersUnlimited}
              error={errors.maxUsers?.value?.message}
              valueProps={form.register('maxUsers.value')}
              toggleProps={form.register('maxUsers.unlimited')}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="plan-order" label="Ordem de exibição" error={errors.sortOrder?.message} hint="Menor aparece primeiro">
              <Input id="plan-order" type="number" inputMode="numeric" min={0} max={1000} {...form.register('sortOrder')} aria-invalid={!!errors.sortOrder} />
            </Field>
            <label className="flex items-start gap-3 rounded-lg border p-3 text-sm sm:self-end">
              <input type="checkbox" className="mt-0.5 size-4 accent-[var(--primary)]" {...form.register('isPublic')} />
              <span>
                <span className="font-medium">Público</span>
                <span className="block text-xs text-muted-foreground">Aparece na lista de planos para as empresas</span>
              </span>
            </label>
          </div>
          {catalog.length > 0 && (
            <fieldset className="space-y-2">
              <legend className="mb-1 text-sm font-medium">Recursos</legend>
              {catalog.map((f) => (
                <label key={f.key} className="flex items-center gap-3 text-sm">
                  <input type="checkbox" value={f.key} className="size-4 accent-[var(--primary)]" {...form.register('features')} />
                  {f.label}
                </label>
              ))}
            </fieldset>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {plan ? 'Salvar' : 'Criar plano'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type Registered = ReturnType<ReturnType<typeof useForm<FormValues>>['register']>;

function LimitField({
  id,
  label,
  hint,
  unlimited,
  error,
  valueProps,
  toggleProps,
}: {
  id: string;
  label: string;
  hint?: string;
  unlimited: boolean;
  error?: string;
  valueProps: Registered;
  toggleProps: Registered;
}) {
  return (
    <Field id={id} label={label} error={error} hint={hint}>
      <div className="flex items-center gap-3">
        <Input
          id={id}
          type="number"
          inputMode="numeric"
          min={1}
          max={100000}
          className={cn('min-w-0 flex-1', unlimited && 'bg-muted text-muted-foreground')}
          readOnly={unlimited}
          tabIndex={unlimited ? -1 : undefined}
          placeholder={unlimited ? 'Ilimitado' : undefined}
          aria-invalid={!!error}
          {...valueProps}
        />
        <label className="flex shrink-0 items-center gap-2 text-sm">
          <input type="checkbox" className="size-4 accent-[var(--primary)]" {...toggleProps} />
          Ilimitado
        </label>
      </div>
    </Field>
  );
}
