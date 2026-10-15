import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import type { EntryKind, PaymentMethod } from '@/api/types';
import { errorMessage, http } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input, NativeSelect } from '@/components/ui/input';
import { MoneyInput } from '@/components/ui/money-input';
import { Segmented } from '@/components/ui/segmented';
import { currentMonth, todayISO } from '@/lib/dates';
import { formatBRL, parseMoneyInput, toMoneyInput } from '@/lib/money';
import { ENTRY_KIND_LABELS, PAYMENT_METHOD_LABELS } from './labels';
import type { ObligationDetail, SideConfig } from './sides';
import { useAuth } from '@/lib/auth';
import { newIdempotencyKey, useAccounts, useCategories, useInvalidateFinance, useVehicles } from './use-finance';

const money = z.string().refine((v) => {
  const parsed = parseMoneyInput(v);
  return parsed !== null && Number(parsed) > 0;
}, 'Informe um valor maior que zero');

const schema = z
  .object({
    description: z.string().trim().min(2, 'Descreva o lançamento').max(200),
    categoryId: z.string().min(1, 'Escolha a categoria'),
    amount: money,
    competence: z.string().regex(/^\d{4}-\d{2}$/, 'Informe a competência'),
    dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe o vencimento'),
    vehicleId: z.string(),
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
  });

type FormValues = z.infer<typeof schema>;

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
    vehicleId: editing?.vehicle?.id ?? '',
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

  useEffect(() => {
    if (open) {
      form.reset(defaults());
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
          vehicleId: v.vehicleId || null,
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
          vehicleId: v.vehicleId || undefined,
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

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="ob-vehicle" label="Veículo (opcional)" hint={isPayable ? 'Custo direto do veículo' : 'Receita atribuída ao veículo'}>
              <NativeSelect id="ob-vehicle" {...form.register('vehicleId')}>
                <option value="">Nenhum (empresa)</option>
                {vehicles.data?.items.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} · {v.plate}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            {isPayable && (
              <Field id="ob-supplier" label="Fornecedor (opcional)">
                <Input id="ob-supplier" {...form.register('supplierName')} />
              </Field>
            )}
          </div>
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
