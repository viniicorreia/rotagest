import { zodResolver } from '@hookform/resolvers/zod';
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
import { VEHICLE_STATUS_LABELS } from '../finance/labels';
import { useInvalidateFinance } from '../finance/use-finance';

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
  notes: z.string().trim().max(1000),
});
type FormIn = z.input<typeof schema>;
type FormOut = z.output<typeof schema>;

export function VehicleFormDialog({ open, onOpenChange, editing }: { open: boolean; onOpenChange: (o: boolean) => void; editing?: Vehicle | null }) {
  const invalidate = useInvalidateFinance();
  const form = useForm<FormIn, unknown, FormOut>({ resolver: zodResolver(schema) });
  const errors = form.formState.errors;

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
      notes: v.notes || null,
    };
    try {
      if (editing) await http.patch(`/vehicles/${editing.id}`, body);
      else await http.post('/vehicles', body);
      await invalidate();
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
