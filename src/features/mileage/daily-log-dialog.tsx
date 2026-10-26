import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { errorMessage, http } from '@/api/client';
import type { DailyLog, Driver, Route } from '@/api/types';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input, NativeSelect } from '@/components/ui/input';
import { Segmented } from '@/components/ui/segmented';
import { formatDateBR, todayISO } from '@/lib/dates';
import { useVehicles } from '../finance/use-finance';
import { formatPlate } from '../vehicles/vehicles-page';
import { parseKmInput, toKmInput } from './units';

/** Limite de sanidade da API para um dia de um veículo. */
const MAX_KM_PER_DAY = 5000;
const ODOMETER = /^\d{1,7}$/;

const schema = z
  .object({
    vehicleId: z.string().min(1, 'Escolha o veículo'),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe a data'),
    mode: z.enum(['km', 'odometer']),
    kmDriven: z.string(),
    odometerStart: z.string(),
    odometerEnd: z.string(),
    routeId: z.string(),
    driverId: z.string(),
    notes: z.string().trim().max(500),
  })
  .superRefine((v, ctx) => {
    if (v.date > todayISO()) ctx.addIssue({ code: 'custom', path: ['date'], message: 'Não é possível registrar um dia que ainda não aconteceu' });
    if (v.mode === 'km') {
      const km = parseKmInput(v.kmDriven);
      if (km === null) ctx.addIssue({ code: 'custom', path: ['kmDriven'], message: 'Informe os km (ex.: 120 ou 120,5)' });
      else if (Number(km) > MAX_KM_PER_DAY) ctx.addIssue({ code: 'custom', path: ['kmDriven'], message: `Máximo de ${MAX_KM_PER_DAY} km por dia` });
      return;
    }
    if (!ODOMETER.test(v.odometerStart)) ctx.addIssue({ code: 'custom', path: ['odometerStart'], message: 'Informe o hodômetro (número inteiro)' });
    if (!ODOMETER.test(v.odometerEnd)) ctx.addIssue({ code: 'custom', path: ['odometerEnd'], message: 'Informe o hodômetro (número inteiro)' });
    else if (ODOMETER.test(v.odometerStart) && Number(v.odometerEnd) < Number(v.odometerStart))
      ctx.addIssue({ code: 'custom', path: ['odometerEnd'], message: 'Deve ser maior ou igual ao de saída' });
  });

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Edição de um registro existente; sem ele, criação. */
  editing?: DailyLog | null;
  /** Veículo pré-selecionado na criação (o filtro da tela). */
  defaultVehicleId?: string;
  onSaved: () => Promise<unknown>;
}

