import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { endOfMonth, format, parse, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertTriangle, ChevronLeft, ChevronRight, Gauge, Lock, Plus, Receipt } from 'lucide-react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { errorMessage, http } from '@/api/client';
import type { DailyLog, DailyLogList } from '@/api/types';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Fab } from '@/components/ui/fab';
import { Input, NativeSelect } from '@/components/ui/input';
import { Segmented } from '@/components/ui/segmented';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/ui/stat-card';
import { useAuth } from '@/lib/auth';
import { currentMonth, formatMonthBR, shiftMonth } from '@/lib/dates';
import { formatBRL } from '@/lib/money';
import { cn } from '@/lib/utils';
import { FINANCE_KEYS, useVehicles } from '../finance/use-finance';
import { formatPlate } from '../vehicles/vehicles-page';
import { BillingDialog } from './billing-dialog';
import { DailyLogDialog } from './daily-log-dialog';
import { formatKm, formatRate } from './units';

type BilledFilter = 'all' | 'unbilled' | 'billed';

/** "2026-10-15" → "qua, 15/10". */
function dayLabel(date: string): string {
  return format(parseISO(date), 'EEE, dd/MM', { locale: ptBR });
}

/** Valor do dia: vem pronto da API; sem taxa no veículo, avisa. */
function DayAmount({ log }: { log: DailyLog }) {
  if (log.amount !== null) return <span className="font-semibold tabular-nums">{formatBRL(log.amount)}</span>;
  return <span className="text-xs font-medium text-warning">sem valor/km</span>;
}

function BilledBadge({ log }: { log: DailyLog }) {
  return log.billed ? (
    <Badge variant="secondary">
      <Lock className="size-3" aria-hidden /> Faturado
    </Badge>
  ) : (
    <Badge variant="outline">A faturar</Badge>
  );
}

/**
 * Km rodados por dia e por veículo: o registro diário que vira faturamento
 * (km × R$/km do veículo, calculado pela API) e, no fim do mês, contas a receber.
 */
