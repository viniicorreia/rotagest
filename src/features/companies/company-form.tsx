import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { BRAZILIAN_STATES, companySchema, formatDocument, onlyDigits, type CompanyInput } from '@/lib/forms';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input, NativeSelect } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { Company } from '@/api/types';

type FormValues = z.input<typeof companySchema>;

interface CompanyFormProps {
  initial?: Company;
  submitLabel: string;
  readOnly?: boolean;
  onSubmit: (values: CompanyInput) => Promise<void>;
}

function maskDocument(value: string, personType: 'INDIVIDUAL' | 'COMPANY'): string {
  const d = onlyDigits(value).slice(0, personType === 'INDIVIDUAL' ? 11 : 14);
  if (personType === 'INDIVIDUAL') {
    return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  return d
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

export function CompanyForm({ initial, submitLabel, readOnly, onSubmit }: CompanyFormProps) {
  const form = useForm<FormValues, unknown, CompanyInput>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      tradeName: initial?.tradeName ?? '',
      legalName: initial?.legalName ?? '',
      personType: initial?.personType ?? 'COMPANY',
      document: initial ? formatDocument(initial.document) : '',
      phone: initial?.phone ?? '',
      email: initial?.email ?? '',
      address: initial?.address ?? '',
      city: initial?.city ?? '',
      state: (initial?.state as FormValues['state']) ?? '',
      postalCode: initial?.postalCode ?? '',
    },
  });
  const { errors, isSubmitting, isDirty } = form.formState;
  const personType = form.watch('personType');
  const docField = form.register('document');

  return (
    <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <fieldset disabled={readOnly} className="space-y-5">
        <div className="space-y-1.5">
          <span className="text-sm font-medium">Tipo de cadastro</span>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tipo de cadastro">
            {(
              [
                ['COMPANY', 'Empresa (CNPJ)'],
                ['INDIVIDUAL', 'Pessoa física (CPF)'],
              ] as const
            ).map(([value, label]) => (
              <label
                key={value}
                className={cn(
                  'flex h-11 cursor-pointer items-center justify-center rounded-lg border text-sm font-medium transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
                  personType === value ? 'border-primary bg-accent text-accent-foreground' : 'bg-card hover:bg-muted',
                )}
              >
                <input
                  type="radio"
                  value={value}
                  className="sr-only"
                  {...form.register('personType', {
                    onChange: () => form.setValue('document', maskDocument(String(form.getValues('document') ?? ''), value)),
                  })}
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="tradeName" label="Nome comercial" error={errors.tradeName?.message}>
            <Input id="tradeName" aria-invalid={!!errors.tradeName} {...form.register('tradeName')} />
          </Field>
          <Field id="document" label={personType === 'INDIVIDUAL' ? 'CPF' : 'CNPJ'} error={errors.document?.message}>
            <Input
              id="document"
              inputMode="numeric"
              aria-invalid={!!errors.document}
              {...docField}
              onChange={(e) => {
                e.target.value = maskDocument(e.target.value, personType);
                void docField.onChange(e);
              }}
            />
          </Field>
          {personType === 'COMPANY' && (
            <Field id="legalName" label="Razão social (opcional)" error={errors.legalName?.message}>
              <Input id="legalName" {...form.register('legalName')} />
            </Field>
          )}
          <Field id="phone" label="Telefone" error={errors.phone?.message}>
            <Input id="phone" type="tel" inputMode="tel" autoComplete="tel" {...form.register('phone')} />
          </Field>
          <Field id="companyEmail" label="E-mail da empresa" error={errors.email?.message}>
            <Input id="companyEmail" type="email" inputMode="email" {...form.register('email')} />
          </Field>
          <Field id="address" label="Endereço" error={errors.address?.message}>
            <Input id="address" autoComplete="street-address" {...form.register('address')} />
          </Field>
          <Field id="city" label="Cidade" error={errors.city?.message}>
            <Input id="city" autoComplete="address-level2" {...form.register('city')} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field id="state" label="UF" error={errors.state?.message}>
              <NativeSelect id="state" {...form.register('state')}>
                <option value="">—</option>
                {BRAZILIAN_STATES.map((uf) => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field id="postalCode" label="CEP" error={errors.postalCode?.message}>
              <Input id="postalCode" inputMode="numeric" autoComplete="postal-code" {...form.register('postalCode')} />
            </Field>
          </div>
        </div>
      </fieldset>
      {!readOnly && (
        <Button type="submit" className="w-full sm:w-auto" loading={isSubmitting} disabled={!!initial && !isDirty}>
          {submitLabel}
        </Button>
      )}
    </form>
  );
}
