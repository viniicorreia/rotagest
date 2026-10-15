import { useQuery } from '@tanstack/react-query';
import { Building2, CreditCard, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDocument } from '@/lib/forms';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { http } from '@/api/client';
import { useAuth } from '@/lib/auth';
import type { Company } from '@/api/types';
import { useMembers } from '../team/use-team';
import { SUBSCRIPTION_STATUS, useSubscription } from '../subscriptions/use-subscription';
import { UsageMeter } from '../subscriptions/usage-meter';

function useCompany() {
  return useQuery({ queryKey: ['company'], queryFn: () => http.get<Company & { myRoleLabel: string }>('/companies/current') });
}

/** Início para quem não vê o financeiro (motorista, mecânico...): dados da empresa, equipe e plano. */
export function OverviewCards() {
  const { me, can } = useAuth();
  const company = useCompany();
  const members = useMembers(can('members:read'));
  const subscription = useSubscription(can('subscription:read'));
  const firstName = me?.user.name.split(' ')[0];

  return (
    <>
      <PageHeader title={`Olá, ${firstName}`} description={me?.activeCompany?.tradeName} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2 md:pb-2">
            <CardDescription>Empresa</CardDescription>
            <Building2 className="size-4 text-muted-foreground" aria-hidden />
          </CardHeader>
          <CardContent>
            {company.isPending ? (
              <Skeleton className="h-12" />
            ) : company.data ? (
              <div className="space-y-1">
                <p className="truncate text-lg font-semibold">{company.data.tradeName}</p>
                <p className="text-sm text-muted-foreground tabular-nums">{formatDocument(company.data.document)}</p>
                <Badge variant="outline">Você: {company.data.myRoleLabel}</Badge>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {can('members:read') && (
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2 md:pb-2">
              <CardDescription>Equipe</CardDescription>
              <Users className="size-4 text-muted-foreground" aria-hidden />
            </CardHeader>
            <CardContent>
              {members.isPending ? (
                <Skeleton className="h-12" />
              ) : (
                <div className="space-y-1">
                  <p className="text-3xl font-semibold tabular-nums">{members.data?.filter((m) => m.status === 'ACTIVE').length ?? 0}</p>
                  <Link to="/app/team" className="text-sm text-primary hover:underline">
                    Gerenciar equipe
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {can('subscription:read') && (
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2 md:pb-2">
              <CardDescription>Plano</CardDescription>
              <CreditCard className="size-4 text-muted-foreground" aria-hidden />
            </CardHeader>
            <CardContent>
              {subscription.isPending ? (
                <Skeleton className="h-12" />
              ) : subscription.data ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-semibold">{subscription.data.plan.name}</p>
                    <Badge variant={SUBSCRIPTION_STATUS[subscription.data.status].variant}>
                      {SUBSCRIPTION_STATUS[subscription.data.status].label}
                    </Badge>
                  </div>
                  <UsageMeter label="Usuários" used={subscription.data.usage.users} limit={subscription.data.limits.maxUsers} />
                </div>
              ) : null}
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
