import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import type { AllocationInput, EntryKind, PaymentMethod, SplitMethod } from '@/api/types';
import { errorMessage, http } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input, NativeSelect } from '@/components/ui/input';
import { MoneyInput } from '@/components/ui/money-input';
import { Segmented } from '@/components/ui/segmented';
import { currentMonth, todayISO } from '@/lib/dates';
import { formatBRL, parseMoneyInput, toMoneyInput } from '@/lib/money';
import { ALLOCATION_METHOD_LABELS, ENTRY_KIND_LABELS, PAYMENT_METHOD_LABELS } from './labels';
import type { ObligationDetail, SideConfig } from './sides';
import { useAuth } from '@/lib/auth';
import { newIdempotencyKey, useAccounts, useCategories, useInvalidateFinance, useVehicles } from './use-finance';

const money = z.string().refine((v) => {
  const parsed = parseMoneyInput(v);
  return parsed !== null && Number(parsed) > 0;
}, 'Informe um valor maior que zero');

/** Percentual do rateio: até 3 dígitos e 4 casas ("33,3333"). */
const PERCENT = /^\d{1,3}([.,]\d{1,4})?$/;
const SPLIT_METHODS = ['EQUAL', 'PERCENT', 'FIXED', 'REVENUE_PROPORTIONAL'] as const satisfies readonly SplitMethod[];
const SPLIT_SHORT_LABELS: Partial<Record<SplitMethod, string>> = { REVENUE_PROPORTIONAL: 'Pela receita' };

const splitItem = z.object({ vehicleId: z.string(), percent: z.string(), amount: z.string() });

const schema = z
  .object({
    description: z.string().trim().min(2, 'Descreva o lançamento').max(200),
    categoryId: z.string().min(1, 'Escolha a categoria'),
    amount: money,
    competence: z.string().regex(/^\d{4}-\d{2}$/, 'Informe a competência'),
    dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe o vencimento'),
    vehicleMode: z.enum(['none', 'single', 'split']),
    vehicleId: z.string(),
    splitMethod: z.enum(SPLIT_METHODS),
    splitItems: z.array(splitItem),
    supplierName: z.string().trim().max(120),
    notes: z.string().trim().max(1000),
    kind: z.enum(['SINGLE', 'INSTALLMENT', 'RECURRING']),
    installmentCount: z.string(),
    frequency: z.enum(['MONTHLY', 'YEARLY']),
    endMonth: z.string(),
    settleNow: z.boolean(),
    accountId: z.string(),
    method: z.string(),
    settledAt: z.string(),
  })
  .superRefine((v, ctx) => {
    if (v.kind === 'INSTALLMENT') {
      const n = Number(v.installmentCount);
      if (!Number.isInteger(n) || n < 2 || n > 120) ctx.addIssue({ code: 'custom', path: ['installmentCount'], message: 'Entre 2 e 120 parcelas' });
    }
    if (v.kind === 'RECURRING' && v.endMonth && v.endMonth < v.competence) {
      ctx.addIssue({ code: 'custom', path: ['endMonth'], message: 'Deve ser depois da competência inicial' });
    }
    if (v.settleNow && v.kind === 'SINGLE' && !v.accountId) ctx.addIssue({ code: 'custom', path: ['accountId'], message: 'Escolha a conta' });
    if (v.vehicleMode === 'single' && !v.vehicleId) ctx.addIssue({ code: 'custom', path: ['vehicleId'], message: 'Escolha o veículo' });
    if (v.vehicleMode === 'split') {
      // Conferências de preenchimento; as somas (100% / valor total) são validadas pela API.
      if (v.splitItems.length < 2) ctx.addIssue({ code: 'custom', path: ['splitItems'], message: 'Escolha pelo menos dois veículos' });
      const seen = new Set<string>();
      v.splitItems.forEach((item, i) => {
        if (!item.vehicleId) ctx.addIssue({ code: 'custom', path: ['splitItems', i, 'vehicleId'], message: 'Escolha o veículo' });
        else if (seen.has(item.vehicleId)) ctx.addIssue({ code: 'custom', path: ['splitItems', i, 'vehicleId'], message: 'Veículo repetido' });
        seen.add(item.vehicleId);
        if (v.splitMethod === 'PERCENT' && (!PERCENT.test(item.percent) || Number(item.percent.replace(',', '.')) <= 0))
          ctx.addIssue({ code: 'custom', path: ['splitItems', i, 'percent'], message: 'Percentual inválido' });
        if (v.splitMethod === 'FIXED' && !(Number(parseMoneyInput(item.amount) ?? 0) > 0))
          ctx.addIssue({ code: 'custom', path: ['splitItems', i, 'amount'], message: 'Valor inválido' });
      });
    }
  });

