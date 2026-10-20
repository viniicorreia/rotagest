import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { errorMessage, http } from '@/api/client';
import type { Route } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input, NativeSelect } from '@/components/ui/input';
import { RECORD_STATUS_LABELS, TRANSPORT_TYPE_LABELS, useInvalidateFleet, type RecordStatus, type TransportType } from './use-fleet';

const schema = z.object({
  name: z.string().trim().min(2, 'Informe o nome da rota').max(80),
  description: z.string().trim().max(500),
  transportType: z.enum(['SCHOOL', 'MUNICIPAL', 'CORPORATE', 'CHARTER', 'INTERCITY', 'OTHER']),
  region: z.string().trim().max(60),
  status: z.enum(['ACTIVE', 'INACTIVE']),
});
type FormValues = z.infer<typeof schema>;

export function RouteFormDialog({ open, onOpenChange, editing }: { open: boolean; onOpenChange: (o: boolean) => void; editing?: Route | null }) {
  const invalidate = useInvalidateFleet();
  const form = useForm<FormValues>({ resolver: zodResolver(schema) });
  const errors = form.formState.errors;

  useEffect(() => {
    if (open)
      form.reset({
        name: editing?.name ?? '',
        description: editing?.description ?? '',
        transportType: editing?.transportType ?? 'SCHOOL',
        region: editing?.region ?? '',
        status: editing?.status ?? 'ACTIVE',
      });
  }, [open, editing, form]);

  async function submit(v: FormValues) {
    const body = { name: v.name, description: v.description || null, transportType: v.transportType, region: v.region || null, status: v.status };
    try {
      if (editing) await http.patch(`/routes/${editing.id}`, body);
      else await http.post('/routes', body);
      await invalidate();
      toast.success(editing ? 'Rota atualizada' : 'Rota cadastrada');
      onOpenChange(false);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !form.formState.isSubmitting && onOpenChange(o)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar rota' : 'Nova rota'}</DialogTitle>
          <DialogDescription>Linha ou itinerário atendido pela empresa.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(submit)} noValidate className="space-y-4">
          <Field id="r-name" label="Nome" error={errors.name?.message}>
            <Input id="r-name" placeholder="Escola Municipal Centro — manhã" {...form.register('name')} aria-invalid={!!errors.name} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="r-type" label="Tipo de transporte">
              <NativeSelect id="r-type" {...form.register('transportType')}>
                {(Object.keys(TRANSPORT_TYPE_LABELS) as TransportType[]).map((t) => (
                  <option key={t} value={t}>
                    {TRANSPORT_TYPE_LABELS[t]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field id="r-region" label="Região" error={errors.region?.message}>
              <Input id="r-region" placeholder="Zona Norte" {...form.register('region')} />
            </Field>
            <Field id="r-status" label="Situação">
              <NativeSelect id="r-status" {...form.register('status')}>
                {(Object.keys(RECORD_STATUS_LABELS) as RecordStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {s === 'ACTIVE' ? 'Ativa' : 'Inativa'}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>
          <Field id="r-desc" label="Descrição" error={errors.description?.message}>
            <Input id="r-desc" placeholder="Pontos, horários, observações" {...form.register('description')} />
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
