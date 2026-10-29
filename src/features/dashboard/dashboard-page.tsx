import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowDownCircle, ArrowUpCircle, Bus, CalendarClock, Wallet } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { errorMessage, http } from '@/api/client';
import type { Dashboard } from '@/api/types';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { NativeSelect } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/ui/stat-card';
import { useAuth } from '@/lib/auth';
import { currentMonth, formatMonthBR, shiftMonth } from '@/lib/dates';
import { formatBRL, isNegative } from '@/lib/money';
import { cn } from '@/lib/utils';
import { axisTick, CHART, ChartTooltip, compactBRL } from '../finance/charts';
import { useCategories, useVehicles } from '../finance/use-finance';
import { FirstStepsCard } from '../onboarding/first-steps-card';
import { OverviewCards } from './overview-cards';

type Period = 'month' | 'last' | '3m' | '6m' | 'year';
const PERIODS: { value: Period; label: string }[] = [
  { value: 'month', label: 'Este mês' },
  { value: 'last', label: 'Mês passado' },
  { value: '3m', label: 'Últimos 3 meses' },
  { value: '6m', label: 'Últimos 6 meses' },
  { value: 'year', label: 'Este ano' },
];

function range(p: Period): { from: string; to: string } {
  const now = currentMonth();
  switch (p) {
    case 'month':
      return { from: now, to: now };
    case 'last':
      return { from: shiftMonth(now, -1), to: shiftMonth(now, -1) };
    case '3m':
      return { from: shiftMonth(now, -2), to: now };
    case '6m':
      return { from: shiftMonth(now, -5), to: now };
    case 'year':
      return { from: `${now.slice(0, 4)}-01`, to: now };
  }
}

function useDashboard(from: string, to: string, vehicleId: string, categoryId: string) {
  const q = new URLSearchParams({ from, to });
  if (vehicleId) q.set('vehicleId', vehicleId);
  if (categoryId) q.set('categoryId', categoryId);
  return useQuery({ queryKey: ['dashboard', q.toString()], queryFn: () => http.get<Dashboard>(`/dashboard?${q}`), placeholderData: keepPreviousData });
}

export function DashboardPage() {
  const { can, me } = useAuth();
  if (!can('finance:read')) return <OverviewCards />;
  return <FinancialDashboard firstName={me?.user.name.split(' ')[0]} />;
}

