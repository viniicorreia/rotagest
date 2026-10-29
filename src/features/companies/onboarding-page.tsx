import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { type CompanyInput } from '@/lib/forms';
import { Brand } from '@/components/layout/brand';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { errorMessage, http, type TokenResponse } from '@/api/client';
import { useAuth } from '@/lib/auth';
import type { Company } from '@/api/types';
import { CompanyForm } from './company-form';

export function OnboardingPage() {
  const { me, applyTokens, logout } = useAuth();
  const navigate = useNavigate();

  async function create(values: CompanyInput) {
    try {
      const res = await http.post<TokenResponse & { company: Company }>('/companies', values);
      await applyTokens(res);
      toast.success(`${res.company.tradeName} criada. Seu teste gratuito começou!`);
      // Empresa nova começa pelo passo a passo dos cadastros básicos.
      navigate('/app/first-steps', { replace: true });
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <Brand />
        {me?.companies.length ? (
          <Button variant="ghost" onClick={() => navigate('/app')}>
            Voltar
          </Button>
        ) : (
          <Button variant="ghost" onClick={() => logout()}>
            Sair
          </Button>
        )}
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Cadastre sua empresa</CardTitle>
          <CardDescription>
            {me ? `Olá, ${me.user.name.split(' ')[0]}! ` : ''}Você será o proprietário e poderá convidar sua equipe depois. O plano Starter
            começa com período de teste gratuito.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CompanyForm submitLabel="Criar empresa" onSubmit={create} />
        </CardContent>
      </Card>
    </div>
  );
}