export function KmPage() {
  const { can } = useAuth();
  const showMoney = can('finance:read');
  const canWrite = can('fleet:manage') || can('assignments:own');
  const canBill = can('finance:manage');
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const month = /^\d{4}-\d{2}$/.test(params.get('month') ?? '') ? params.get('month')! : currentMonth();
  const vehicleId = params.get('vehicle') ?? '';
  const billed = (params.get('billed') as BilledFilter) ?? 'all';

  const [form, setForm] = useState<{ open: boolean; editing?: DailyLog }>({ open: false });
  const [billing, setBilling] = useState(false);
  const vehicles = useVehicles();

  function set(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  }

  const query = new URLSearchParams({
    from: `${month}-01`,
    to: format(endOfMonth(parse(month, 'yyyy-MM', new Date())), 'yyyy-MM-dd'),
  });
  if (vehicleId) query.set('vehicleId', vehicleId);
  if (billed !== 'all') query.set('billed', String(billed === 'billed'));

  const list = useQuery({
    queryKey: ['daily-logs', 'list', query.toString()],
    queryFn: () => http.get<DailyLogList>(`/daily-logs?${query}`),
    placeholderData: keepPreviousData,
  });
  const data = list.data;
  const summary = data?.summary;

  /** Registros de km mexem também no faturamento e, ao faturar, nas receitas e no dashboard. */
  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: ['daily-logs'] }), ...FINANCE_KEYS.map((k) => qc.invalidateQueries({ queryKey: [k] }))]);

  // Veículos com dias sem valor por km neste filtro, para levar direto ao cadastro.
  const missingRate = showMoney ? [...new Map((data?.items ?? []).filter((l) => l.ratePerKm === null).map((l) => [l.vehicle.id, l.vehicle])).values()] : [];

  const openNew = () => setForm({ open: true });
  const openLog = (log: DailyLog) => canWrite && log.editable && setForm({ open: true, editing: log });

  return (
    <>
      <PageHeader
        title="Km rodados"
        description="Registre todo dia quantos km cada veículo rodou. O valor sai do valor por km do veículo."
        actions={
          <>
            {canBill && (
              <Button variant="outline" onClick={() => setBilling(true)}>
                <Receipt /> Faturar km do mês
              </Button>
            )}
            {canWrite && (
              <Button className="hidden md:inline-flex" onClick={openNew}>
                <Plus /> Registrar km
              </Button>
            )}
          </>
        }
      />

      <Card className="mb-4 space-y-3 p-3">
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" aria-label="Mês anterior" onClick={() => set('month', shiftMonth(month, -1))}>
            <ChevronLeft />
          </Button>
          <Input type="month" aria-label="Mês" value={month} onChange={(e) => e.target.value && set('month', e.target.value)} className="min-w-0 flex-1 sm:w-44 sm:flex-none" />
          <Button size="icon" variant="ghost" aria-label="Próximo mês" onClick={() => set('month', shiftMonth(month, 1))}>
            <ChevronRight />
          </Button>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <NativeSelect aria-label="Veículo" value={vehicleId} onChange={(e) => set('vehicle', e.target.value)}>
            <option value="">Todos os veículos</option>
            {vehicles.data?.items.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} · {formatPlate(v.plate)}
              </option>
            ))}
          </NativeSelect>
          <Segmented<BilledFilter>
            label="Faturamento"
            value={billed}
            onChange={(v) => set('billed', v === 'all' ? '' : v)}
            options={[
              { value: 'all', label: 'Todos' },
              { value: 'unbilled', label: 'A faturar' },
              { value: 'billed', label: 'Faturados' },
            ]}
          />
        </div>
      </Card>

      <div className={cn('mb-4 grid grid-cols-2 gap-3', showMoney && 'lg:grid-cols-4')}>
        <StatCard label="Dias registrados" value={summary?.days ?? 0} loading={list.isPending} />
        <StatCard label="Km rodados" value={formatKm(summary?.km)} loading={list.isPending} />
        {showMoney && (
          <>
            <StatCard label={`Valor de ${formatMonthBR(month)}`} value={formatBRL(summary?.amount)} tone="positive" loading={list.isPending} />
            <StatCard label="A faturar" value={formatBRL(summary?.unbilledAmount)} hint={canBill ? 'Ainda não virou conta a receber' : undefined} loading={list.isPending} />
          </>
        )}
      </div>

      {showMoney && !!summary?.missingRateDays && (
        <Card className="mb-4 flex items-start gap-3 border-warning/40 bg-warning/5 p-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
          <div className="min-w-0 space-y-1">
            <p>
              <span className="font-medium">{summary.missingRateDays} dia(s) sem valor por km</span> não entram no valor. Defina o valor por km do veículo para calcular.
            </p>
            {missingRate.length > 0 && (
              <p className="flex flex-wrap gap-x-3 gap-y-1">
                {missingRate.map((v) => (
                  <Link key={v.id} to={`/app/vehicles/${v.id}`} className="font-medium text-primary hover:underline">
                    Definir para {v.name}
                  </Link>
                ))}
              </p>
            )}
          </div>
        </Card>
      )}

      {list.isPending ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : list.isError ? (
        <p className="text-sm text-destructive">{errorMessage(list.error)}</p>
      ) : !data?.items.length ? (
        <EmptyState
          icon={Gauge}
          title={`Nenhum km registrado em ${formatMonthBR(month, true)}`}
          description="Registre os km de cada veículo no dia em que ele rodar. No fim do mês, fature tudo de uma vez."
          action={
            canWrite && (
              <Button onClick={openNew}>
                <Plus /> Registrar km
              </Button>
            )
          }
        />
      ) : (
        <Card className={cn('overflow-hidden', list.isFetching && 'opacity-70')}>
          {/* Celular: cartões. Desktop: tabela. */}
          <ul className="divide-y md:hidden">
            {data.items.map((log) => {
              const clickable = canWrite && log.editable;
              return (
                <li key={log.id}>
                  <button
                    type="button"
                    disabled={!clickable}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left enabled:hover:bg-muted/50 disabled:cursor-default"
                    onClick={() => openLog(log)}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        <span className="capitalize">{dayLabel(log.date)}</span> · {log.vehicle.name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {formatKm(log.kmDriven)}
                        {showMoney && log.ratePerKm ? ` · ${formatRate(log.ratePerKm)}` : ''}
                        {log.driver ? ` · ${log.driver.name}` : ''}
                        {log.route ? ` · ${log.route.name}` : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1 text-sm">
                      {showMoney && <DayAmount log={log} />}
                      <BilledBadge log={log} />
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
          <table className="hidden w-full text-sm md:table">
            <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Dia</th>
                <th className="px-4 py-2 font-medium">Veículo</th>
                <th className="px-4 py-2 font-medium">Motorista / rota</th>
                <th className="px-4 py-2 text-right font-medium">Km</th>
                {showMoney && (
                  <>
                    <th className="px-4 py-2 text-right font-medium">R$/km</th>
                    <th className="px-4 py-2 text-right font-medium">Valor</th>
                  </>
                )}
                <th className="px-4 py-2 font-medium">Situação</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.items.map((log) => (
                <tr key={log.id} className={cn(canWrite && log.editable && 'cursor-pointer hover:bg-muted/40')} onClick={() => openLog(log)}>
                  <td className="whitespace-nowrap px-4 py-3 capitalize tabular-nums">{dayLabel(log.date)}</td>
                  <td className="max-w-48 px-4 py-3">
                    <p className="truncate font-medium">{log.vehicle.name}</p>
                    <p className="text-xs tabular-nums text-muted-foreground">{formatPlate(log.vehicle.plate)}</p>
                  </td>
                  <td className="max-w-56 px-4 py-3 text-muted-foreground">
                    <p className="truncate">{log.driver?.name ?? '—'}</p>
                    {log.route && <p className="truncate text-xs">{log.route.name}</p>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                    {formatKm(log.kmDriven)}
                    {log.odometerStart !== null && (
                      <p className="text-xs text-muted-foreground">
                        {log.odometerStart.toLocaleString('pt-BR')} → {log.odometerEnd?.toLocaleString('pt-BR')}
                      </p>
                    )}
                  </td>
                  {showMoney && (
                    <>
                      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-muted-foreground">{formatRate(log.ratePerKm)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <DayAmount log={log} />
                      </td>
                    </>
                  )}
                  <td className="px-4 py-3">
                    <BilledBadge log={log} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {canWrite && <Fab icon={Plus} label="Registrar km" onClick={openNew} />}
      <DailyLogDialog open={form.open} editing={form.editing} defaultVehicleId={vehicleId || undefined} onOpenChange={(open) => setForm((f) => ({ ...f, open }))} onSaved={refresh} />
      {canBill && <BillingDialog open={billing} onOpenChange={setBilling} month={month} onBilled={refresh} />}
    </>
  );
}