type FormValues = z.infer<typeof schema>;
type SplitItem = z.infer<typeof splitItem>;

const emptyItem = (): SplitItem => ({ vehicleId: '', percent: '', amount: '' });

/** "33.333300" → "33,3333" (o rateio guarda 6 casas; o campo aceita 4). */
function toPercentInput(value: string): string {
  const [int, dec = ''] = value.split('.');
  const d = dec.slice(0, 4).replace(/0+$/, '');
  return d ? `${int},${d}` : int;
}

/** Estado inicial da seção de veículo a partir do lançamento em edição. */
function vehicleDefaults(editing?: ObligationDetail | null): Pick<FormValues, 'vehicleMode' | 'vehicleId' | 'splitMethod' | 'splitItems'> {
  const split = editing?.allocations.filter((a) => a.method !== 'DIRECT' && a.vehicle) ?? [];
  if (split.length) {
    const first = split[0].method;
    const method: SplitMethod = first === 'EQUAL' || first === 'PERCENT' || first === 'REVENUE_PROPORTIONAL' ? first : 'FIXED';
    return {
      vehicleMode: 'split',
      vehicleId: '',
      splitMethod: method,
      splitItems: split.map((a) => ({ vehicleId: a.vehicle!.id, percent: toPercentInput(a.percent), amount: toMoneyInput(a.amount) })),
    };
  }
  return { vehicleMode: editing?.vehicle ? 'single' : 'none', vehicleId: editing?.vehicle?.id ?? '', splitMethod: 'EQUAL', splitItems: [] };
}

const splitSnapshot = (v: Pick<FormValues, 'vehicleMode' | 'vehicleId' | 'splitMethod' | 'splitItems'>) =>
  JSON.stringify([v.vehicleMode, v.vehicleId, v.splitMethod, v.splitItems]);

/** Campos de veículo/rateio para a API. Em edição, só envia o que mudou (sem mudança, a API reaplica o rateio atual ao novo valor). */
function vehiclePayload(v: FormValues, editing: ObligationDetail | null | undefined, initial: string) {
  if (v.vehicleMode === 'split') {
    if (editing && splitSnapshot(v) === initial) return {};
    const allocations: AllocationInput[] = v.splitItems.map((i) =>
      v.splitMethod === 'PERCENT'
        ? { vehicleId: i.vehicleId, percent: i.percent.replace(',', '.') }
        : v.splitMethod === 'FIXED'
          ? { vehicleId: i.vehicleId, amount: parseMoneyInput(i.amount)! }
          : { vehicleId: i.vehicleId },
    );
    return { vehicleId: editing ? null : undefined, allocationMethod: v.splitMethod, allocations };
  }
  const vehicleId = v.vehicleMode === 'single' ? v.vehicleId : null;
  if (!editing) return { vehicleId: vehicleId ?? undefined };
  // Saindo de um rateio: lista vazia desfaz as partes por veículo.
  const wasSplit = editing.allocations.some((a) => a.method !== 'DIRECT');
  return { vehicleId, ...(wasSplit ? { allocations: [] } : {}) };
}

interface Props {
  config: SideConfig;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Edição de um lançamento existente; sem ele, criação. */
  editing?: ObligationDetail | null;
}

