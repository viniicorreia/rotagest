import { Archive, ArchiveRestore, Bus, MoreVertical, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { errorMessage, http } from '@/api/client';
import type { Vehicle } from '@/api/types';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/ui/empty-state';
import { Fab } from '@/components/ui/fab';
import { Segmented } from '@/components/ui/segmented';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/auth';
import { VEHICLE_STATUS_LABELS } from '../finance/labels';
import { useInvalidateFinance, useVehicles } from '../finance/use-finance';
import { UsageMeter } from '../subscriptions/usage-meter';
import { VehicleFormDialog } from './vehicle-form-dialog';

export function formatPlate(plate: string): string {
  return /^[A-Z]{3}\d{4}$/.test(plate) ? `${plate.slice(0, 3)}-${plate.slice(3)}` : plate;
}

export function VehicleStatusBadge({ vehicle }: { vehicle: Vehicle }) {
  if (vehicle.archivedAt) return <Badge variant="outline">Arquivado</Badge>;
  const variant = vehicle.status === 'ACTIVE' ? 'default' : vehicle.status === 'MAINTENANCE' ? 'warning' : 'secondary';
  return <Badge variant={variant}>{VEHICLE_STATUS_LABELS[vehicle.status]}</Badge>;
}

export function VehiclesPage() {
  const { can } = useAuth();
  const canManage = can('fleet:manage');
  const [view, setView] = useState<'active' | 'archived'>('active');
  const vehicles = useVehicles(view === 'archived');
  const invalidate = useInvalidateFinance();
  const [form, setForm] = useState<{ open: boolean; editing?: Vehicle }>({ open: false });
  const [confirm, setConfirm] = useState<{ action: 'archive' | 'delete'; vehicle: Vehicle } | null>(null);

  const usage = vehicles.data?.usage;
  const full = !!usage && usage.limit !== null && usage.used >= usage.limit;

  async function run(action: 'archive' | 'restore' | 'delete', v: Vehicle) {
    try {
      if (action === 'delete') await http.delete(`/vehicles/${v.id}`);
      else await http.post(`/vehicles/${v.id}/${action}`);
      await invalidate();
      toast.success(action === 'archive' ? 'Veículo arquivado' : action === 'restore' ? 'Veículo reativado' : 'Veículo excluído');
    } catch (e) {
      toast.error(errorMessage(e));
      throw e;
    }
  }

  function openNew() {
    if (full) return toast.error(`Seu plano permite ${usage?.limit} veículo(s). Arquive um veículo ou mude de plano.`);
    setForm({ open: true });
  }

  return (
    <>
      <PageHeader
        title="Veículos"
        description="Frota da empresa e o resultado de cada veículo."
        actions={
          canManage && (
            <Button className="hidden md:inline-flex" onClick={openNew}>
              <Plus /> Novo veículo
            </Button>
          )
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Segmented
          label="Exibir"
          value={view}
          onChange={setView}
          options={[
            { value: 'active', label: 'Em uso' },
            { value: 'archived', label: 'Arquivados' },
          ]}
        />
        {usage && (
          <Card className="w-full p-3 sm:w-72">
            <UsageMeter label="Veículos do plano" used={usage.used} limit={usage.limit} />
          </Card>
        )}
      </div>

      {vehicles.isPending ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : vehicles.isError ? (
        <p className="text-sm text-destructive">{errorMessage(vehicles.error)}</p>
      ) : !vehicles.data.items.length ? (
        <EmptyState
          icon={Bus}
          title={view === 'archived' ? 'Nenhum veículo arquivado' : 'Nenhum veículo cadastrado'}
          description={view === 'archived' ? 'Veículos arquivados guardam o histórico e não contam no limite do plano.' : 'Cadastre os veículos para ver custo e resultado de cada um.'}
          action={
            canManage &&
            view === 'active' && (
              <Button onClick={openNew}>
                <Plus /> Novo veículo
              </Button>
            )
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {vehicles.data.items.map((v) => (
            <Card key={v.id} className="relative flex items-start gap-3 p-4 transition-colors hover:bg-muted/40">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <Bus className="size-5" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <Link to={`/app/vehicles/${v.id}`} className="block truncate font-semibold after:absolute after:inset-0">
                  {v.name}
                </Link>
                <p className="text-sm tabular-nums text-muted-foreground">{formatPlate(v.plate)}</p>
                <p className="truncate text-xs text-muted-foreground">{[v.brand, v.model, v.year].filter(Boolean).join(' · ') || 'Sem modelo informado'}</p>
                <div className="mt-2">
                  <VehicleStatusBadge vehicle={v} />
                </div>
              </div>
              {canManage && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost" className="relative z-10 -mr-2 -mt-2" aria-label={`Ações de ${v.name}`}>
                      <MoreVertical />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {v.archivedAt ? (
                      <>
                        <DropdownMenuItem onSelect={() => run('restore', v).catch(() => undefined)}>
                          <ArchiveRestore /> Reativar
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onSelect={() => setConfirm({ action: 'delete', vehicle: v })}>
                          <Trash2 /> Excluir
                        </DropdownMenuItem>
                      </>
                    ) : (
                      <>
                        <DropdownMenuItem onSelect={() => setForm({ open: true, editing: v })}>
                          <Pencil /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setConfirm({ action: 'archive', vehicle: v })}>
                          <Archive /> Arquivar
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </Card>
          ))}
        </div>
      )}

      {canManage && view === 'active' && <Fab icon={Plus} label="Novo veículo" onClick={openNew} />}
      <VehicleFormDialog open={form.open} editing={form.editing} onOpenChange={(open) => setForm((f) => ({ ...f, open }))} />
      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={confirm?.action === 'delete' ? 'Excluir veículo?' : 'Arquivar veículo?'}
        description={
          confirm?.action === 'delete'
            ? 'Só é possível excluir veículos sem lançamentos. Veículos com histórico ficam arquivados.'
            : 'O veículo sai da lista e não conta no limite do plano. Lançamentos e relatórios continuam com o histórico.'
        }
        confirmLabel={confirm?.action === 'delete' ? 'Excluir' : 'Arquivar'}
        destructive={confirm?.action === 'delete'}
        onConfirm={() => run(confirm!.action, confirm!.vehicle)}
      />
    </>
  );
}
