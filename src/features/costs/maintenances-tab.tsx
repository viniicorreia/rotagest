import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Plus, Wrench } from 'lucide-react';
import { useState } from 'react';
import { errorMessage, http } from '@/api/client';
import type { Maintenance, MaintenanceList } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/ui/stat-card';
import { formatDateBR } from '@/lib/dates';
import { formatBRL } from '@/lib/money';
import { cn } from '@/lib/utils';
import { CancelCostDialog, CostPayableStatus, Pager, canCancelCost } from './cost-parts';
import { formatDecimal } from './format';
import { MAINTENANCE_TYPE_LABELS } from './labels';

const PAGE_SIZE = 20;

interface Props {
  month: string;
  vehicleId: string;
  page: number;
  onPage: (page: number) => void;
  canManage: boolean;
  onCreate: () => void;
}

export function MaintenancesTab({ month, vehicleId, page, onPage, canManage, onCreate }: Props) {
  const [canceling, setCanceling] = useState<Maintenance | null>(null);
  const query = new URLSearchParams({ month, page: String(page), pageSize: String(PAGE_SIZE) });
  if (vehicleId) query.set('vehicleId', vehicleId);

  const list = useQuery({
    queryKey: ['maintenances', query.toString()],
    queryFn: () => http.get<MaintenanceList>(`/maintenances?${query}`),
    placeholderData: keepPreviousData,
  });
  const data = list.data;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total (não canceladas)" value={formatBRL(data?.amount)} loading={list.isPending} />
        <StatCard label="Lançamentos" value={data?.total ?? 0} loading={list.isPending} />
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
          icon={Wrench}
          title="Nenhuma manutenção no período"
          description="Cada manutenção registrada gera uma conta a pagar ligada ao veículo."
          action={
            canManage && (
              <Button onClick={onCreate}>
                <Plus /> Nova manutenção
              </Button>
            )
          }
        />
      ) : (
        <Card className={cn('overflow-hidden', list.isFetching && 'opacity-70')}>
          <ul className="divide-y md:hidden">
            {data.items.map((m) => (
              <li key={m.id} className="flex items-start gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className={cn('truncate text-sm font-medium', m.payable?.status === 'CANCELED' && 'line-through opacity-60')}>{m.description}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {MAINTENANCE_TYPE_LABELS[m.type]} · {m.vehicle.name} · {formatDateBR(m.date)}
                  </p>
                  {(m.supplierName || m.odometerKm !== null) && (
                    <p className="truncate text-xs text-muted-foreground">
                      {[m.supplierName, m.odometerKm !== null ? `${formatDecimal(String(m.odometerKm))} km` : null].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-sm font-semibold tabular-nums">{formatBRL(m.amount)}</span>
                  <CostPayableStatus payable={m.payable} />
                  {canManage && canCancelCost(m.payable) && (
                    <Button size="sm" variant="ghost" className="h-8 px-2 text-xs text-destructive" onClick={() => setCanceling(m)}>
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
                <th className="px-4 py-2 font-medium">Serviço</th>
                <th className="px-4 py-2 font-medium">Veículo</th>
                <th className="px-4 py-2 font-medium">Data</th>
                <th className="px-4 py-2 text-right font-medium">Odômetro</th>
                <th className="px-4 py-2 text-right font-medium">Valor</th>
                <th className="px-4 py-2 font-medium">Conta</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.items.map((m) => (
                <tr key={m.id}>
                  <td className="max-w-xs px-4 py-3">
                    <p className={cn('truncate font-medium', m.payable?.status === 'CANCELED' && 'line-through opacity-60')}>{m.description}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {MAINTENANCE_TYPE_LABELS[m.type]}
                      {m.supplierName ? ` · ${m.supplierName}` : ''}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="truncate">{m.vehicle.name}</p>
                    <p className="text-xs text-muted-foreground">{m.vehicle.plate}</p>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{formatDateBR(m.date)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{m.odometerKm !== null ? formatDecimal(String(m.odometerKm)) : '—'}</td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums">{formatBRL(m.amount)}</td>
                  <td className="px-4 py-3">
                    <CostPayableStatus payable={m.payable} />
                    {m.payable && m.payable.status !== 'CANCELED' && m.payable.status !== 'PAID' && (
                      <p className="mt-0.5 text-xs text-muted-foreground">vence {formatDateBR(m.payable.dueDate)}</p>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {canManage && canCancelCost(m.payable) && (
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setCanceling(m)}>
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
        target={canceling && { path: `/maintenances/${canceling.id}`, label: `${canceling.description} · ${formatBRL(canceling.amount)}` }}
        onClose={() => setCanceling(null)}
      />
    </>
  );
}