/** Registro rápido dos km de um veículo num dia: km direto ou hodômetro de saída/chegada (a API calcula a diferença). */
export function DailyLogDialog({ open, onOpenChange, editing, defaultVehicleId, onSaved }: Props) {
  const vehicles = useVehicles(false, open && !editing);
  const drivers = useQuery({
    queryKey: ['drivers', 'options'],
    queryFn: () => http.get<Driver[]>('/drivers?status=ACTIVE'),
    enabled: open,
    staleTime: 60_000,
  });
  const routes = useQuery({
    queryKey: ['routes', 'options'],
    queryFn: () => http.get<Route[]>('/routes?status=ACTIVE'),
    enabled: open,
    staleTime: 60_000,
  });
  const [deleting, setDeleting] = useState(false);
  // Ref, não estado: o clique e o envio do formulário acontecem no mesmo evento.
  const again = useRef(false);

  const defaults = (): FormValues => ({
    vehicleId: editing?.vehicle.id ?? defaultVehicleId ?? '',
    date: editing?.date ?? todayISO(),
    mode: editing && editing.odometerStart !== null ? 'odometer' : 'km',
    kmDriven: editing ? toKmInput(editing.kmDriven) : '',
    odometerStart: editing && editing.odometerStart !== null ? String(editing.odometerStart) : '',
    odometerEnd: editing && editing.odometerEnd !== null ? String(editing.odometerEnd) : '',
    routeId: editing?.route?.id ?? '',
    driverId: editing?.driver?.id ?? '',
    notes: editing?.notes ?? '',
  });

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: defaults() });
  const { errors, isSubmitting } = form.formState;
  const mode = form.watch('mode');
  const vehicleId = form.watch('vehicleId');
  const start = form.watch('odometerStart');
  const end = form.watch('odometerEnd');

  useEffect(() => {
    if (open) form.reset(defaults());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.id]);

  // Na criação, sugere rota e motorista da escala vigente do veículo (se houver e o campo estiver vazio).
  useEffect(() => {
    if (!open || editing || !vehicleId || !routes.data) return;
    for (const r of routes.data) {
      const current = r.current.find((a) => a.vehicle?.id === vehicleId);
      if (!current) continue;
      if (!form.getValues('routeId')) form.setValue('routeId', r.id);
      if (!form.getValues('driverId') && current.driver) form.setValue('driverId', current.driver.id);
      break;
    }
  }, [open, editing, vehicleId, routes.data, form]);

  async function submit(v: FormValues) {
    const keepOpen = again.current;
    again.current = false;
    const km = v.mode === 'km' ? { kmDriven: parseKmInput(v.kmDriven)!, odometerStart: null, odometerEnd: null } : { odometerStart: Number(v.odometerStart), odometerEnd: Number(v.odometerEnd) };
    const common = { ...km, routeId: v.routeId || null, driverId: v.driverId || null, notes: v.notes || null };
    try {
      if (editing) {
        await http.patch(`/daily-logs/${editing.id}`, common);
        toast.success('Registro atualizado');
      } else {
        await http.post('/daily-logs', { vehicleId: v.vehicleId, date: v.date, ...common });
        toast.success('Km registrados');
      }
      await onSaved();
      if (!editing && keepOpen) {
        // Mesmo dia, próximo veículo.
        form.reset({ ...defaults(), vehicleId: '', date: v.date, mode: v.mode });
      } else onOpenChange(false);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  // Só uma prévia para quem digita; os km gravados são calculados pela API.
  const odometerPreview =
    mode === 'odometer' && ODOMETER.test(start) && ODOMETER.test(end) && Number(end) >= Number(start) ? `${(Number(end) - Number(start)).toLocaleString('pt-BR')} km rodados` : undefined;

  return (
    <>
      <Dialog open={open && !deleting} onOpenChange={(o) => !isSubmitting && onOpenChange(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar registro de km' : 'Registrar km do dia'}</DialogTitle>
            <DialogDescription>
              {editing ? `${editing.vehicle.name} · ${formatPlate(editing.vehicle.plate)} · ${formatDateBR(editing.date)}` : 'Um registro por veículo por dia. O valor do dia é calculado pelo valor por km do veículo.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(submit)} noValidate className="space-y-4">
            {!editing && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="dl-vehicle" label="Veículo" error={errors.vehicleId?.message}>
                  <NativeSelect id="dl-vehicle" {...form.register('vehicleId')} aria-invalid={!!errors.vehicleId}>
                    <option value="">Escolha…</option>
                    {vehicles.data?.items.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} · {formatPlate(v.plate)}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                <Field id="dl-date" label="Data" error={errors.date?.message}>
                  <Input id="dl-date" type="date" max={todayISO()} {...form.register('date')} aria-invalid={!!errors.date} />
                </Field>
              </div>
            )}

            <Segmented<FormValues['mode']>
              label="Como informar"
              value={mode}
              onChange={(m) => form.setValue('mode', m)}
              options={[
                { value: 'km', label: 'Km rodados' },
                { value: 'odometer', label: 'Hodômetro' },
              ]}
            />
            {mode === 'km' ? (
              <Field id="dl-km" label="Km rodados no dia" error={errors.kmDriven?.message}>
                <Input id="dl-km" inputMode="decimal" autoComplete="off" placeholder="120" className="tabular-nums" {...form.register('kmDriven')} aria-invalid={!!errors.kmDriven} />
              </Field>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <Field id="dl-start" label="Saída" error={errors.odometerStart?.message}>
                  <Input id="dl-start" inputMode="numeric" autoComplete="off" placeholder="45200" className="tabular-nums" {...form.register('odometerStart')} aria-invalid={!!errors.odometerStart} />
                </Field>
                <Field id="dl-end" label="Chegada" error={errors.odometerEnd?.message} hint={odometerPreview}>
                  <Input id="dl-end" inputMode="numeric" autoComplete="off" placeholder="45320" className="tabular-nums" {...form.register('odometerEnd')} aria-invalid={!!errors.odometerEnd} />
                </Field>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="dl-route" label="Rota (opcional)">
                <NativeSelect id="dl-route" {...form.register('routeId')}>
                  <option value="">Nenhuma</option>
                  {editing?.route && !routes.data?.some((r) => r.id === editing.route!.id) && <option value={editing.route.id}>{editing.route.name}</option>}
                  {routes.data?.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field id="dl-driver" label="Motorista (opcional)">
                <NativeSelect id="dl-driver" {...form.register('driverId')}>
                  <option value="">Nenhum</option>
                  {editing?.driver && !drivers.data?.some((d) => d.id === editing.driver!.id) && <option value={editing.driver.id}>{editing.driver.name}</option>}
                  {drivers.data?.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            </div>
            <Field id="dl-notes" label="Observações (opcional)" error={errors.notes?.message}>
              <Input id="dl-notes" {...form.register('notes')} />
            </Field>

            <DialogFooter className="sm:items-center">
              {editing ? (
                <Button type="button" variant="ghost" className="text-destructive sm:mr-auto" onClick={() => setDeleting(true)} disabled={isSubmitting}>
                  <Trash2 /> Excluir
                </Button>
              ) : (
                <Button type="submit" variant="outline" className="sm:mr-auto" onClick={() => (again.current = true)} disabled={isSubmitting}>
                  Salvar e lançar outro
                </Button>
              )}
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" loading={isSubmitting} onClick={() => (again.current = false)}>
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title="Excluir registro de km?"
        description="O dia deixa de contar nos km e no valor do mês."
        confirmLabel="Excluir"
        destructive
        onConfirm={async () => {
          try {
            await http.delete(`/daily-logs/${editing!.id}`);
            await onSaved();
            toast.success('Registro excluído');
            onOpenChange(false);
          } catch (e) {
            toast.error(errorMessage(e));
            throw e;
          }
        }}
      />
    </>
  );
}
