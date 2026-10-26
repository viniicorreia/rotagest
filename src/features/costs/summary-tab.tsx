import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Gauge } from 'lucide-react';
import { errorMessage, http } from '@/api/client';
import type { CostSummary } from '@/api/types';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { formatMonthBR } from '@/lib/dates';
import { formatBRL } from '@/lib/money';
import { cn } from '@/lib/utils';
import { formatCostPerKm, formatDecimal } from './format';

type Row = CostSummary['vehicles'][number];

/** Resumo do mês por veículo. Todos os números vêm calculados da API (sem somas no web). */
export function SummaryTab({ month, vehicleId }: { month: string; vehicleId: string }) {
  const summary = useQuery({
    queryKey: ['fleet-costs', 'summary', month],
    queryFn: () => http.get<CostSummary>(`/fleet-costs/summary?month=${month}`),
    placeholderData: keepPreviousData,
  });

  if (summary.isPending) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }
  if (summary.isError) return <p className="text-sm text-destructive">{errorMessage(summary.error)}</p>;

  const rows = summary.data.vehicles.filter((r) => !vehicleId || r.vehicle.id === vehicleId);
  if (!rows.length) {
    return <EmptyState icon={Gauge} title="Nenhum veículo neste mês" description={`Sem dados de ${formatMonthBR(month, true)} para o filtro escolhido.`} />;
  }

  return (
    <Card className={cn('overflow-hidden', summary.isFetching && 'opacity-70')}>
      {/* Celular: cartões. Desktop: tabela. */}
      <ul className="divide-y md:hidden">
        {rows.map((r) => (
          <li key={r.vehicle.id} className="space-y-2 px-4 py-3">
            <div className="flex items-baseline justify-between gap-2">
              <p className="truncate text-sm font-medium">{r.vehicle.name}</p>
              <span className="shrink-0 text-xs text-muted-foreground">{r.vehicle.plate}</span>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              <Metric label="km rodados" value={formatDecimal(r.km, 1)} />
              <Metric label="Valor do km" value={formatBRL(r.kmRevenue)} />
              <Metric label="Litros" value={`${formatDecimal(r.liters, 3)} L`} />
              <Metric label="Combustível" value={formatBRL(r.fuelCost)} />
              <Metric label="Manutenção" value={formatBRL(r.maintenanceCost)} />
              <Metric label="km/l" value={formatDecimal(r.kmPerLiter, 2, 2)} />
              <Metric label="Custo por km" value={formatCostPerKm(r.costPerKm)} strong />
            </dl>
          </li>
        ))}
      </ul>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Veículo</th>
              <th className="px-4 py-2 text-right font-medium">km</th>
              <th className="px-4 py-2 text-right font-medium">Valor do km</th>
              <th className="px-4 py-2 text-right font-medium">Litros</th>
              <th className="px-4 py-2 text-right font-medium">Combustível</th>
              <th className="px-4 py-2 text-right font-medium">Manutenção</th>
              <th className="px-4 py-2 text-right font-medium">km/l</th>
              <th className="px-4 py-2 text-right font-medium">Custo por km</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r) => (
              <SummaryRow key={r.vehicle.id} row={r} />
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function SummaryRow({ row: r }: { row: Row }) {
  return (
    <tr>
      <td className="max-w-[14rem] px-4 py-3">
        <p className="truncate font-medium">{r.vehicle.name}</p>
        <p className="truncate text-xs text-muted-foreground">{r.vehicle.plate}</p>
      </td>
      <td className="px-4 py-3 text-right tabular-nums">{formatDecimal(r.km, 1)}</td>
      <td className="px-4 py-3 text-right tabular-nums">{formatBRL(r.kmRevenue)}</td>
      <td className="px-4 py-3 text-right tabular-nums">{formatDecimal(r.liters, 3)}</td>
      <td className="px-4 py-3 text-right tabular-nums">{formatBRL(r.fuelCost)}</td>
      <td className="px-4 py-3 text-right tabular-nums">{formatBRL(r.maintenanceCost)}</td>
      <td className="px-4 py-3 text-right tabular-nums">{formatDecimal(r.kmPerLiter, 2, 2)}</td>
      <td className="whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums">{formatCostPerKm(r.costPerKm)}</td>
    </tr>
  );
}

function Metric({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn('truncate tabular-nums', strong ? 'text-sm font-semibold' : 'text-sm')}>{value}</dd>
    </div>
  );
}
