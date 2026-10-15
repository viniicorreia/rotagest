import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { registerSchema, type RegisterInput } from '@/lib/forms';
import { safeNext } from '@/app/guards';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { errorMessage, http, type TokenResponse } from '@/api/client';
import { useAuth } from '@/lib/auth';
import { AuthLayout } from './auth-layout';

export function RegisterPage() {
  const { applyTokens } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: params.get('email') ?? '', password: '' },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await applyTokens(await http.post<TokenResponse>('/auth/register', values));
      navigate(next ?? '/onboarding', { replace: true });
    } catch (e) {
      toast.error(errorMessage(e));
    }
  });

  return (
    <AuthLayout
      title="Criar conta"
      description="Em seguida você cadastra sua empresa."
      footer={
        <>
          Já tem conta?{' '}
          <Link className="font-medium text-primary hover:underline" to={`/login${next ? `?next=${encodeURIComponent(next)}` : ''}`}>
            Entrar
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={onSubmit} noValidate>
        <Field id="name" label="Seu nome" error={errors.name?.message}>
          <Input id="name" autoComplete="name" aria-invalid={!!errors.name} {...form.register('name')} />
        </Field>
        <Field id="email" label="E-mail" error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" inputMode="email" aria-invalid={!!errors.email} {...form.register('email')} />
        </Field>
        <Field id="password" label="Senha" error={errors.password?.message} hint="Mínimo de 8 caracteres, com letras e números.">
          <Input id="password" type="password" autoComplete="new-password" aria-invalid={!!errors.password} {...form.register('password')} />
        </Field>
        <Button type="submit" className="w-full" loading={isSubmitting}>
          Criar conta
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Seus dados são usados apenas para operar sua conta, conforme a LGPD.
        </p>
      </form>
    </AuthLayout>
  );
}