export function ObligationFormDialog({ config, open, onOpenChange, editing }: Props) {
  const isPayable = config.side === 'payables';
  const categories = useCategories(config.categoryType, false, open);
  const { can } = useAuth();
  const vehicles = useVehicles(false, open && can('fleet:read'));
  const accounts = useAccounts(false, open);
  const invalidate = useInvalidateFinance();
  const keyRef = useRef(newIdempotencyKey());

  const defaults = (): FormValues => ({
    description: editing?.description ?? '',
    categoryId: editing?.category.id ?? '',
    amount: editing ? toMoneyInput(editing.amount) : '',
    competence: editing?.competence ?? currentMonth(),
    dueDate: editing?.dueDate ?? todayISO(),
    ...vehicleDefaults(editing),
    supplierName: (editing && 'supplierName' in editing ? editing.supplierName : '') ?? '',
    notes: editing?.notes ?? '',
    kind: 'SINGLE',
    installmentCount: '2',
    frequency: 'MONTHLY',
    endMonth: '',
    settleNow: false,
    accountId: '',
    method: 'PIX',
    settledAt: todayISO(),
  });

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: defaults() });
  const { errors, isSubmitting } = form.formState;
  const kind = form.watch('kind');
  const settleNow = form.watch('settleNow');
  const amount = form.watch('amount');
  const count = Number(form.watch('installmentCount'));
  const vehicleMode = form.watch('vehicleMode');
  const splitMethod = form.watch('splitMethod');
  const splitItems = form.watch('splitItems');
  const split = useFieldArray({ control: form.control, name: 'splitItems' });
  const initialVehicle = useRef('');

  useEffect(() => {
    if (open) {
      const d = defaults();
      form.reset(d);
      initialVehicle.current = splitSnapshot(d);
      keyRef.current = newIdempotencyKey();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.id]);

  useEffect(() => {
    if (open && !form.getValues('accountId') && accounts.data?.items.length) form.setValue('accountId', accounts.data.items[0].id);
  }, [open, accounts.data, form]);

  async function submit(v: FormValues) {
    const value = parseMoneyInput(v.amount)!;
    try {
      if (editing) {
        await http.patch(`${config.path}/${editing.id}`, {
          description: v.description,
          categoryId: v.categoryId,
          amount: value,
          competence: v.competence,
          dueDate: v.dueDate,
          ...vehiclePayload(v, editing, initialVehicle.current),
          ...(isPayable ? { supplierName: v.supplierName || null } : {}),
          notes: v.notes || null,
        });
        toast.success('Lançamento atualizado');
      } else {
        await http.post(config.path, {
          description: v.description,
          categoryId: v.categoryId,
          amount: value,
          competence: v.competence,
          dueDate: v.dueDate,
          ...vehiclePayload(v, null, ''),
          ...(isPayable && v.supplierName ? { supplierName: v.supplierName } : {}),
          notes: v.notes || undefined,
          kind: v.kind,
          installmentCount: v.kind === 'INSTALLMENT' ? Number(v.installmentCount) : undefined,
          recurrence: v.kind === 'RECURRING' ? { frequency: v.frequency, endMonth: v.endMonth || undefined } : undefined,
          settleNow:
            v.kind === 'SINGLE' && v.settleNow
              ? { accountId: v.accountId, method: v.method as PaymentMethod, settledAt: v.settledAt, idempotencyKey: keyRef.current }
              : undefined,
        });
        toast.success(config.createdToast);
      }
      await invalidate();
      onOpenChange(false);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  // Só uma prévia para quem digita; a divisão oficial (centavos, resto na última) é feita pela API.
  const installmentPreview = (() => {
    const total = parseMoneyInput(amount);
    if (kind !== 'INSTALLMENT' || !total || !Number.isInteger(count) || count < 2) return null;
    const cents = Math.round(Number(total) * 100);
    const base = Math.floor(cents / count);
    const last = cents - base * (count - 1);
    return `${count}x de ${formatBRL((base / 100).toFixed(2))}${last !== base ? ` (última ${formatBRL((last / 100).toFixed(2))})` : ''}`;
  })();

  function setVehicleMode(mode: FormValues['vehicleMode']) {
    form.setValue('vehicleMode', mode);
    if (mode === 'split' && form.getValues('splitItems').length < 2) {
      const first = form.getValues('vehicleId');
      form.setValue('splitItems', [{ ...emptyItem(), vehicleId: first }, emptyItem()]);
    }
  }

  // Só uma prévia da soma para quem digita; a API valida 100% / valor total e calcula as partes.
  const splitHint = (() => {
    if (vehicleMode !== 'split') return null;
    if (splitMethod === 'EQUAL') return 'O valor é dividido em partes iguais entre os veículos.';
    if (splitMethod === 'REVENUE_PROPORTIONAL') return 'Cada veículo paga na proporção da receita que gerou na competência. Veículos sem receita no mês ficam de fora.';
    if (splitMethod === 'PERCENT') {
      const units = splitItems.reduce((sum, i) => {
        if (!PERCENT.test(i.percent)) return sum;
        const [int, dec = ''] = i.percent.replace(',', '.').split('.');
        return sum + Number(int) * 10_000 + Number(dec.padEnd(4, '0'));
      }, 0);
      return `Soma: ${(units / 10_000).toLocaleString('pt-BR', { maximumFractionDigits: 4 })}% de 100%`;
    }
    const cents = splitItems.reduce((sum, i) => {
      const parsed = parseMoneyInput(i.amount);
      return parsed ? sum + Math.round(Number(parsed) * 100) : sum;
    }, 0);
    const total = parseMoneyInput(amount);
    return `Soma: ${formatBRL((cents / 100).toFixed(2))}${total ? ` de ${formatBRL(total)}` : ''}`;
  })();

  const vehicleOptions = vehicles.data?.items ?? [];

  return (
    <Dialog open={open} onOpenChange={(o) => !isSubmitting && onOpenChange(o)}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{editing ? `Editar ${config.singular}` : config.newLabel}</DialogTitle>
          <DialogDescription>Competência é o mês a que o valor pertence; vencimento é quando deve ser pago.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(submit)} noValidate className="space-y-4">
          {!editing && (
            <Segmented<EntryKind>
              label="Tipo de lançamento"
              value={kind}
              onChange={(k) => form.setValue('kind', k)}
              options={(['SINGLE', 'INSTALLMENT', 'RECURRING'] as const).map((k) => ({ value: k, label: ENTRY_KIND_LABELS[k] }))}
            />
          )}
          <Field id="ob-description" label="Descrição" error={errors.description?.message}>
            <Input id="ob-description" placeholder={isPayable ? 'Ex.: Troca de óleo Van 01' : 'Ex.: Contrato Escola Municipal'} {...form.register('description')} aria-invalid={!!errors.description} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="ob-amount" label={kind === 'INSTALLMENT' ? 'Valor total' : 'Valor'} error={errors.amount?.message} hint={installmentPreview ?? undefined}>
              <MoneyInput id="ob-amount" {...form.register('amount')} aria-invalid={!!errors.amount} />
            </Field>
            <Field id="ob-category" label="Categoria" error={errors.categoryId?.message}>
              <NativeSelect id="ob-category" {...form.register('categoryId')} aria-invalid={!!errors.categoryId}>
                <option value="">Escolha…</option>
                {categories.data?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field id="ob-competence" label={kind === 'SINGLE' || editing ? 'Competência' : 'Primeira competência'} error={errors.competence?.message}>
              <Input id="ob-competence" type="month" {...form.register('competence')} />
            </Field>
            <Field id="ob-due" label={kind === 'SINGLE' || editing ? 'Vencimento' : 'Primeiro vencimento'} error={errors.dueDate?.message}>
              <Input id="ob-due" type="date" {...form.register('dueDate')} />
            </Field>
          </div>

          {kind === 'INSTALLMENT' && !editing && (
            <Field id="ob-count" label="Número de parcelas" error={errors.installmentCount?.message}>
              <Input id="ob-count" type="number" inputMode="numeric" min={2} max={120} {...form.register('installmentCount')} />
            </Field>
          )}
          {kind === 'RECURRING' && !editing && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="ob-frequency" label="Repetir">
                <NativeSelect id="ob-frequency" {...form.register('frequency')}>
                  <option value="MONTHLY">Todo mês</option>
                  <option value="YEARLY">Todo ano</option>
                </NativeSelect>
              </Field>
              <Field id="ob-end" label="Até (opcional)" error={errors.endMonth?.message} hint="Sem data, repete até você encerrar">
                <Input id="ob-end" type="month" {...form.register('endMonth')} />
              </Field>
            </div>
          )}

          {isPayable && (
            <Field id="ob-supplier" label="Fornecedor (opcional)">
              <Input id="ob-supplier" {...form.register('supplierName')} />
            </Field>
          )}

          {vehicleOptions.length > 0 && (
            <div className="space-y-3 rounded-lg border p-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">Veículo</p>
                <p className="text-xs text-muted-foreground">{isPayable ? 'Custo direto de um veículo ou dividido entre vários.' : 'Receita de um veículo ou dividida entre vários.'}</p>
              </div>
              <Segmented<FormValues['vehicleMode']>
                label="Veículo"
                value={vehicleMode}
                onChange={setVehicleMode}
                options={[
                  { value: 'none', label: 'Sem veículo' },
                  { value: 'single', label: 'Um veículo' },
                  ...(vehicleOptions.length > 1 ? [{ value: 'split' as const, label: 'Dividir entre veículos' }] : []),
                ]}
              />
              {vehicleMode === 'single' && (
                <Field id="ob-vehicle" label="Veículo" error={errors.vehicleId?.message}>
                  <NativeSelect id="ob-vehicle" {...form.register('vehicleId')} aria-invalid={!!errors.vehicleId}>
                    <option value="">Escolha…</option>
                    {vehicleOptions.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} · {v.plate}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
              )}
              {vehicleMode === 'split' && (
                <div className="space-y-3">
                  <Segmented<SplitMethod>
                    label="Como dividir"
                    value={splitMethod}
                    onChange={(m) => form.setValue('splitMethod', m)}
                    options={SPLIT_METHODS.filter((m) => isPayable || m !== 'REVENUE_PROPORTIONAL').map((m) => ({ value: m, label: SPLIT_SHORT_LABELS[m] ?? ALLOCATION_METHOD_LABELS[m] }))}
                  />
                  <ul className="space-y-2">
                    {split.fields.map((f, i) => {
                      const itemErrors = errors.splitItems?.[i];
                      const error = itemErrors?.vehicleId?.message ?? itemErrors?.percent?.message ?? itemErrors?.amount?.message;
                      return (
                        <li key={f.id} className="space-y-1">
                          <div className="flex items-center gap-2">
                            <NativeSelect aria-label={`Veículo ${i + 1}`} className="min-w-0 flex-1" {...form.register(`splitItems.${i}.vehicleId`)} aria-invalid={!!itemErrors?.vehicleId}>
                              <option value="">Escolha…</option>
                              {vehicleOptions.map((v) => (
                                <option key={v.id} value={v.id}>
                                  {v.name} · {v.plate}
                                </option>
                              ))}
                            </NativeSelect>
                            {splitMethod === 'PERCENT' && (
                              <div className="relative w-28 shrink-0">
                                <Input
                                  aria-label={`Percentual do veículo ${i + 1}`}
                                  inputMode="decimal"
                                  autoComplete="off"
                                  placeholder="50"
                                  className="pr-7 tabular-nums"
                                  {...form.register(`splitItems.${i}.percent`)}
                                  aria-invalid={!!itemErrors?.percent}
                                />
                                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                              </div>
                            )}
                            {splitMethod === 'FIXED' && (
                              <div className="w-36 shrink-0">
                                <MoneyInput aria-label={`Valor do veículo ${i + 1}`} {...form.register(`splitItems.${i}.amount`)} aria-invalid={!!itemErrors?.amount} />
                              </div>
                            )}
                            <Button type="button" size="icon" variant="ghost" className="shrink-0" aria-label={`Remover veículo ${i + 1}`} onClick={() => split.remove(i)}>
                              <X />
                            </Button>
                          </div>
                          {error && (
                            <p role="alert" className="text-sm text-destructive">
                              {error}
                            </p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  {errors.splitItems?.message && (
                    <p role="alert" className="text-sm text-destructive">
                      {errors.splitItems.message}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {split.fields.length < vehicleOptions.length && (
                      <Button type="button" size="sm" variant="outline" onClick={() => split.append(emptyItem())}>
                        <Plus /> Adicionar veículo
                      </Button>
                    )}
                    {splitHint && <p className="text-xs tabular-nums text-muted-foreground">{splitHint}</p>}
                  </div>
                </div>
              )}
            </div>
          )}
          <Field id="ob-notes" label="Observações (opcional)">
            <Input id="ob-notes" {...form.register('notes')} />
          </Field>

          {kind === 'SINGLE' && !editing && (
            <div className="space-y-4 rounded-lg border p-3">
              <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium">
                <input type="checkbox" className="size-4 accent-[var(--primary)]" {...form.register('settleNow')} />
                {config.settledNowLabel}
              </label>
              {settleNow && (
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field id="ob-account" label="Conta" error={errors.accountId?.message}>
                    <NativeSelect id="ob-account" {...form.register('accountId')}>
                      {accounts.data?.items.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </NativeSelect>
                  </Field>
                  <Field id="ob-method" label="Forma">
                    <NativeSelect id="ob-method" {...form.register('method')}>
                      {Object.entries(PAYMENT_METHOD_LABELS).map(([k, l]) => (
                        <option key={k} value={k}>
                          {l}
                        </option>
                      ))}
                    </NativeSelect>
                  </Field>
                  <Field id="ob-settled" label="Data">
                    <Input id="ob-settled" type="date" max={todayISO()} {...form.register('settledAt')} />
                  </Field>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {editing ? 'Salvar' : 'Lançar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
