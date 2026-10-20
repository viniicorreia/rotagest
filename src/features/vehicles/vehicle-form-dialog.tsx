import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { errorMessage, http } from '@/api/client';
import type { Vehicle, VehicleStatus } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input, NativeSelect } from '@/components/ui/input';
import { MoneyInput } from '@/components/ui/money-input';
import { VEHICLE_STATUS_LABELS } from '../finance/labels';
import { useInvalidateFinance } from '../finance/use-finance';
import { parseRateInput, sameRate, toRateInput } from '../mileage/units';

const PLATE = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/;
const currentYear = new Date().getFullYear();

const schema = z.object({
  name: z.string().trim().min(1, 'Informe um nome ou apelido').max(60),
  plate: z
    .string()
    .transform((v) => v.toUpperCase().replace(/[^A-Z0-9]/g, ''))
    .refine((v) => PLATE.test(v), 'Placa inválida (ex.: ABC1D23 ou ABC1234)'),
  brand: z.string().trim().max(60),
  model: z.string().trim().max(60),
  year: z.string().refine((v) => !v || (/^\d{4}$/.test(v) && +v >= 1950 && +v <= currentYear + 1), 'Ano inválido'),
  odometerKm: z.string().refine((v) => !v || /^\d{1,7}$/.test(v), 'Informe um número inteiro'),
  status: z.enum(['ACTIVE', 'MAINTENANCE', 'INACTIVE']),
  ratePerKm: z.string().refine((v) => !v.trim() || parseRateInput(v) !== null, 'Valor inválido (ex.: 3,50; até 4 casas)'),
  applyRateToUnbilled: z.boolean(),
  notes: z.string().trim().max(1000),
});
type FormIn = z.input<typeof schema>;
type FormOut = z.output<typeof schema>;

export function VehicleFormDialog({ open, onOpenChange, editing }: { open: boolean; onOpenChange: (o: boolean) => void; editing?: Vehicle | null }) {
  const invalidate = useInvalidateFinance();
  const qc = useQueryClient();
  const form = useForm<FormIn, unknown, FormOut>({ resolver: zodResolver(schema) });
  const errors = form.formState.errors;
  const rateInput = form.watch('ratePerKm') ?? '';
  const newRate = rateInput.trim() ? parseRateInput(rateInput) : null;
  // Só pergunta sobre os dias já lançados quando a taxa realmente muda.
  const rateChanged = !!editing && (rateInput.trim() === '' || newRate !== null) && !sameRate(editing.ratePerKm, newRate);

  useEffect(() => {
    if (open)
      form.reset({
        name: editing?.name ?? '',
        plate: editing?.plate ?? '',
        brand: editing?.brand ?? '',
        model: editing?.model ?? '',
        year: editing?.year ? String(editing.year) : '',
        odometerKm: editing ? String(editing.odometerKm) : '',
        status: editing?.status ?? 'ACTIVE',
        ratePerKm: toRateInput(editing?.ratePerKm),
        applyRateToUnbilled: true,
        notes: editing?.notes ?? '',
      });
  }, [open, editing, form]);

  async function submit(v: FormOut) {
    const body = {
      name: v.name,
      plate: v.plate,
      brand: v.brand || null,
      model: v.model || null,
      year: v.year ? Number(v.year) : null,
      odometerKm: v.odometerKm ? Number(v.odometerKm) : 0,
      status: v.status,
      ratePerKm: v.ratePerKm.trim() ? parseRateInput(v.ratePerKm) : null,
      notes: v.notes || null,
    };
    try {
      if (editing) await http.patch(`/vehicles/${editing.id}`, rateChanged ? { ...body, applyRateToUnbilled: v.applyRateToUnbilled } : body);
      else await http.post('/vehicles', body);
      await Promise.all([invalidate(), qc.invalidateQueries({ queryKey: ['daily-logs'] })]);
      toast.success(editing ? 'Veículo atualizado' : 'Veículo cadastrado');
      onOpenChange(false);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !form.formState.isSubmitting && onOpenChange(o)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar veículo' : 'Novo veículo'}</DialogTitle>
          <DialogDescription>Ônibus, van ou micro-ônibus da frota.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(submit)} noValidate className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="v-name" label="Nome ou apelido" error={errors.name?.message}>
              <Input id="v-name" placeholder="Van 01" {...form.register('name')} aria-invalid={!!errors.name} />
            </Field>
            <Field id="v-plate" label="Placa" error={errors.plate?.message}>
              <Input id="v-plate" placeholder="ABC1D23" className="uppercase" autoCapitalize="characters" {...form.register('plate')} aria-invalid={!!errors.plate} />
            </Field>
            <Field id="v-brand" label="Marca" error={errors.brand?.message}>
              <Input id="v-brand" placeholder="Mercedes-Benz" {...form.register('brand')} />
            </Field>
            <Field id="v-model" label="Modelo" error={errors.model?.message}>
              <Input id="v-model" placeholder="Sprinter 416" {...form.register('model')} />
            </Field>
            <Field id="v-year" label="Ano" error={errors.year?.message}>
              <Input id="v-year" inputMode="numeric" placeholder={String(currentYear)} {...form.register('year')} aria-invalid={!!errors.year} />
            </Field>
            <Field id="v-odo" label="Hodômetro (km)" error={errors.odometerKm?.message}>
              <Input id="v-odo" inputMode="numeric" placeholder="0" {...form.register('odometerKm')} aria-invalid={!!errors.odometerKm} />
            </Field>
            <Field id="v-status" label="Situação">
              <NativeSelect id="v-status" {...form.register('status')}>
                {(Object.keys(VEHICLE_STATUS_LABELS) as VehicleStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {VEHICLE_STATUS_LABELS[s]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>
          <Field id="v-rate" label="Valor por km (R$)" error={errors.ratePerKm?.message} hint="Quanto o veículo fatura por km rodado. Deixe vazio se não cobra por km.">
            <MoneyInput id="v-rate" placeholder="3,50" {...form.register('ratePerKm')} aria-invalid={!!errors.ratePerKm} />
          </Field>
          {rateChanged && (
            <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm">
              <input type="checkbox" className="mt-0.5 size-4 accent-[var(--primary)]" {...form.register('applyRateToUnbilled')} />
              <span>
                <span className="font-medium">Recalcular os dias ainda não faturados</span>
                <span className="block text-xs text-muted-foreground">Os km já registrados e não faturados passam a usar o novo valor. Dias já faturados não mudam.</span>
              </span>
            </label>
          )}
          <Field id="v-notes" label="Observações" error={errors.notes?.message}>
            <Input id="v-notes" {...form.register('notes')} />
          </Field>
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
