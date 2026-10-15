import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { loginSchema, type LoginInput } from '@/lib/forms';
import { safeNext } from '@/app/guards';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { errorMessage, http, type TokenResponse } from '@/api/client';
import { useAuth } from '@/lib/auth';
import { AuthLayout } from './auth-layout';

export function LoginPage() {
  const { applyTokens } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const form = useForm<LoginInput>({ resolver: zodResolver(loginSchema), defaultValues: { email: params.get('email') ?? '', password: '' } });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await applyTokens(await http.post<TokenResponse>('/auth/login', values));
      navigate(next ?? '/app', { replace: true });
    } catch (e) {
      toast.error(errorMessage(e));
    }
  });

  const suffix = next ? `?next=${encodeURIComponent(next)}` : '';
  return (
    <AuthLayout
      title="Entrar"
      description="Acesse a gestão financeira da sua frota."
      footer={
        <>
          Ainda não tem conta?{' '}
          <Link className="font-medium text-primary hover:underline" to={`/register${suffix}`}>
            Criar conta
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={onSubmit} noValidate>
        <Field id="email" label="E-mail" error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" inputMode="email" aria-invalid={!!errors.email} {...form.register('email')} />
        </Field>
        <Field id="password" label="Senha" error={errors.password?.message}>
          <Input id="password" type="password" autoComplete="current-password" aria-invalid={!!errors.password} {...form.register('password')} />
        </Field>
        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-sm text-primary hover:underline">
            Esqueci minha senha
          </Link>
        </div>
        <Button type="submit" className="w-full" loading={isSubmitting}>
          Entrar
        </Button>
      </form>
    </AuthLayout>
  );
}
