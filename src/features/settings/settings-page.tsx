import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LogOut, Moon, Shield, Sun } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { type CompanyInput } from '@/lib/forms';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { errorMessage, http } from '@/api/client';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import type { Company } from '@/api/types';
import { CompanyForm } from '../companies/company-form';
import { SupportAccessCard } from '../support/support-access-card';
import { CategoriesCard } from './categories-card';

export function SettingsPage() {
  const { can, me, logout } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const [confirmLogoutAll, setConfirmLogoutAll] = useState(false);
  const company = useQuery({ queryKey: ['company'], queryFn: () => http.get<Company>('/companies/current') });
  const canEdit = can('company:update');

  async function save(values: CompanyInput) {
    try {
      await http.patch<Company>('/companies/current', values);
      await Promise.all([qc.invalidateQueries({ queryKey: ['company'] }), qc.invalidateQueries({ queryKey: ['me'] })]);
      toast.success('Dados da empresa atualizados');
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <>
      <PageHeader title="Configurações" />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="min-w-0 lg:col-span-2">
          <CardHeader>
            <CardTitle>Dados da empresa</CardTitle>
            <CardDescription>{canEdit ? 'Usados em relatórios e documentos.' : 'Somente o proprietário pode alterar estes dados.'}</CardDescription>
          </CardHeader>
          <CardContent>
            {company.isPending ? (
              <Skeleton className="h-80" />
            ) : company.data ? (
              <CompanyForm key={company.data.id + company.dataUpdatedAt} initial={company.data} submitLabel="Salvar alterações" readOnly={!canEdit} onSubmit={save} />
            ) : (
              <p className="text-sm text-destructive">{errorMessage(company.error)}</p>
            )}
          </CardContent>
        </Card>

        <div className="min-w-0 space-y-6 lg:row-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Sua conta</CardTitle>
              <CardDescription>
                {me?.user.name} · {me?.user.email}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start" onClick={toggle}>
                {theme === 'dark' ? <Sun /> : <Moon />} Usar tema {theme === 'dark' ? 'claro' : 'escuro'}
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => setConfirmLogoutAll(true)}>
                <LogOut /> Sair de todos os dispositivos
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link to="/app/account">
                  <Shield /> Privacidade e dados
                </Link>
              </Button>
            </CardContent>
          </Card>
          {can('support:grant') && <SupportAccessCard />}
        </div>
        {can('finance:read') && (
          <div className="lg:col-span-2">
            <CategoriesCard />
          </div>
        )}
      </div>
      <ConfirmDialog
        open={confirmLogoutAll}
        onOpenChange={setConfirmLogoutAll}
        title="Sair de todos os dispositivos?"
        description="Todas as sessões abertas, inclusive esta, serão encerradas."
        confirmLabel="Sair de todos"
        onConfirm={async () => {
          try {
            await http.post('/auth/logout-all');
          } finally {
            await logout();
            navigate('/login');
          }
        }}
      />
    </>
  );
}
