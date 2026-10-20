import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { errorMessage, http } from '@/api/client';
import type { Assignment } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input, NativeSelect } from '@/components/ui/input';
import { formatDateBR, todayISO } from '@/lib/dates';
import { useVehicles } from '../finance/use-finance';
import { formatPlate } from '../vehicles/vehicles-page';
import { useDrivers, useInvalidateFleet, useRoutes } from './use-fleet';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

const schema = z
  .object({
    routeId: z.string().min(1, 'Escolha a rota'),
    vehicleId: z.string(),
    driverId: z.string(),
    startDate: z.string().regex(DATE, 'Informe o início'),
    endDate: z.string(),
    notes: z.string().trim().max(500),
  })
  .superRefine((v, ctx) => {
    if (!v.vehicleId && !v.driverId) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['vehicleId'], message: 'Informe o veículo, o motorista ou os dois' });
    if (v.endDate && v.endDate < v.startDate) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endDate'], message: 'O fim deve ser igual ou depois do início' });
  });
type FormValues = z.infer<typeof schema>;

export function AssignmentFormDialog({ open, onOpenChange, routeId }: { open: boolean; onOpenChange: (o: boolean) => void; routeId?: string }) {
  const invalidate = useInvalidateFleet();
  const routes = useRoutes(open);
  const drivers = useDrivers(open);
  const vehicles = useVehicles(false, open);
  const form = useForm<FormValues>({ resolver: zodResolver(schema) });
  const errors = form.formState.errors;

  useEffect(() => {
    if (open) form.reset({ routeId: routeId ?? '', vehicleId: '', driverId: '', startDate: todayISO(), endDate: '', notes: '' });
  }, [open, routeId, form]);

  async function submit(v: FormValues) {
    try {
      await http.post('/assignments', {
        routeId: v.routeId,
        vehicleId: v.vehicleId || null,
        driverId: v.driverId || null,
        startDate: v.startDate,
        ...(v.endDate ? { endDate: v.endDate } : {}),
        notes: v.notes || null,
      });
      await invalidate();
      toast.success('Escala criada');
      onOpenChange(false);
    } catch (e) {
      // 409: veículo ou motorista já escalado no período.
      toast.error(errorMessage(e));
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !form.formState.isSubmitting && onOpenChange(o)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova escala</DialogTitle>
          <DialogDescription>Define qual veículo e qual motorista fazem a rota a partir de uma data.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(submit)} noValidate className="space-y-4">
          <Field id="a-route" label="Rota" error={errors.routeId?.message}>
            <NativeSelect id="a-route" {...form.register('routeId')} aria-invalid={!!errors.routeId}>
              <option value="">Escolha a rota</option>
              {routes.data
                ?.filter((r) => r.status === 'ACTIVE')
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
            </NativeSelect>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="a-vehicle" label="Veículo" error={errors.vehicleId?.message}>
              <NativeSelect id="a-vehicle" {...form.register('vehicleId')} aria-invalid={!!errors.vehicleId}>
                <option value="">Sem veículo</option>
                {vehicles.data?.items.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} · {formatPlate(v.plate)}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field id="a-driver" label="Motorista">
              <NativeSelect id="a-driver" {...form.register('driverId')}>
                <option value="">Sem motorista</option>
                {drivers.data
                  ?.filter((d) => d.status === 'ACTIVE')
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
              </NativeSelect>
            </Field>
            <Field id="a-start" label="Início" error={errors.startDate?.message}>
              <Input id="a-start" type="date" {...form.register('startDate')} aria-invalid={!!errors.startDate} />
            </Field>
            <Field id="a-end" label="Último dia" error={errors.endDate?.message} hint="Vazio = sem data para terminar">
              <Input id="a-end" type="date" {...form.register('endDate')} aria-invalid={!!errors.endDate} />
            </Field>
          </div>
          <Field id="a-notes" label="Observações" error={errors.notes?.message}>
            <Input id="a-notes" {...form.register('notes')} />
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

/** Encerra a escala num dia; o histórico continua disponível. */
export function EndAssignmentDialog({ target, onClose }: { target: Assignment | null; onClose: () => void }) {
  const invalidate = useInvalidateFleet();
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (target) {
      setEndDate(todayISO() < target.startDate ? target.startDate : todayISO());
      setError(undefined);
    }
  }, [target]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!target) return;
    if (!DATE.test(endDate)) return setError('Informe o último dia');
    if (endDate < target.startDate) return setError('O fim deve ser igual ou depois do início');
    setBusy(true);
    try {
      await http.post(`/assignments/${target.id}/end`, { endDate });
      await invalidate();
      toast.success('Escala encerrada');
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Encerrar escala</DialogTitle>
          <DialogDescription>
            {target ? `${target.route.name} · desde ${formatDateBR(target.startDate)}. ` : ''}O histórico de km e despesas continua ligado a esta escala.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="space-y-4">
          <Field id="a-end-date" label="Último dia" error={error}>
            <Input id="a-end-date" type="date" value={endDate} min={target?.startDate} onChange={(e) => setEndDate(e.target.value)} aria-invalid={!!error} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
              Voltar
            </Button>
            <Button type="submit" loading={busy}>
              Encerrar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
