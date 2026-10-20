import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { errorMessage, http } from '@/api/client';
import type { Contract } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input, NativeSelect } from '@/components/ui/input';
import { MoneyInput } from '@/components/ui/money-input';
import { parseMoneyInput, toMoneyInput } from '@/lib/money';
import { cn } from '@/lib/utils';
import { useCategories, useVehicles } from '../finance/use-finance';
import { useRoutes } from '../fleet/use-fleet';
import { formatPlate } from '../vehicles/vehicles-page';
import { BILLING_TYPE_LABELS, useContractors, useInvalidateContracts, type BillingType } from './use-contracts';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const PERCENT = /^\d{1,3}(\.\d{1,4})?$/;

const schema = z
  .object({
    contractorId: z.string().min(1, 'Escolha o contratante'),
    number: z.string().trim().max(40),
    description: z.string().trim().max(500),
    billingType: z.enum(['MONTHLY', 'FIXED_PERIOD', 'VARIABLE']),
    amount: z.string().refine((v) => parseMoneyInput(v) !== null && !parseMoneyInput(v)!.startsWith('-'), 'Informe o valor'),
    startDate: z.string().regex(DATE, 'Informe o início'),
    endDate: z.string(),
    dueDay: z.coerce.number({ invalid_type_error: 'Informe o dia' }).int().min(1, 'Entre 1 e 31').max(31, 'Entre 1 e 31'),
    dueMonthOffset: z.coerce.number().int().min(0).max(3),
    revenueCategoryId: z.string(),
  })
  .superRefine((v, ctx) => {
    if (v.billingType === 'FIXED_PERIOD' && !v.endDate) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endDate'], message: 'Contrato por período precisa da data de fim' });
    if (v.endDate && v.endDate < v.startDate) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endDate'], message: 'O fim deve ser depois do início' });
  });
type FormIn = z.input<typeof schema>;
type FormOut = z.output<typeof schema>;

const OFFSET_LABELS = ['No mesmo mês da competência', 'No mês seguinte', 'Dois meses depois', 'Três meses depois'];

