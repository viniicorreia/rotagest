import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { errorMessage, http } from '@/api/client';
import type { CreateFuelingRequest, Fueling, PaymentMethod } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input, NativeSelect } from '@/components/ui/input';
import { MoneyInput } from '@/components/ui/money-input';
import { useAuth } from '@/lib/auth';
import { todayISO } from '@/lib/dates';
import { formatBRL, parseMoneyInput } from '@/lib/money';
import { newIdempotencyKey, useAccounts, useVehicles } from '@/features/finance/use-finance';
import { SettleNowFields } from './cost-parts';
import { parseLiters, parseOdometer, parsePricePerLiter, previewFuelTotal } from './format';
import { FUEL_TYPE_LABELS, type FuelType } from './labels';
import { useActiveDrivers, useInvalidateCosts } from './use-costs';

const schema = z
  .object({
    vehicleId: z.string().min(1, 'Escolha o veículo'),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe a data'),
    fuelType: z.enum(Object.keys(FUEL_TYPE_LABELS) as [FuelType, ...FuelType[]]),
    liters: z.string().refine((v) => {
      const parsed = parseLiters(v);
      return parsed !== null && Number(parsed) > 0;
    }, 'Informe os litros (até 3 casas, ex.: 45,320)'),
    pricePerLiter: z.string().refine((v) => {
      const parsed = parsePricePerLiter(v);
      return parsed !== null && Number(parsed) > 0;
    }, 'Informe o preço (até 4 casas, ex.: 6,099)'),
    amount: z.string().refine((v) => {
      if (!v.trim()) return true;
      const parsed = parseMoneyInput(v);
      return parsed !== null && Number(parsed) > 0;
    }, 'Valor inválido'),
    odometerKm: z.string().refine((v) => parseOdometer(v) !== null, 'Informe só números (até 7 dígitos)'),
    station: z.string().trim().max(120),
    driverId: z.string(),
    dueDate: z.string(),
    notes: z.string().trim().max(500),
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

/** Registra abastecimento; a API calcula litros × preço (ou usa o total da nota) e gera a conta a pagar. */
export function FuelingFormDialog({ open, onOpenChange, defaultVehicleId }: Props) {
  const { can } = useAuth();
  const vehicles = useVehicles(false, open);
  const drivers = useActiveDrivers(open && can('fleet:read'));
  const accounts = useAccounts(false, open);
  const invalidate = useInvalidateCosts();
  const keyRef = useRef(newIdempotencyKey());

  const defaults = (): FormValues => ({
    vehicleId: defaultVehicleId ?? '',
    date: todayISO(),
    fuelType: 'DIESEL',
    liters: '',
    pricePerLiter: '',
    amount: '',
    odometerKm: '',
    station: '',
    driverId: '',
    dueDate: '',
    notes: '',
    settleNow: false,
    accountId: '',
    method: 'PIX',
    settledAt: todayISO(),
  });

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: defaults() });
  const { errors, isSubmitting } = form.formState;
  const settleNow = form.watch('settleNow');
  const liters = form.watch('liters');
  const price = form.watch('pricePerLiter');

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
    const body: CreateFuelingRequest = {
      vehicleId: v.vehicleId,
      date: v.date,
      fuelType: v.fuelType,
      liters: parseLiters(v.liters)!,
      pricePerLiter: parsePricePerLiter(v.pricePerLiter)!,
      amount: v.amount.trim() ? parseMoneyInput(v.amount)! : undefined,
      odometerKm: parseOdometer(v.odometerKm) ?? undefined,
      station: v.station || undefined,
      driverId: v.driverId || undefined,
      dueDate: v.dueDate || undefined,
      notes: v.notes || undefined,
      settleNow: v.settleNow ? { accountId: v.accountId, method: v.method as PaymentMethod, settledAt: v.settledAt, idempotencyKey: keyRef.current } : undefined,
    };
    try {
      const created = await http.post<Fueling>('/fuelings', body);
      toast.success(`Abastecimento registrado: ${formatBRL(created.amount)}`);
      await invalidate();
      onOpenChange(false);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  // Prévia não oficial enquanto digita; o total gravado vem da API.
  const preview = previewFuelTotal(parseLiters(liters), parsePricePerLiter(price));

  return (
    <Dialog open={open} onOpenChange={(o) => !isSubmitting && onOpenChange(o)}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Novo abastecimento</DialogTitle>
          <DialogDescription>Gera uma conta a pagar de combustível ligada ao veículo.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(submit)} noValidate className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="fu-vehicle" label="Veículo" error={errors.vehicleId?.message}>
              <NativeSelect id="fu-vehicle" {...form.register('vehicleId')} aria-invalid={!!errors.vehicleId}>
                <option value="">Escolha…</option>
                {vehicles.data?.items.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} · {v.plate}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field id="fu-date" label="Data" error={errors.date?.message}>
              <Input id="fu-date" type="date" {...form.register('date')} />
            </Field>
            <Field id="fu-type" label="Combustível">
              <NativeSelect id="fu-type" {...form.register('fuelType')}>
                {Object.entries(FUEL_TYPE_LABELS).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field id="fu-liters" label="Litros" error={errors.liters?.message}>
              <Input id="fu-liters" inputMode="decimal" autoComplete="off" placeholder="0,000" className="tabular-nums" {...form.register('liters')} aria-invalid={!!errors.liters} />
            </Field>
            <Field id="fu-price" label="Preço por litro" error={errors.pricePerLiter?.message}>
              <MoneyInput id="fu-price" placeholder="0,0000" {...form.register('pricePerLiter')} aria-invalid={!!errors.pricePerLiter} />
            </Field>
            <Field
              id="fu-amount"
              label="Total da nota (opcional)"
              error={errors.amount?.message}
              hint={preview ? `≈ ${formatBRL(preview)} (litros × preço); o sistema calcula o valor final` : 'Só se diferir de litros × preço'}
            >
              <MoneyInput id="fu-amount" {...form.register('amount')} aria-invalid={!!errors.amount} />
            </Field>
            <Field id="fu-odometer" label="Odômetro em km (opcional)" error={errors.odometerKm?.message}>
              <Input id="fu-odometer" inputMode="numeric" autoComplete="off" {...form.register('odometerKm')} aria-invalid={!!errors.odometerKm} />
            </Field>
            <Field id="fu-station" label="Posto (opcional)">
              <Input id="fu-station" placeholder="Ex.: Posto Central" maxLength={120} {...form.register('station')} />
            </Field>
            <Field id="fu-driver" label="Motorista (opcional)">
              <NativeSelect id="fu-driver" {...form.register('driverId')}>
                <option value="">Nenhum</option>
                {drivers.data?.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field id="fu-due" label="Vencimento (opcional)" hint="Padrão: a data do abastecimento">
              <Input id="fu-due" type="date" {...form.register('dueDate')} />
            </Field>
          </div>
          <Field id="fu-notes" label="Observações (opcional)">
            <Input id="fu-notes" maxLength={500} {...form.register('notes')} />
          </Field>

          <SettleNowFields
            idPrefix="fu"
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
