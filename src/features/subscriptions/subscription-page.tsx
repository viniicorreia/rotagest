import { differenceInCalendarDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CreditCard } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { errorMessage } from '@/api/client';
import { formatMoney } from '@/lib/utils';
import { SUBSCRIPTION_STATUS, useSubscription } from './use-subscription';
import { UsageMeter } from './usage-meter';

export function SubscriptionPage() {
  const { data, isPending, isError, error } = useSubscription();

  return (
    <>
      <PageHeader title="Assinatura" description="Plano contratado, limites e uso atual." />
      {isPending ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      ) : isError ? (
        <EmptyState icon={CreditCard} title="Não foi possível carregar a assinatura" description={errorMessage(error)} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-xl">Plano {data.plan.name}</CardTitle>
                <Badge variant={SUBSCRIPTION_STATUS[data.status].variant}>{SUBSCRIPTION_STATUS[data.status].label}</Badge>
              </div>
              {data.plan.description && <CardDescription>{data.plan.description}</CardDescription>}
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <span className="text-2xl font-semibold tabular-nums">{formatMoney(data.plan.price)}</span>
                <span className="text-muted-foreground"> / {data.plan.interval === 'MONTHLY' ? 'mês' : 'ano'}</span>
              </p>
              {data.status === 'TRIALING' && data.trialEndsAt && (
                <p className="text-muted-foreground">
                  Teste gratuito até {format(new Date(data.trialEndsAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })} (
                  {Math.max(0, differenceInCalendarDays(new Date(data.trialEndsAt), new Date()))} dias restantes).
                </p>
              )}
              <p className="text-muted-foreground">
                A cobrança online ainda não está disponível. Para mudar de plano, fale com o suporte RotaGest.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Uso do plano</CardTitle>
              <CardDescription>Usuários incluem convites pendentes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <UsageMeter label="Usuários" used={data.usage.users} limit={data.limits.maxUsers} />
              <UsageMeter label="Veículos" used={data.usage.vehicles} limit={data.limits.maxVehicles} />
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
