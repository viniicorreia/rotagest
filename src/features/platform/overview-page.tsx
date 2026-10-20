import { AlertTriangle, Building2, Bus, ChevronRight, CircleDollarSign, Clock, Info, Sparkles, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/ui/stat-card';
import { formatBRL } from '@/lib/money';
import { companyStatusLabel, subscriptionStatusLabel } from './labels';
import { ErrorState } from './platform-ui';
import { usePlatformOverview } from './use-platform';

/** Visão geral do SaaS: só dados cadastrais e de uso, nunca o financeiro das empresas. */
export function PlatformOverviewPage() {
  const overview = usePlatformOverview();
  const data = overview.data;
  const loading = overview.isPending;

  return (
    <>
      <PageHeader title="Visão geral" description="Empresas, assinaturas e uso da plataforma." />

      {overview.isError ? (
        <ErrorState error={overview.error} onRetry={() => overview.refetch()} />
      ) : (
        <>
          {data && !data.billing.configured && <BillingNotice />}

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label="Empresas"
              icon={Building2}
              value={data?.companies}
              loading={loading}
              hint={data?.companiesByStatus.map((s) => `${s.count} ${companyStatusLabel(s.status).toLowerCase()}`).join(' · ') || undefined}
            />
            <StatCard label="MRR contratado" icon={CircleDollarSign} value={formatBRL(data?.mrr)} loading={loading} hint="Assinaturas ativas" />
            <StatCard label="Novas em 30 dias" icon={Sparkles} value={data?.newCompanies30d} loading={loading} />
            <LinkStat to="/platform/subscriptions?trialEnding=true">
              <StatCard label="Testes terminando em 7 dias" icon={Clock} value={data?.trialsEnding7d} loading={loading} hint="Ver assinaturas" tone={data?.trialsEnding7d ? 'warning' : 'default'} />
            </LinkStat>
            <LinkStat to="/platform/subscriptions?status=PAST_DUE">
              <StatCard label="Em atraso" icon={AlertTriangle} value={data?.pastDue} loading={loading} hint="Ver assinaturas" tone={data?.pastDue ? 'negative' : 'default'} />
            </LinkStat>
            <StatCard label="Veículos ativos" icon={Bus} value={data?.vehicles} loading={loading} />
            <StatCard label="Membros ativos" icon={Users} value={data?.members} loading={loading} />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <CountList
              title="Assinaturas por status"
              loading={loading}
              rows={data?.subscriptionsByStatus.map((s) => ({ key: s.status, label: subscriptionStatusLabel(s.status), count: s.count, to: `/platform/subscriptions?status=${s.status}` }))}
            />
            <CountList
              title="Assinaturas por plano"
              loading={loading}
              rows={data?.subscriptionsByPlan.map((p) => ({ key: p.planId, label: p.name, count: p.count, to: `/platform/subscriptions?planId=${p.planId}` }))}
              hint="Exceto canceladas"
            />
          </div>

          <p className="mt-6 flex items-start gap-2 text-xs text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            Este painel mostra apenas dados cadastrais e de uso das empresas. Os dados financeiros de cada empresa (receitas, despesas, contas) nunca são exibidos aqui.
          </p>
        </>
      )}
    </>
  );
}

function BillingNotice() {
  return (
    <Card className="mb-4 border-warning/40 bg-warning/5 p-4">
      <div className="flex items-start gap-3">
        <Info className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden />
        <div className="space-y-1 text-sm">
          <p className="font-medium">Cobrança automática não está integrada</p>
          <p className="text-muted-foreground">
            Nenhum gateway de pagamento está configurado. Os planos são ativados administrativamente e nada é cobrado das empresas por aqui.
          </p>
        </div>
      </div>
    </Card>
  );
}

function LinkStat({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="block rounded-xl transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {children}
    </Link>
  );
}

interface CountRow {
  key: string;
  label: string;
  count: number;
  to: string;
}

/** Lista com barra proporcional; a barra é só visual (largura relativa ao maior valor recebido). */
function CountList({ title, rows, loading, hint }: { title: string; rows?: CountRow[]; loading: boolean; hint?: string }) {
  const max = Math.max(1, ...(rows ?? []).map((r) => r.count));
  return (
    <Card>
      <CardHeader className="pb-2 md:pb-2">
        <CardTitle>{title}</CardTitle>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-8" />
            ))}
          </div>
        ) : !rows?.length ? (
          <p className="text-sm text-muted-foreground">Nenhuma assinatura ainda.</p>
        ) : (
          <ul className="space-y-1">
            {rows.map((r) => (
              <li key={r.key}>
                <Link to={r.to} className="group block rounded-lg px-2 py-1.5 hover:bg-muted">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate">{r.label}</span>
                    <span className="flex items-center gap-1 font-medium tabular-nums">
                      {r.count}
                      <ChevronRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary/70" style={{ width: `${(r.count / max) * 100}%` }} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
