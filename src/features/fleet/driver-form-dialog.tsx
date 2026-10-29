import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { errorMessage, http } from '@/api/client';
import type { Driver } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input, NativeSelect } from '@/components/ui/input';
import { useAuth } from '@/lib/auth';
import { formatDocument, isValidCpf, onlyDigits } from '@/lib/documents';
import { useMembers } from '../team/use-team';
import { EMPLOYMENT_TYPE_LABELS, RECORD_STATUS_LABELS, useInvalidateFleet, type EmploymentType, type RecordStatus } from './use-fleet';

const schema = z.object({
  name: z.string().trim().min(2, 'Informe o nome').max(80),
  document: z
    .string()
    .transform(onlyDigits)
    .refine((v) => !v || isValidCpf(v), 'CPF inválido'),
  phone: z.string().trim().max(20),
  hiredAt: z.string(),
  employmentType: z.enum(['EMPLOYEE', 'CONTRACTOR', 'PARTNER', 'OTHER']),
  status: z.enum(['ACTIVE', 'INACTIVE']),
  memberId: z.string(),
});
type FormIn = z.input<typeof schema>;
type FormOut = z.output<typeof schema>;

export function DriverFormDialog({ open, onOpenChange, editing, drivers }: { open: boolean; onOpenChange: (o: boolean) => void; editing?: Driver | null; drivers: Driver[] }) {
  const { can } = useAuth();
  const canReadMembers = can('members:read');
  const members = useMembers(open && canReadMembers);
  const invalidate = useInvalidateFleet();
  const form = useForm<FormIn, unknown, FormOut>({ resolver: zodResolver(schema) });
  const errors = form.formState.errors;

  useEffect(() => {
    if (open)
      form.reset({
        name: editing?.name ?? '',
        document: editing?.document ? formatDocument(editing.document) : '',
        phone: editing?.phone ?? '',
        hiredAt: editing?.hiredAt ?? '',
        employmentType: editing?.employmentType ?? 'EMPLOYEE',
        status: editing?.status ?? 'ACTIVE',
        memberId: editing?.member?.id ?? '',
      });
  }, [open, editing, form]);

  // Usuários ativos que ainda não estão ligados a outro motorista (a API confere de novo).
  const linked = new Set(drivers.filter((d) => d.member && d.id !== editing?.id).map((d) => d.member!.id));
  const memberOptions = (members.data ?? []).filter((m) => m.status === 'ACTIVE' && !linked.has(m.id));

  async function submit(v: FormOut) {
    const body: Record<string, unknown> = {
      name: v.name,
      document: v.document || null,
      phone: v.phone || null,
      employmentType: v.employmentType,
      status: v.status,
    };
    if (v.hiredAt) body.hiredAt = v.hiredAt;
    else if (editing?.hiredAt) body.hiredAt = null;
    // Sem acesso à equipe, o vínculo existente é preservado (campo não enviado).
    if (canReadMembers) body.memberId = v.memberId || null;
    try {
      if (editing) await http.patch(`/drivers/${editing.id}`, body);
      else await http.post('/drivers', body);
      await invalidate();
      toast.success(editing ? 'Motorista atualizado' : 'Motorista cadastrado');
      onOpenChange(false);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !form.formState.isSubmitting && onOpenChange(o)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar motorista' : 'Novo motorista'}</DialogTitle>
          <DialogDescription>Cadastro do motorista para escalas, km rodado e despesas.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(submit)} noValidate className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field id="d-name" label="Nome" error={errors.name?.message}>
                <Input id="d-name" autoComplete="off" {...form.register('name')} aria-invalid={!!errors.name} />
              </Field>
            </div>
            <Field id="d-doc" label="CPF (opcional)" error={errors.document?.message}>
              <Input id="d-doc" inputMode="numeric" placeholder="000.000.000-00" {...form.register('document')} aria-invalid={!!errors.document} />
            </Field>
            <Field id="d-phone" label="Telefone" error={errors.phone?.message}>
              <Input id="d-phone" type="tel" inputMode="tel" placeholder="(11) 99999-0000" {...form.register('phone')} />
            </Field>
            <Field id="d-hired" label="Admissão">
              <Input id="d-hired" type="date" {...form.register('hiredAt')} />
            </Field>
            <Field id="d-type" label="Vínculo">
              <NativeSelect id="d-type" {...form.register('employmentType')}>
                {(Object.keys(EMPLOYMENT_TYPE_LABELS) as EmploymentType[]).map((t) => (
                  <option key={t} value={t}>
                    {EMPLOYMENT_TYPE_LABELS[t]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field id="d-status" label="Situação">
              <NativeSelect id="d-status" {...form.register('status')}>
                {(Object.keys(RECORD_STATUS_LABELS) as RecordStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {RECORD_STATUS_LABELS[s]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            {canReadMembers && (
              <Field id="d-member" label="Usuário do portal" hint="Quem entra no app como este motorista (opcional).">
                <NativeSelect id="d-member" {...form.register('memberId')} disabled={members.isPending}>
                  <option value="">Nenhum</option>
                  {editing?.member && !memberOptions.some((m) => m.id === editing.member!.id) && <option value={editing.member.id}>{editing.member.name}</option>}
                  {memberOptions.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.user.name} · {m.roleLabel}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            )}
          </div>
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
