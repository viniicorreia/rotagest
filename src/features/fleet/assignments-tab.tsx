import { CalendarClock, CalendarX, Plus } from 'lucide-react';
import { useState } from 'react';
import { errorMessage } from '@/api/client';
import type { Assignment } from '@/api/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Fab } from '@/components/ui/fab';
import { NativeSelect } from '@/components/ui/input';
import { Segmented } from '@/components/ui/segmented';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateBR, todayISO } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { useVehicles } from '../finance/use-finance';
import { formatPlate } from '../vehicles/vehicles-page';
import { AssignmentFormDialog, EndAssignmentDialog } from './assignment-dialogs';
import { useAssignments, useDrivers, useRoutes } from './use-fleet';

type View = 'current' | 'all';

function AssignmentBadge({ a }: { a: Assignment }) {
  if (a.active) return <Badge>Vigente</Badge>;
  if (a.startDate > todayISO()) return <Badge variant="warning">Agendada</Badge>;
  return <Badge variant="secondary">Encerrada</Badge>;
}

function period(a: Assignment) {
  return a.endDate ? `${formatDateBR(a.startDate)} a ${formatDateBR(a.endDate)}` : `desde ${formatDateBR(a.startDate)}`;
}

function vehicleLabel(a: Assignment) {
  return a.vehicle ? `${a.vehicle.name} (${formatPlate(a.vehicle.plate)})` : 'Sem veículo';
}

export function AssignmentsTab({ canManage }: { canManage: boolean }) {
  const [view, setView] = useState<View>('current');
  const [routeId, setRouteId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [creating, setCreating] = useState(false);
  const [ending, setEnding] = useState<Assignment | null>(null);

  const list = useAssignments({ current: view === 'current', routeId, vehicleId, driverId });
  const routes = useRoutes();
  const drivers = useDrivers();
  const vehicles = useVehicles();
  const today = todayISO();
  const canEnd = (a: Assignment) => canManage && (!a.endDate || a.endDate >= today);

  return (
    <>
      <Card className="mb-4 space-y-3 p-3">
        <div className="flex items-center justify-between gap-3">
          <Segmented<View>
            className="min-w-0"
          label="Período"
            value={view}
            onChange={setView}
            options={[
              { value: 'current', label: 'Vigentes hoje' },
              { value: 'all', label: 'Histórico' },
            ]}
          />
          {canManage && (
            <Button className="hidden md:inline-flex" onClick={() => setCreating(true)}>
              <Plus /> Nova escala
            </Button>
          )}
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <NativeSelect aria-label="Rota" value={routeId} onChange={(e) => setRouteId(e.target.value)}>
            <option value="">Todas as rotas</option>
            {routes.data?.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
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
          <NativeSelect aria-label="Motorista" value={driverId} onChange={(e) => setDriverId(e.target.value)}>
            <option value="">Todos os motoristas</option>
            {drivers.data?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </NativeSelect>
        </div>
      </Card>

      {list.isPending ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : list.isError ? (
        <p className="text-sm text-destructive">{errorMessage(list.error)}</p>
      ) : !list.data.length ? (
        <EmptyState
          icon={CalendarClock}
          title={view === 'current' ? 'Ninguém escalado hoje' : 'Nenhuma escala encontrada'}
          description="A escala diz qual veículo e qual motorista fazem cada rota, e desde quando."
          action={
            canManage && (
              <Button onClick={() => setCreating(true)}>
                <Plus /> Nova escala
              </Button>
            )
          }
        />
      ) : (
        <Card className={cn('overflow-hidden', list.isFetching && 'opacity-70')}>
          <ul className="divide-y md:hidden">
            {list.data.map((a) => (
              <li key={a.id} className="flex items-start gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{a.route.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {vehicleLabel(a)} · {a.driver?.name ?? 'sem motorista'}
                  </p>
                  <p className="text-xs tabular-nums text-muted-foreground">{period(a)}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <AssignmentBadge a={a} />
                  {canEnd(a) && (
                    <Button size="sm" variant="outline" onClick={() => setEnding(a)}>
                      Encerrar
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <table className="hidden w-full text-sm md:table">
            <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Rota</th>
                <th className="px-4 py-2 font-medium">Veículo</th>
                <th className="px-4 py-2 font-medium">Motorista</th>
                <th className="px-4 py-2 font-medium">Período</th>
                <th className="px-4 py-2 font-medium">Situação</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {list.data.map((a) => (
                <tr key={a.id}>
                  <td className="max-w-xs px-4 py-3">
                    <p className="truncate font-medium">{a.route.name}</p>
                    {a.notes && <p className="truncate text-xs text-muted-foreground">{a.notes}</p>}
                  </td>
                  <td className="px-4 py-3">{vehicleLabel(a)}</td>
                  <td className="px-4 py-3">{a.driver?.name ?? <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">{period(a)}</td>
                  <td className="px-4 py-3">
                    <AssignmentBadge a={a} />
                  </td>
                  <td className="px-4 py-2 text-right">
                    {canEnd(a) && (
                      <Button size="sm" variant="outline" onClick={() => setEnding(a)}>
                        <CalendarX /> Encerrar
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {canManage && <Fab icon={Plus} label="Nova escala" onClick={() => setCreating(true)} />}
      <AssignmentFormDialog open={creating} onOpenChange={setCreating} routeId={routeId || undefined} />
      <EndAssignmentDialog target={ending} onClose={() => setEnding(null)} />
    </>
  );
}
