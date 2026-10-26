import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Download, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { errorMessage, http, saveBlob } from '@/api/client';
import type { DeleteAccountRequest } from '@/api/types';
import { Brand } from '@/components/layout/brand';
import { PageHeader } from '@/components/layout/page-header';
import { UserMenu } from '@/components/layout/user-menu';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth';
import { deleteAccountFailure, deleteAccountSchema, type DeleteAccountForm } from './account-logic';

/** Minha conta dentro do app (com empresa ativa). */
export function AccountPage() {
  return (
    <>
      <PageHeader title="Minha conta" description="Seus dados pessoais e seus direitos pela LGPD." />
      <AccountContent />
    </>
  );
}

/** Minha conta fora do app: quem não tem empresa (ou o admin da plataforma) também acessa. */
export function StandaloneAccountPage() {
  const { me } = useAuth();
  const back = me?.activeCompany ? '/app' : me?.user.platformRole === 'SUPER_ADMIN' ? '/platform' : '/onboarding';
  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-6 px-4 py-8">
      <div className="flex items-center justify-between gap-3">
        <Brand />
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost">
            <Link to={back}>
              <ArrowLeft /> Voltar
            </Link>
          </Button>
          <UserMenu />
        </div>
      </div>
      <PageHeader title="Minha conta" description="Seus dados pessoais e seus direitos pela LGPD." />
      <AccountContent />
    </div>
  );
}

function AccountContent() {
  const { me } = useAuth();
  const [exporting, setExporting] = useState(false);

  async function exportData() {
    setExporting(true);
    try {
      const { blob, fileName } = await http.download('/me/data-export');
      saveBlob(blob, fileName === 'arquivo' ? 'meus-dados-rotagest.json' : fileName);
      toast.success('Arquivo com seus dados baixado');
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Seus dados</CardTitle>
          <CardDescription>Dados do seu usuário, válidos em todas as empresas em que você participa.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Nome</dt>
              <dd className="min-w-0 break-words text-right font-medium">{me?.user.name}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">E-mail</dt>
              <dd className="min-w-0 break-all text-right font-medium">{me?.user.email}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Baixar meus dados</CardTitle>
          <CardDescription>
            Um arquivo JSON com seu cadastro, vínculos com empresas, sessões (aparelhos e IPs), convites e as ações registradas em seu nome.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" loading={exporting} onClick={exportData}>
            <Download /> Baixar meus dados
          </Button>
          <p className="text-sm text-muted-foreground">
            Saiba como tratamos seus dados na{' '}
            <Link to="/privacidade" className="font-medium text-primary hover:underline">
              Política de Privacidade
            </Link>
            .
          </p>
        </CardContent>
      </Card>

      <DeleteAccountCard />
    </div>
  );
}

function DeleteAccountCard() {
  const { clearSession } = useAuth();
  const navigate = useNavigate();
  const form = useForm<DeleteAccountForm, unknown, DeleteAccountRequest>({
    resolver: zodResolver(deleteAccountSchema),
    defaultValues: { password: '', confirm: false },
  });
  const { errors, isSubmitting } = form.formState;

  async function remove(values: DeleteAccountRequest) {
    try {
      await http.post('/me/delete', values);
    } catch (e) {
      const failure = deleteAccountFailure(e);
      if (failure) form.setError(failure.field, { message: failure.message });
      else toast.error(errorMessage(e));
      return;
    }
    // Mesmo efeito do "Sair": a API já encerrou as sessões desta conta.
    clearSession();
    navigate('/login', { replace: true });
    toast.success('Sua conta foi excluída. Obrigado por usar o RotaGest.');
  }

  return (
    <Card className="border-destructive/50 lg:col-span-2">
      <CardHeader>
        <CardTitle className="text-destructive">Excluir minha conta</CardTitle>
        <CardDescription>Esta ação é definitiva e não pode ser desfeita.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="mb-5 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Seu nome e e-mail são anonimizados e você perde o acesso a todas as empresas.</li>
          <li>
            Os registros financeiros e o histórico que você lançou continuam com a empresa, que é a dona desses dados e precisa guardá-los por obrigação legal.
          </li>
          <li>Se você é proprietário de uma empresa ativa, passe a propriedade a outro membro ou peça o cancelamento antes.</li>
        </ul>
        <form className="max-w-md space-y-4" onSubmit={form.handleSubmit(remove)} noValidate>
          {errors.root?.message && (
            <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errors.root.message}
            </p>
          )}
          <Field id="delete-password" label="Senha atual" error={errors.password?.message}>
            <Input id="delete-password" type="password" autoComplete="current-password" aria-invalid={!!errors.password} {...form.register('password')} />
          </Field>
          <div className="space-y-1.5">
            <label className="flex cursor-pointer items-start gap-3 text-sm">
              <input type="checkbox" className="mt-0.5 size-4 shrink-0 accent-[var(--destructive)]" aria-invalid={!!errors.confirm} {...form.register('confirm')} />
              Entendo que minha conta será excluída definitivamente.
            </label>
            {errors.confirm?.message && (
              <p role="alert" className="text-sm text-destructive">
                {errors.confirm.message}
              </p>
            )}
          </div>
          <Button type="submit" variant="destructive" loading={isSubmitting}>
            <Trash2 /> Excluir minha conta
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
