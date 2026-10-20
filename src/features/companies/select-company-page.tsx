import { Building2, ChevronRight, Plus } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Brand } from '@/components/layout/brand';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { errorMessage } from '@/api/client';
import { useAuth } from '@/lib/auth';

/** Exibido quando o usuário tem empresas, mas nenhuma ativa na sessão. */
export function SelectCompanyPage() {
  const { me, switchCompany, logout } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState<string | null>(null);

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-4 py-8">
      <Brand className="self-center" />
      <Card>
        <CardHeader>
          <CardTitle>Escolha a empresa</CardTitle>
          <CardDescription>Escolha com qual empresa você quer trabalhar agora.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {me?.companies.map((c) => (
            <button
              key={c.id}
              disabled={c.status !== 'ACTIVE' || busy !== null}
              onClick={async () => {
                setBusy(c.id);
                try {
                  await switchCompany(c.id);
                  navigate('/app/dashboard');
                } catch (e) {
                  toast.error(errorMessage(e));
                } finally {
                  setBusy(null);
                }
              }}
              className="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted disabled:opacity-50"
            >
              <Building2 className="size-5 text-muted-foreground" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{c.tradeName}</span>
                <span className="text-xs text-muted-foreground">{c.status === 'ACTIVE' ? c.roleLabel : 'Suspensa'}</span>
              </span>
              <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
            </button>
          ))}
          <Button variant="outline" className="mt-2 w-full" onClick={() => navigate('/onboarding')}>
            <Plus /> Cadastrar nova empresa
          </Button>
        </CardContent>
      </Card>
      <Button variant="ghost" onClick={() => logout()}>
        Sair
      </Button>
    </div>
  );
}
