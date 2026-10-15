import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertTriangle, MailOpen } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { AuthLayout } from '@/features/auth/auth-layout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { errorMessage, http, type TokenResponse } from '@/api/client';
import { useAuth } from '@/lib/auth';

interface InvitationPreview {
  companyName: string;
  email: string;
  roleLabel: string;
  invitedBy: string;
  status: 'PENDING' | 'EXPIRED' | 'ACCEPTED' | 'REVOKED';
  expiresAt: string;
}

export function InvitePage() {
  const { token = '' } = useParams();
  const { status, me, applyTokens, logout } = useAuth();
  const navigate = useNavigate();
  const [accepting, setAccepting] = useState(false);
  const preview = useQuery({
    queryKey: ['invitation-preview', token],
    queryFn: () => http.get<InvitationPreview>(`/invitations/token/${encodeURIComponent(token)}`),
    retry: false,
  });

  if (preview.isPending || status === 'loading') {
    return (
      <AuthLayout title="Convite">
        <div className="space-y-3">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-11 w-full" />
        </div>
      </AuthLayout>
    );
  }

  if (preview.isError) {
    return (
      <AuthLayout title="Convite indisponível" description={errorMessage(preview.error)}>
        <Button asChild className="w-full">
          <Link to="/login">Ir para o login</Link>
        </Button>
      </AuthLayout>
    );
  }

  const inv = preview.data;
  const next = `/invite/${encodeURIComponent(token)}`;
  const wrongAccount = status === 'authenticated' && me && me.user.email !== inv.email;

  async function accept() {
    setAccepting(true);
    try {
      await applyTokens(await http.post<TokenResponse>(`/invitations/token/${encodeURIComponent(token)}/accept`));
      toast.success(`Bem-vindo(a) à ${inv.companyName}!`);
      navigate('/app/dashboard', { replace: true });
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setAccepting(false);
    }
  }

  return (
    <AuthLayout
      title={`Convite para ${inv.companyName}`}
      description={`${inv.invitedBy} convidou ${inv.email} para participar como ${inv.roleLabel}.`}
    >
      {inv.status !== 'PENDING' ? (
        <div className="flex items-start gap-3 rounded-lg bg-muted p-3 text-sm" role="status">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
          {inv.status === 'EXPIRED' ? 'Este convite expirou. Peça um novo link a quem convidou você.' : 'Este convite já foi utilizado.'}
        </div>
      ) : status === 'anonymous' ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Entre ou crie sua conta com o e-mail {inv.email} para aceitar.</p>
          <Button asChild className="w-full">
            <Link to={`/register?email=${encodeURIComponent(inv.email)}&next=${encodeURIComponent(next)}`}>Criar conta</Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link to={`/login?email=${encodeURIComponent(inv.email)}&next=${encodeURIComponent(next)}`}>Já tenho conta</Link>
          </Button>
        </div>
      ) : wrongAccount ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Você está conectado como <strong>{me.user.email}</strong>, mas o convite é para <strong>{inv.email}</strong>.
          </p>
          <Button className="w-full" variant="outline" onClick={() => logout()}>
            Sair e entrar com outra conta
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <MailOpen className="size-4" aria-hidden /> Válido até {format(new Date(inv.expiresAt), "dd 'de' MMMM", { locale: ptBR })}
          </p>
          <Button className="w-full" onClick={accept} loading={accepting}>
            Aceitar convite
          </Button>
        </div>
      )}
    </AuthLayout>
  );
}
