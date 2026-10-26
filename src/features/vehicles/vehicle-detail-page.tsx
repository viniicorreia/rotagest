import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Pencil } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { errorMessage, http } from '@/api/client';
import type { VehicleDetail } from '@/api/types';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/ui/stat-card';
import { useAuth } from '@/lib/auth';
import { currentMonth, formatMonthBR } from '@/lib/dates';
import { formatBRL, isNegative } from '@/lib/money';
import { axisTick, CHART, ChartTooltip, compactBRL } from '../finance/charts';
import { formatRate } from '../mileage/units';
import { VehicleFormDialog } from './vehicle-form-dialog';
import { formatPlate, VehicleStatusBadge } from './vehicles-page';

export function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { can } = useAuth();
  const [from, setFrom] = useState(currentMonth(-5));
  const [to, setTo] = useState(currentMonth());
  const [editing, setEditing] = useState(false);
  const vehicle = useQuery({
    queryKey: ['vehicle', id, from, to],
    queryFn: () => http.get<VehicleDetail>(`/vehicles/${id}?from=${from}&to=${to}`),
  });

  if (vehicle.isPending) return <Skeleton className="h-64" />;
  if (vehicle.isError) return <p className="text-sm text-destructive">{errorMessage(vehicle.error)}</p>;
  const v = vehicle.data;
  const fin = v.financial;
  const chart = fin?.months.map((m) => ({
    month: m.month,
    Receita: Number(m.revenue),
    'Custo direto': Number(m.directCost),
    Resultado: Number(m.result),
  }));

  return (
    <>
      <Link to="/app/vehicles" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Veículos
      </Link>
      <PageHeader
        title={v.name}
        description={`${formatPlate(v.plate)}${v.brand || v.model ? ` · ${[v.brand, v.model, v.year].filter(Boolean).join(' ')}` : ''} · ${v.odometerKm.toLocaleString('pt-BR')} km`}
        actions={
          can('fleet:manage') &&
          !v.archivedAt && (
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Pencil /> Editar
            </Button>
          )
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <VehicleStatusBadge vehicle={v} />
        <span className="text-sm text-muted-foreground">
          Valor por km: <span className="font-medium tabular-nums text-foreground">{v.ratePerKm ? formatRate(v.ratePerKm) : 'não definido'}</span>
        </span>
        <Link to={`/app/km?vehicle=${v.id}`} className="text-sm font-medium text-primary hover:underline">
          Ver km rodados
        </Link>
      </div>

      {!fin ? (
        <Card className="p-6 text-sm text-muted-foreground">Você não tem permissão para ver os números financeiros deste veículo.</Card>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-end gap-2">
            <label className="text-sm">
              <span className="mb-1 block text-xs text-muted-foreground">De</span>
              <Input type="month" value={from} max={to} onChange={(e) => e.target.value && setFrom(e.target.value)} className="w-40" />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs text-muted-foreground">Até</span>
              <Input type="month" value={to} min={from} onChange={(e) => e.target.value && setTo(e.target.value)} className="w-40" />
            </label>
            <p className="pb-2 text-xs text-muted-foreground">Regime de competência</p>
          </div>
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Receita" value={formatBRL(fin.revenue)} tone="positive" />
            <StatCard label="Custos diretos" value={formatBRL(fin.directCost)} />
            <StatCard label="Custos rateados" value={formatBRL(fin.sharedCost)} hint="Rateio chega na próxima fase" />
            <StatCard label="Resultado" value={formatBRL(fin.result)} tone={isNegative(fin.result) ? 'negative' : 'positive'} />
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Resultado mês a mês</CardTitle>
              <CardDescription>Receitas e custos pela competência do lançamento.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chart} margin={{ left: -12, right: 8 }}>
                    <CartesianGrid vertical={false} stroke={CHART.grid} />
                    <XAxis dataKey="month" tick={axisTick} tickFormatter={(m: string) => formatMonthBR(m)} axisLine={false} tickLine={false} />
                    <YAxis tick={axisTick} tickFormatter={compactBRL} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip labelFormatter={(m) => formatMonthBR(m, true)} />} cursor={{ fill: 'var(--muted)' }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="Receita" fill={CHART.in} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Custo direto" fill={CHART.out} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Resultado" fill={CHART.palette[1]} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </>
      )}
      <VehicleFormDialog open={editing} onOpenChange={setEditing} editing={v} />
    </>
  );
}
