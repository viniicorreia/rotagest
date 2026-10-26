import { CalendarPlus, MapPin, MoreVertical, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { errorMessage, http } from '@/api/client';
import type { Route } from '@/api/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/ui/empty-state';
import { Fab } from '@/components/ui/fab';
import { Segmented } from '@/components/ui/segmented';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateBR } from '@/lib/dates';
import { formatPlate } from '../vehicles/vehicles-page';
import { AssignmentFormDialog } from './assignment-dialogs';
import { RouteFormDialog } from './route-form-dialog';
import { TRANSPORT_TYPE_LABELS, useInvalidateFleet, useRoutes } from './use-fleet';

type View = 'ACTIVE' | 'INACTIVE' | 'ALL';

export function RoutesTab({ canManage }: { canManage: boolean }) {
  const routes = useRoutes();
  const invalidate = useInvalidateFleet();
  const [view, setView] = useState<View>('ACTIVE');
  const [form, setForm] = useState<{ open: boolean; editing?: Route }>({ open: false });
  const [assignTo, setAssignTo] = useState<string | null>(null);
  const [removing, setRemoving] = useState<Route | null>(null);

  const items = (routes.data ?? []).filter((r) => view === 'ALL' || r.status === view);

  async function remove(r: Route) {
    try {
      await http.delete(`/routes/${r.id}`);
      await invalidate();
      toast.success('Rota excluída');
    } catch (e) {
      toast.error(errorMessage(e));
      throw e;
    }
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <Segmented<View>
          className="min-w-0"
          label="Situação"
          value={view}
          onChange={setView}
          options={[
            { value: 'ACTIVE', label: 'Ativas' },
            { value: 'INACTIVE', label: 'Inativas' },
            { value: 'ALL', label: 'Todas' },
          ]}
        />
        {canManage && (
          <Button className="hidden md:inline-flex" onClick={() => setForm({ open: true })}>
            <Plus /> Nova rota
          </Button>
        )}
      </div>

      {routes.isPending ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : routes.isError ? (
        <p className="text-sm text-destructive">{errorMessage(routes.error)}</p>
      ) : !items.length ? (
        <EmptyState
          icon={MapPin}
          title={routes.data.length ? 'Nenhuma rota nesta situação' : 'Nenhuma rota cadastrada'}
          description="Cadastre as linhas e itinerários que a empresa atende para escalar veículos e motoristas."
          action={
            canManage && (
              <Button onClick={() => setForm({ open: true })}>
                <Plus /> Nova rota
              </Button>
            )
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((r) => (
            <Card key={r.id} className="flex flex-col gap-3 p-4">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <MapPin className="size-5" aria-hidden />
                </div>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="truncate font-semibold">{r.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{[TRANSPORT_TYPE_LABELS[r.transportType], r.region].filter(Boolean).join(' · ')}</p>
                  {r.description && <p className="line-clamp-2 text-xs text-muted-foreground">{r.description}</p>}
                  <div className="pt-1.5">{r.status === 'ACTIVE' ? <Badge>Ativa</Badge> : <Badge variant="secondary">Inativa</Badge>}</div>
                </div>
                {canManage && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost" className="-mr-2 -mt-2" aria-label={`Ações de ${r.name}`}>
                        <MoreVertical />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => setForm({ open: true, editing: r })}>
                        <Pencil /> Editar
                      </DropdownMenuItem>
                      {r.status === 'ACTIVE' && (
                        <DropdownMenuItem onSelect={() => setAssignTo(r.id)}>
                          <CalendarPlus /> Nova escala
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem className="text-destructive" onSelect={() => setRemoving(r)}>
                        <Trash2 /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              <div className="rounded-lg bg-muted/50 p-2.5 text-xs">
                <p className="mb-1 font-medium text-muted-foreground">Escala de hoje</p>
                {r.current.length ? (
                  <ul className="space-y-1">
                    {r.current.map((a) => (
                      <li key={a.id} className="truncate">
                        {a.vehicle ? `${a.vehicle.name} (${formatPlate(a.vehicle.plate)})` : 'Sem veículo'} · {a.driver?.name ?? 'sem motorista'}
                        <span className="text-muted-foreground"> · {a.endDate ? `até ${formatDateBR(a.endDate)}` : `desde ${formatDateBR(a.startDate)}`}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">Ninguém escalado</p>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {canManage && <Fab icon={Plus} label="Nova rota" onClick={() => setForm({ open: true })} />}
      <RouteFormDialog open={form.open} editing={form.editing} onOpenChange={(open) => setForm((f) => ({ ...f, open }))} />
      <AssignmentFormDialog open={!!assignTo} routeId={assignTo ?? undefined} onOpenChange={(o) => !o && setAssignTo(null)} />
      <ConfirmDialog
        open={!!removing}
        onOpenChange={(o) => !o && setRemoving(null)}
        title="Excluir rota?"
        description="Só é possível excluir rotas sem histórico. Com escalas ou contratos, marque como inativa."
        confirmLabel="Excluir"
        destructive
        onConfirm={() => remove(removing!)}
      />
    </>
  );
}
