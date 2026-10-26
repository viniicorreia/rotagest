import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { errorMessage, http } from '@/api/client';
import type { CreateMaintenanceRequest, Maintenance, PaymentMethod } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input, NativeSelect } from '@/components/ui/input';
import { MoneyInput } from '@/components/ui/money-input';
import { todayISO } from '@/lib/dates';
import { parseMoneyInput } from '@/lib/money';
import { newIdempotencyKey, useAccounts, useCategories, useVehicles } from '@/features/finance/use-finance';
import { SettleNowFields } from './cost-parts';
import { parseOdometer } from './format';
import { MAINTENANCE_TYPE_LABELS, type MaintenanceType } from './labels';
import { useInvalidateCosts } from './use-costs';

const schema = z
  .object({
    vehicleId: z.string().min(1, 'Escolha o veículo'),
    type: z.enum(Object.keys(MAINTENANCE_TYPE_LABELS) as [MaintenanceType, ...MaintenanceType[]]),
    description: z.string().trim().min(2, 'Descreva o serviço').max(200),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe a data do serviço'),
    amount: z.string().refine((v) => {
      const parsed = parseMoneyInput(v);
      return parsed !== null && Number(parsed) > 0;
    }, 'Informe um valor maior que zero'),
    dueDate: z.string(),
    odometerKm: z.string().refine((v) => parseOdometer(v) !== null, 'Informe só números (até 7 dígitos)'),
    supplierName: z.string().trim().max(120),
    notes: z.string().trim().max(500),
    categoryId: z.string(),
    settleNow: z.boolean(),
    accountId: z.string(),
    method: z.string(),
    settledAt: z.string(),
  })
  .superRefine((v, ctx) => {
    if (v.settleNow && !v.accountId) ctx.addIssue({ code: 'custom', path: ['accountId'], message: 'Escolha a conta' });
  });

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultVehicleId?: string;
}

/** Registra a manutenção; a API gera a conta a pagar ligada ao veículo (opcionalmente já paga). */
export function MaintenanceFormDialog({ open, onOpenChange, defaultVehicleId }: Props) {
  const vehicles = useVehicles(false, open);
  const categories = useCategories('EXPENSE', false, open);
  const accounts = useAccounts(false, open);
  const invalidate = useInvalidateCosts();
  const keyRef = useRef(newIdempotencyKey());

  const defaults = (): FormValues => ({
    vehicleId: defaultVehicleId ?? '',
    type: 'PREVENTIVE',
    description: '',
    date: todayISO(),
    amount: '',
    dueDate: '',
    odometerKm: '',
    supplierName: '',
    notes: '',
    categoryId: '',
    settleNow: false,
    accountId: '',
    method: 'PIX',
    settledAt: todayISO(),
  });

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: defaults() });
  const { errors, isSubmitting } = form.formState;
  const settleNow = form.watch('settleNow');

  useEffect(() => {
    if (open) {
      form.reset(defaults());
      keyRef.current = newIdempotencyKey();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (open && !form.getValues('accountId') && accounts.data?.items.length) form.setValue('accountId', accounts.data.items[0].id);
  }, [open, accounts.data, form]);

  async function submit(v: FormValues) {
    const body: CreateMaintenanceRequest = {
      vehicleId: v.vehicleId,
      type: v.type,
      description: v.description,
      date: v.date,
      amount: parseMoneyInput(v.amount)!,
      dueDate: v.dueDate || undefined,
      categoryId: v.categoryId || undefined,
      odometerKm: parseOdometer(v.odometerKm) ?? undefined,
      supplierName: v.supplierName || undefined,
      notes: v.notes || undefined,
      settleNow: v.settleNow ? { accountId: v.accountId, method: v.method as PaymentMethod, settledAt: v.settledAt, idempotencyKey: keyRef.current } : undefined,
    };
    try {
      await http.post<Maintenance>('/maintenances', body);
      toast.success(v.settleNow ? 'Manutenção registrada e paga' : 'Manutenção registrada; conta a pagar criada');
      await invalidate();
      onOpenChange(false);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !isSubmitting && onOpenChange(o)}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Nova manutenção</DialogTitle>
          <DialogDescription>Gera uma conta a pagar ligada ao veículo.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(submit)} noValidate className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="mt-vehicle" label="Veículo" error={errors.vehicleId?.message}>
              <NativeSelect id="mt-vehicle" {...form.register('vehicleId')} aria-invalid={!!errors.vehicleId}>
                <option value="">Escolha…</option>
                {vehicles.data?.items.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} · {v.plate}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field id="mt-type" label="Tipo">
              <NativeSelect id="mt-type" {...form.register('type')}>
                {Object.entries(MAINTENANCE_TYPE_LABELS).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>
          <Field id="mt-description" label="Descrição" error={errors.description?.message}>
            <Input id="mt-description" placeholder="Ex.: Troca de óleo e filtros" maxLength={200} {...form.register('description')} aria-invalid={!!errors.description} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="mt-amount" label="Valor" error={errors.amount?.message}>
              <MoneyInput id="mt-amount" {...form.register('amount')} aria-invalid={!!errors.amount} />
            </Field>
            <Field id="mt-date" label="Data do serviço" error={errors.date?.message}>
              <Input id="mt-date" type="date" {...form.register('date')} />
            </Field>
            <Field id="mt-due" label="Vencimento (opcional)" error={errors.dueDate?.message} hint="Padrão: a data do serviço">
              <Input id="mt-due" type="date" {...form.register('dueDate')} />
            </Field>
            <Field id="mt-odometer" label="Odômetro em km (opcional)" error={errors.odometerKm?.message}>
              <Input id="mt-odometer" inputMode="numeric" autoComplete="off" {...form.register('odometerKm')} aria-invalid={!!errors.odometerKm} />
            </Field>
            <Field id="mt-supplier" label="Fornecedor (opcional)">
              <Input id="mt-supplier" placeholder="Ex.: Oficina do João" maxLength={120} {...form.register('supplierName')} />
            </Field>
            <Field id="mt-category" label="Categoria (opcional)" hint="Padrão: Manutenção (Pneus para o tipo Pneus)">
              <NativeSelect id="mt-category" {...form.register('categoryId')}>
                <option value="">Automática</option>
                {categories.data?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>
          <Field id="mt-notes" label="Observações (opcional)">
            <Input id="mt-notes" maxLength={500} {...form.register('notes')} />
          </Field>

          <SettleNowFields
            idPrefix="mt"
            checked={settleNow}
            accounts={accounts.data?.items}
            accountsLoaded={accounts.isSuccess}
            accountError={errors.accountId?.message}
            toggle={form.register('settleNow')}
            account={form.register('accountId')}
            method={form.register('method')}
            settledAt={form.register('settledAt')}
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Registrar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