function FinancialDashboard({ firstName }: { firstName?: string }) {
  const { can } = useAuth();
  const [period, setPeriod] = useState<Period>('month');
  const [vehicleId, setVehicleId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const { from, to } = range(period);
  const main = useDashboard(from, to, vehicleId, categoryId);
  // Tendência: sempre os 6 meses que terminam no fim do período escolhido.
  const trend = useDashboard(shiftMonth(to, -5), to, vehicleId, categoryId);
  const vehicles = useVehicles(false, can('fleet:read'));
  const categories = useCategories('EXPENSE');

  const d = main.data;
  const loading = main.isPending;
  const filtered = !!vehicleId || !!categoryId;
  const monthly = trend.data?.monthly.map((m) => ({
    month: m.month,
    Recebido: Number(m.cashIn),
    Pago: Number(m.cashOut),
    Receita: Number(m.revenue),
    Despesa: Number(m.expense),
  }));
  const byCategory = d?.expensesByCategory.filter((c) => Number(c.amount) > 0).map((c) => ({ name: c.name, value: Number(c.amount) })) ?? [];
  const results = d?.vehicles.results ?? [];

  return (
    <>
      <PageHeader title={`Olá, ${firstName ?? ''}`.trim()} description="Resumo financeiro da empresa." />
      <FirstStepsCard />

      <Card className="mb-4 grid gap-2 p-3 sm:grid-cols-3">
        <NativeSelect aria-label="Período" value={period} onChange={(e) => setPeriod(e.target.value as Period)}>
          {PERIODS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect aria-label="Veículo" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
          <option value="">Todos os veículos</option>
          {vehicles.data?.items.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect aria-label="Categoria de despesa" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">Todas as categorias</option>
          {categories.data?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </NativeSelect>
      </Card>

      {main.isError && <p className="mb-4 text-sm text-destructive">{errorMessage(main.error)}</p>}

      <section aria-label="Caixa" className="mb-2">
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">
          Dinheiro que entrou e saiu (regime de caixa) · {from === to ? formatMonthBR(from, true) : `${formatMonthBR(from)} a ${formatMonthBR(to)}`}
        </h2>
        <div className={cn('grid grid-cols-2 gap-3 lg:grid-cols-4', main.isFetching && !loading && 'opacity-70')}>
          <StatCard label="Saldo em contas" icon={Wallet} value={formatBRL(d?.balances.total)} tone={d && isNegative(d.balances.total) ? 'negative' : 'default'} hint="Hoje, todas as contas" loading={loading} />
          <StatCard label="Recebido" icon={ArrowDownCircle} value={formatBRL(d?.cash.received)} tone="positive" loading={loading} />
          <StatCard label="Pago" icon={ArrowUpCircle} value={formatBRL(d?.cash.paid)} tone="negative" loading={loading} />
          <StatCard label="Saldo do período" value={formatBRL(d?.cash.result)} tone={d && isNegative(d.cash.result) ? 'negative' : 'positive'} hint="Recebido − pago" loading={loading} />
        </div>
      </section>

      <section aria-label="Competência" className="mb-4 mt-4">
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">Resultado do período (regime de competência)</h2>
        <div className={cn('grid grid-cols-2 gap-3 lg:grid-cols-4', main.isFetching && !loading && 'opacity-70')}>
          <StatCard label="Receitas" value={formatBRL(d?.accrual.revenue)} loading={loading} />
          <StatCard label="Despesas" value={formatBRL(d?.accrual.expense)} loading={loading} />
          <StatCard label="Lucro / prejuízo" value={formatBRL(d?.accrual.result)} tone={d && isNegative(d.accrual.result) ? 'negative' : 'positive'} loading={loading} />
          <StatCard label="Custo médio por veículo" icon={Bus} value={formatBRL(d?.vehicles.costPerVehicle)} hint={d ? `${d.vehicles.active} veículo(s) ativo(s)` : undefined} loading={loading} />
        </div>
      </section>

      <div className="mb-4 grid gap-3 lg:grid-cols-2">
        <ObligationsCard title="A pagar" to="/app/expenses" data={d?.payables} loading={loading} />
        <ObligationsCard title="A receber" to="/app/revenues" data={d?.receivables} loading={loading} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Entradas e saídas</CardTitle>
            <CardDescription>Pagamentos e recebimentos dos últimos 6 meses.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {trend.isPending ? (
                <Skeleton className="h-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthly} margin={{ left: -12, right: 8 }}>
                    <CartesianGrid vertical={false} stroke={CHART.grid} />
                    <XAxis dataKey="month" tick={axisTick} tickFormatter={(m: string) => formatMonthBR(m)} axisLine={false} tickLine={false} />
                    <YAxis tick={axisTick} tickFormatter={compactBRL} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip labelFormatter={(m) => formatMonthBR(m, true)} />} cursor={{ fill: 'var(--muted)' }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="Recebido" fill={CHART.in} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Pago" fill={CHART.out} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Receitas x despesas</CardTitle>
            <CardDescription>Pela competência dos lançamentos, últimos 6 meses.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {trend.isPending ? (
                <Skeleton className="h-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthly} margin={{ left: -12, right: 8 }}>
                    <CartesianGrid vertical={false} stroke={CHART.grid} />
                    <XAxis dataKey="month" tick={axisTick} tickFormatter={(m: string) => formatMonthBR(m)} axisLine={false} tickLine={false} />
                    <YAxis tick={axisTick} tickFormatter={compactBRL} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip labelFormatter={(m) => formatMonthBR(m, true)} />} cursor={{ fill: 'var(--muted)' }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="Receita" fill={CHART.palette[1]} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Despesa" fill={CHART.warning} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Despesas por categoria</CardTitle>
            <CardDescription>Competência do período escolhido.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-64" />
            ) : !byCategory.length ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Nenhuma despesa no período.</p>
            ) : (
              <div className="grid items-center gap-4 sm:grid-cols-2">
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={byCategory} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="90%" paddingAngle={2} stroke="none">
                        {byCategory.map((c, i) => (
                          <Cell key={c.name} fill={CHART.palette[i % CHART.palette.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="space-y-1.5 text-sm">
                  {byCategory.slice(0, 7).map((c, i) => (
                    <li key={c.name} className="flex items-center gap-2">
                      <span className="size-2.5 shrink-0 rounded-full" style={{ background: CHART.palette[i % CHART.palette.length] }} />
                      <span className="min-w-0 flex-1 truncate">{c.name}</span>
                      <span className="tabular-nums text-muted-foreground">{formatBRL(String(c.value))}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resultado por veículo</CardTitle>
            <CardDescription>Receitas menos custos atribuídos a cada veículo no período.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-64" />
            ) : !results.length ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Sem lançamentos por veículo no período.</p>
            ) : (
              <ul className="divide-y">
                {results.map((r) => (
                  <li key={r.vehicleId ?? 'none'} className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      {r.vehicleId ? (
                        <Link to={`/app/vehicles/${r.vehicleId}`} className="block truncate text-sm font-medium hover:underline">
                          {r.name}
                        </Link>
                      ) : (
                        <p className="truncate text-sm font-medium text-muted-foreground">{r.name}</p>
                      )}
                      <p className="text-xs tabular-nums text-muted-foreground">
                        receita {formatBRL(r.revenue)} · custo {formatBRL(r.cost)}
                      </p>
                    </div>
                    <span className={cn('text-sm font-semibold tabular-nums', isNegative(r.result) ? 'text-destructive' : 'text-primary')}>{formatBRL(r.result)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
      {filtered && <p className="mt-4 text-xs text-muted-foreground">Com filtro de veículo, valores pagos/recebidos são proporcionais à parte atribuída ao veículo.</p>}
    </>
  );
}

function ObligationsCard({ title, to, data, loading }: { title: string; to: string; data?: Dashboard['payables']; loading: boolean }) {
  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">{title}</h2>
        <Link to={to} className="text-sm text-primary hover:underline">
          Ver todas
        </Link>
      </div>
      {loading || !data ? (
        <Skeleton className="h-14" />
      ) : (
        <div className="grid grid-cols-3 gap-2 text-sm">
          <Link to={`${to}?status=OVERDUE`} className="rounded-lg p-2 hover:bg-muted">
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <AlertTriangle className="size-3.5" aria-hidden /> Vencido
            </p>
            <p className={cn('font-semibold tabular-nums', data.overdueCount > 0 && 'text-destructive')}>{formatBRL(data.overdue)}</p>
            <p className="text-xs text-muted-foreground">{data.overdueCount} lanç.</p>
          </Link>
          <div className="rounded-lg p-2">
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarClock className="size-3.5" aria-hidden /> Próx. 7 dias
            </p>
            <p className={cn('font-semibold tabular-nums', data.dueSoonCount > 0 && 'text-warning')}>{formatBRL(data.dueSoon)}</p>
            <p className="text-xs text-muted-foreground">{data.dueSoonCount} lanç.</p>
          </div>
          <Link to={to} className="rounded-lg p-2 hover:bg-muted">
            <p className="text-xs text-muted-foreground">Em aberto</p>
            <p className="font-semibold tabular-nums">{formatBRL(data.open)}</p>
            <p className="text-xs text-muted-foreground">{data.openCount} lanç.</p>
          </Link>
        </div>
      )}
    </Card>
  );
}
