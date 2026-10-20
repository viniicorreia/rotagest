import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { errorMessage, http } from '@/api/client';
import type { Contractor } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input, NativeSelect } from '@/components/ui/input';
import { formatDocument, isValidCnpj, isValidCpf, onlyDigits } from '@/lib/documents';
import { CONTRACTOR_KIND_LABELS, useInvalidateContracts, type ContractorKind } from './use-contracts';

const schema = z.object({
  name: z.string().trim().min(2, 'Informe o nome').max(120),
  kind: z.enum(['SCHOOL', 'CITY_HALL', 'PRIVATE_COMPANY', 'INDIVIDUAL', 'OTHER']),
  document: z
    .string()
    .transform(onlyDigits)
    .refine((v) => !v || (v.length === 11 ? isValidCpf(v) : v.length === 14 && isValidCnpj(v)), 'CPF ou CNPJ inválido'),
  email: z.string().trim().toLowerCase().max(254).refine((v) => !v || z.string().email().safeParse(v).success, 'E-mail inválido'),
  phone: z.string().trim().max(20),
  status: z.enum(['ACTIVE', 'INACTIVE']),
});
type FormIn = z.input<typeof schema>;
type FormOut = z.output<typeof schema>;

export function ContractorFormDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing?: Contractor | null;
  onSaved?: (c: Contractor) => void;
}) {
  const invalidate = useInvalidateContracts();
  const form = useForm<FormIn, unknown, FormOut>({ resolver: zodResolver(schema) });
  const errors = form.formState.errors;

  useEffect(() => {
    if (open)
      form.reset({
        name: editing?.name ?? '',
        kind: editing?.kind ?? 'SCHOOL',
        document: editing?.document ? formatDocument(editing.document) : '',
        email: editing?.email ?? '',
        phone: editing?.phone ?? '',
        status: editing?.status ?? 'ACTIVE',
      });
  }, [open, editing, form]);

  async function submit(v: FormOut) {
    const body = { name: v.name, kind: v.kind, document: v.document || null, email: v.email || null, phone: v.phone || null, status: v.status };
    try {
      const saved = editing ? await http.patch<Contractor>(`/contractors/${editing.id}`, body) : await http.post<Contractor>('/contractors', body);
      await invalidate();
      toast.success(editing ? 'Contratante atualizado' : 'Contratante cadastrado');
      onSaved?.(saved);
      onOpenChange(false);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !form.formState.isSubmitting && onOpenChange(o)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar contratante' : 'Novo contratante'}</DialogTitle>
          <DialogDescription>Escola, prefeitura, empresa ou pessoa que contrata o transporte.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(submit)} noValidate className="space-y-4">
          <Field id="ct-name" label="Nome" error={errors.name?.message}>
            <Input id="ct-name" placeholder="Prefeitura de Campinas" {...form.register('name')} aria-invalid={!!errors.name} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="ct-kind" label="Tipo">
              <NativeSelect id="ct-kind" {...form.register('kind')}>
                {(Object.keys(CONTRACTOR_KIND_LABELS) as ContractorKind[]).map((k) => (
                  <option key={k} value={k}>
                    {CONTRACTOR_KIND_LABELS[k]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field id="ct-doc" label="CPF ou CNPJ" error={errors.document?.message} hint="Opcional">
              <Input id="ct-doc" inputMode="numeric" {...form.register('document')} aria-invalid={!!errors.document} />
            </Field>
            <Field id="ct-email" label="E-mail" error={errors.email?.message}>
              <Input id="ct-email" type="email" inputMode="email" autoComplete="off" {...form.register('email')} aria-invalid={!!errors.email} />
            </Field>
            <Field id="ct-phone" label="Telefone" error={errors.phone?.message}>
              <Input id="ct-phone" type="tel" inputMode="tel" {...form.register('phone')} />
            </Field>
            <Field id="ct-status" label="Situação">
              <NativeSelect id="ct-status" {...form.register('status')}>
                <option value="ACTIVE">Ativo</option>
                <option value="INACTIVE">Inativo</option>
              </NativeSelect>
            </Field>
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