export function ContractFormDialog({ open, onOpenChange, editing }: { open: boolean; onOpenChange: (o: boolean) => void; editing?: Contract | null }) {
  const invalidate = useInvalidateContracts();
  const contractors = useContractors(open);
  const categories = useCategories('INCOME', false, open);
  const vehicles = useVehicles(false, open);
  const routes = useRoutes(open);
  const form = useForm<FormIn, unknown, FormOut>({ resolver: zodResolver(schema) });
  const errors = form.formState.errors;
  // Veículo → participação digitada ("" = partes iguais). Rotas: ids marcados.
  const [shares, setShares] = useState<Record<string, string>>({});
  const [routeIds, setRouteIds] = useState<string[]>([]);
  const [linksError, setLinksError] = useState<string>();
  const locked = !!editing && editing.status !== 'DRAFT';
  const billingType = form.watch('billingType');

  useEffect(() => {
    if (!open) return;
    form.reset({
      contractorId: editing?.contractor.id ?? '',
      number: editing?.number ?? '',
      description: editing?.description ?? '',
      billingType: editing?.billingType ?? 'MONTHLY',
      amount: editing ? toMoneyInput(editing.amount) : '',
      startDate: editing?.startDate ?? '',
      endDate: editing?.endDate ?? '',
      dueDay: editing?.dueDay ?? 10,
      dueMonthOffset: editing?.dueMonthOffset ?? 1,
      revenueCategoryId: editing?.revenueCategory?.id ?? '',
    });
    setShares(Object.fromEntries((editing?.vehicles ?? []).map((v) => [v.vehicle.id, v.sharePercent ? v.sharePercent.replace('.', ',') : ''])));
    setRouteIds((editing?.routes ?? []).map((r) => r.id));
    setLinksError(undefined);
  }, [open, editing, form]);

  // Mantém na lista veículos/rotas já ligados mesmo que arquivados/inativos.
  const vehicleOptions = [
    ...(vehicles.data?.items.map((v) => ({ id: v.id, label: `${v.name} · ${formatPlate(v.plate)}` })) ?? []),
    ...(editing?.vehicles ?? []).filter((cv) => !vehicles.data?.items.some((v) => v.id === cv.vehicle.id)).map((cv) => ({ id: cv.vehicle.id, label: `${cv.vehicle.name} · ${formatPlate(cv.vehicle.plate)}` })),
  ];
  const routeOptions = [
    ...(routes.data?.filter((r) => r.status === 'ACTIVE' || routeIds.includes(r.id)).map((r) => ({ id: r.id, name: r.name })) ?? []),
    ...(editing?.routes ?? []).filter((er) => !routes.data?.some((r) => r.id === er.id)),
  ];

  function toggleVehicle(id: string) {
    setShares((s) => {
      const next = { ...s };
      if (id in next) delete next[id];
      else next[id] = '';
      return next;
    });
  }

  async function submit(v: FormOut) {
    const vehicleInputs = Object.entries(shares).map(([vehicleId, raw]) => ({ vehicleId, sharePercent: raw.trim().replace(',', '.') || null }));
    if (vehicleInputs.some((x) => x.sharePercent !== null && !PERCENT.test(x.sharePercent))) return setLinksError('Participação inválida (ex.: 50 ou 33,3333)');
    setLinksError(undefined);
    const body: Record<string, unknown> = {
      number: v.number || null,
      description: v.description || null,
      amount: parseMoneyInput(v.amount),
      endDate: v.endDate || null,
      dueDay: v.dueDay,
      dueMonthOffset: v.dueMonthOffset,
      revenueCategoryId: v.revenueCategoryId || null,
      vehicles: vehicleInputs,
      routeIds,
    };
    if (!locked) Object.assign(body, { contractorId: v.contractorId, billingType: v.billingType, startDate: v.startDate });
    if (!editing && !v.endDate) delete body.endDate;
    try {
      if (editing) await http.patch(`/contracts/${editing.id}`, body);
      else await http.post('/contracts', body);
      await invalidate();
      toast.success(editing ? 'Contrato atualizado' : 'Contrato criado como rascunho');
      onOpenChange(false);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !form.formState.isSubmitting && onOpenChange(o)}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar contrato' : 'Novo contrato'}</DialogTitle>
          <DialogDescription>
            {editing && editing.status !== 'DRAFT'
              ? 'As mudanças valem para as competências ainda não geradas. Contratante, tipo e início só mudam no rascunho.'
              : 'O contrato nasce como rascunho. Ao ativar, as contas a receber mensais são geradas automaticamente.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(submit)} noValidate className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field id="c-contractor" label="Contratante" error={errors.contractorId?.message}>
                {locked ? (
                  <Input id="c-contractor" value={editing!.contractor.name} disabled readOnly />
                ) : (
                <NativeSelect id="c-contractor" {...form.register('contractorId')} aria-invalid={!!errors.contractorId}>
                  <option value="">Escolha o contratante</option>
                  {contractors.data
                    ?.filter((c) => c.status === 'ACTIVE' || c.id === editing?.contractor.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  {editing && !contractors.data?.some((c) => c.id === editing.contractor.id) && <option value={editing.contractor.id}>{editing.contractor.name}</option>}
                </NativeSelect>
                )}
              </Field>
            </div>
            <Field id="c-number" label="Número" error={errors.number?.message} hint="Opcional">
              <Input id="c-number" placeholder="012/2026" {...form.register('number')} />
            </Field>
            <Field
              id="c-billing"
              label="Cobrança"
              hint={billingType === 'VARIABLE' ? 'Faturado por km ou manualmente; não gera contas sozinho.' : 'Gera uma conta a receber por mês.'}
            >
              {locked ? (
                <Input id="c-billing" value={BILLING_TYPE_LABELS[editing!.billingType]} disabled readOnly />
              ) : (
                <NativeSelect id="c-billing" {...form.register('billingType')}>
                  {(Object.keys(BILLING_TYPE_LABELS) as BillingType[]).map((b) => (
                    <option key={b} value={b}>
                      {BILLING_TYPE_LABELS[b]}
                    </option>
                  ))}
                </NativeSelect>
              )}
            </Field>
            <Field id="c-amount" label={billingType === 'VARIABLE' ? 'Valor de referência' : 'Valor mensal'} error={errors.amount?.message}>
              <MoneyInput id="c-amount" {...form.register('amount')} aria-invalid={!!errors.amount} />
            </Field>
            <Field id="c-category" label="Categoria de receita" hint="Vazio = Contratos">
              <NativeSelect id="c-category" {...form.register('revenueCategoryId')}>
                <option value="">Padrão (Contratos)</option>
                {categories.data?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
                {editing?.revenueCategory && !categories.data?.some((c) => c.id === editing.revenueCategory!.id) && (
                  <option value={editing.revenueCategory.id}>{editing.revenueCategory.name}</option>
                )}
              </NativeSelect>
            </Field>
            <Field id="c-start" label="Início" error={errors.startDate?.message}>
              {locked ? (
                <Input id="c-start" type="date" value={editing!.startDate} disabled readOnly />
              ) : (
                <Input id="c-start" type="date" {...form.register('startDate')} aria-invalid={!!errors.startDate} />
              )}
            </Field>
            <Field id="c-end" label="Fim" error={errors.endDate?.message} hint={billingType === 'FIXED_PERIOD' ? 'Obrigatório neste tipo' : 'Opcional'}>
              <Input id="c-end" type="date" {...form.register('endDate')} aria-invalid={!!errors.endDate} />
            </Field>
            <Field id="c-due" label="Dia do vencimento" error={errors.dueDay?.message}>
              <Input id="c-due" type="number" inputMode="numeric" min={1} max={31} {...form.register('dueDay')} aria-invalid={!!errors.dueDay} />
            </Field>
            <Field id="c-offset" label="Vencimento" hint="Ex.: competência outubro, vence em novembro = mês seguinte">
              <NativeSelect id="c-offset" {...form.register('dueMonthOffset')}>
                {OFFSET_LABELS.map((label, i) => (
                  <option key={i} value={i}>
                    {label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>
          <Field id="c-desc" label="Descrição" error={errors.description?.message}>
            <Input id="c-desc" placeholder="Transporte escolar — rede municipal" {...form.register('description')} />
          </Field>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Veículos</legend>
            <p className="text-xs text-muted-foreground">Participação de cada veículo na receita (soma 100%). Deixe todas vazias para dividir em partes iguais.</p>
            {vehicleOptions.length ? (
              <ul className="divide-y rounded-lg border">
                {vehicleOptions.map((v) => {
                  const checked = v.id in shares;
                  return (
                    <li key={v.id} className="flex items-center gap-3 px-3 py-2">
                      <label className="flex min-w-0 flex-1 items-center gap-2 text-sm">
                        <input type="checkbox" className="size-4 shrink-0 accent-primary" checked={checked} onChange={() => toggleVehicle(v.id)} />
                        <span className="truncate">{v.label}</span>
                      </label>
                      <div className={cn('relative w-24 shrink-0', !checked && 'invisible')}>
                        <Input
                          aria-label={`Participação de ${v.label}`}
                          inputMode="decimal"
                          placeholder="—"
                          className="pr-7 text-right tabular-nums"
                          value={shares[v.id] ?? ''}
                          onChange={(e) => setShares((s) => ({ ...s, [v.id]: e.target.value }))}
                          tabIndex={checked ? 0 : -1}
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum veículo cadastrado.</p>
            )}
            {linksError && (
              <p role="alert" className="text-sm text-destructive">
                {linksError}
              </p>
            )}
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Rotas</legend>
            {routeOptions.length ? (
              <ul className="grid gap-1 rounded-lg border p-2 sm:grid-cols-2">
                {routeOptions.map((r) => (
                  <li key={r.id}>
                    <label className="flex items-center gap-2 rounded-md px-1 py-1.5 text-sm hover:bg-muted/50">
                      <input
                        type="checkbox"
                        className="size-4 shrink-0 accent-primary"
                        checked={routeIds.includes(r.id)}
                        onChange={() => setRouteIds((ids) => (ids.includes(r.id) ? ids.filter((x) => x !== r.id) : [...ids, r.id]))}
                      />
                      <span className="truncate">{r.name}</span>
                    </label>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma rota cadastrada.</p>
            )}
          </fieldset>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={form.formState.isSubmitting}>
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
