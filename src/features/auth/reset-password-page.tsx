import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import { passwordSchema } from '@/lib/forms';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { errorMessage, http } from '@/api/client';
import { AuthLayout } from './auth-layout';

const schema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'As senhas não conferem' });

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') ?? '';
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { password: '', confirm: '' } });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async ({ password }) => {
    try {
      await http.post('/auth/reset-password', { token, password });
      toast.success('Senha alterada. Entre com a nova senha.');
      navigate('/login', { replace: true });
    } catch (e) {
      toast.error(errorMessage(e));
    }
  });

  if (!token) {
    return (
      <AuthLayout title="Link inválido" description="Este link de redefinição está incompleto.">
        <Button asChild className="w-full">
          <Link to="/forgot-password">Solicitar novo link</Link>
        </Button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Nova senha" description="Por segurança, todas as sessões abertas serão encerradas.">
      <form className="space-y-4" onSubmit={onSubmit} noValidate>
        <Field id="password" label="Nova senha" error={errors.password?.message} hint="Mínimo de 8 caracteres, com letras e números.">
          <Input id="password" type="password" autoComplete="new-password" aria-invalid={!!errors.password} {...form.register('password')} />
        </Field>
        <Field id="confirm" label="Confirmar senha" error={errors.confirm?.message}>
          <Input id="confirm" type="password" autoComplete="new-password" aria-invalid={!!errors.confirm} {...form.register('confirm')} />
        </Field>
        <Button type="submit" className="w-full" loading={isSubmitting}>
          Salvar nova senha
        </Button>
      </form>
    </AuthLayout>
  );
}
