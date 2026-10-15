import { zodResolver } from '@hookform/resolvers/zod';
import { MailCheck } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import type { z } from 'zod';
import { forgotPasswordSchema } from '@/lib/forms';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { errorMessage, http } from '@/api/client';
import { AuthLayout } from './auth-layout';

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const form = useForm<z.infer<typeof forgotPasswordSchema>>({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: '' } });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await http.post('/auth/forgot-password', values);
      setSent(true);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  });

  return (
    <AuthLayout
      title="Recuperar senha"
      description="Enviaremos um link para criar uma nova senha."
      footer={
        <Link className="font-medium text-primary hover:underline" to="/login">
          Voltar para o login
        </Link>
      }
    >
      {sent ? (
        <div className="flex flex-col items-center gap-3 py-4 text-center" role="status">
          <MailCheck className="size-10 text-primary" aria-hidden />
          <p className="text-sm text-muted-foreground">
            Se houver uma conta com este e-mail, você receberá o link em instantes. O link vale por 60 minutos.
          </p>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={onSubmit} noValidate>
          <Field id="email" label="E-mail" error={errors.email?.message}>
            <Input id="email" type="email" autoComplete="email" inputMode="email" aria-invalid={!!errors.email} {...form.register('email')} />
          </Field>
          <Button type="submit" className="w-full" loading={isSubmitting}>
            Enviar link
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
