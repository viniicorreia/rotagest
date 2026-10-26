import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Fuel, Plus } from 'lucide-react';
import { useState } from 'react';
import { errorMessage, http } from '@/api/client';
import type { Fueling, FuelingList } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/ui/stat-card';
import { formatDateBR } from '@/lib/dates';
import { formatBRL } from '@/lib/money';
import { cn } from '@/lib/utils';
import { CancelCostDialog, CostPayableStatus, Pager, canCancelCost } from './cost-parts';
import { formatDecimal, formatPricePerLiter } from './format';
import { FUEL_TYPE_LABELS } from './labels';

const PAGE_SIZE = 20;

interface Props {
  month: string;
  vehicleId: string;
  page: number;
  onPage: (page: number) => void;
  canManage: boolean;
  onCreate: () => void;
}

export function FuelingsTab({ month, vehicleId, page, onPage, canManage, onCreate }: Props) {
  const [canceling, setCanceling] = useState<Fueling | null>(null);
  const query = new URLSearchParams({ month, page: String(page), pageSize: String(PAGE_SIZE) });
  if (vehicleId) query.set('vehicleId', vehicleId);

  const list = useQuery({
    queryKey: ['fuelings', query.toString()],
    queryFn: () => http.get<FuelingList>(`/fuelings?${query}`),
    placeholderData: keepPreviousData,
  });
  const data = list.data;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const canceled = (f: Fueling) => f.payable.status === 'CANCELED';

  return (
    <>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total (não cancelados)" value={formatBRL(data?.amount)} loading={list.isPending} />
        <StatCard label="Litros" value={`${formatDecimal(data?.liters ?? '0', 3)} L`} loading={list.isPending} />
        <StatCard label="Abastecimentos" value={data?.total ?? 0} loading={list.isPending} className="hidden lg:block" />
      </div>

      {list.isPending ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : list.isError ? (
        <p className="text-sm text-destructive">{errorMessage(list.error)}</p>
      ) : !data?.items.length ? (
        <EmptyState
          icon={Fuel}
          title="Nenhum abastecimento no período"
          description="Cada abastecimento registrado gera uma conta a pagar de combustível."
          action={
            canManage && (
              <Button onClick={onCreate}>
                <Plus /> Novo abastecimento
              </Button>
            )
          }
        />
      ) : (
        <Card className={cn('overflow-hidden', list.isFetching && 'opacity-70')}>
          <ul className="divide-y md:hidden">
            {data.items.map((f) => (
              <li key={f.id} className="flex items-start gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className={cn('truncate text-sm font-medium', canceled(f) && 'line-through opacity-60')}>
                    {f.vehicle.name} · {FUEL_TYPE_LABELS[f.fuelType]}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatDateBR(f.date)} · {formatDecimal(f.liters, 3)} L × {formatPricePerLiter(f.pricePerLiter)}
                  </p>
                  {(f.station || f.driver || f.odometerKm !== null) && (
                    <p className="truncate text-xs text-muted-foreground">
                      {[f.station, f.driver?.name, f.odometerKm !== null ? `${formatDecimal(String(f.odometerKm))} km` : null].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-sm font-semibold tabular-nums">{formatBRL(f.amount)}</span>
                  <CostPayableStatus payable={f.payable} />
                  {canManage && canCancelCost(f.payable) && (
                    <Button size="sm" variant="ghost" className="h-8 px-2 text-xs text-destructive" onClick={() => setCanceling(f)}>
                      Cancelar
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Veículo</th>
                <th className="px-4 py-2 font-medium">Data</th>
                <th className="px-4 py-2 text-right font-medium">Litros</th>
                <th className="px-4 py-2 text-right font-medium">R$/L</th>
                <th className="px-4 py-2 text-right font-medium">Valor</th>
                <th className="px-4 py-2 font-medium">Posto / motorista</th>
                <th className="px-4 py-2 font-medium">Conta</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.items.map((f) => (
                <tr key={f.id}>
                  <td className="max-w-[12rem] px-4 py-3">
                    <p className={cn('truncate font-medium', canceled(f) && 'line-through opacity-60')}>{f.vehicle.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {f.vehicle.plate} · {FUEL_TYPE_LABELS[f.fuelType]}
                      {f.odometerKm !== null ? ` · ${formatDecimal(String(f.odometerKm))} km` : ''}
                    </p>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{formatDateBR(f.date)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatDecimal(f.liters, 3)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{formatPricePerLiter(f.pricePerLiter)}</td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums">{formatBRL(f.amount)}</td>
                  <td className="max-w-[12rem] px-4 py-3">
                    <p className="truncate">{f.station ?? '—'}</p>
                    {f.driver && <p className="truncate text-xs text-muted-foreground">{f.driver.name}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <CostPayableStatus payable={f.payable} />
                    {f.payable.status !== 'CANCELED' && f.payable.status !== 'PAID' && (
                      <p className="mt-0.5 text-xs text-muted-foreground">vence {formatDateBR(f.payable.dueDate)}</p>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {canManage && canCancelCost(f.payable) && (
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setCanceling(f)}>
                        Cancelar
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          <Pager page={page} totalPages={totalPages} total={data.total} onPage={onPage} />
        </Card>
      )}

      <CancelCostDialog
        target={canceling && { path: `/fuelings/${canceling.id}`, label: `${canceling.vehicle.name} · ${formatDateBR(canceling.date)} · ${formatBRL(canceling.amount)}` }}
        onClose={() => setCanceling(null)}
      />
    </>
  );
}
