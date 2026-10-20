import { MoreVertical, Pencil, Plus, Trash2, UserRound } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { errorMessage, http } from '@/api/client';
import type { Driver } from '@/api/types';
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
import { formatDocument } from '@/lib/documents';
import { DriverFormDialog } from './driver-form-dialog';
import { EMPLOYMENT_TYPE_LABELS, useDrivers, useInvalidateFleet } from './use-fleet';

type View = 'ACTIVE' | 'INACTIVE' | 'ALL';

export function DriversTab({ canManage }: { canManage: boolean }) {
  const drivers = useDrivers();
  const invalidate = useInvalidateFleet();
  const [view, setView] = useState<View>('ACTIVE');
  const [form, setForm] = useState<{ open: boolean; editing?: Driver }>({ open: false });
  const [removing, setRemoving] = useState<Driver | null>(null);

  const items = (drivers.data ?? []).filter((d) => view === 'ALL' || d.status === view);

  async function remove(d: Driver) {
    try {
      await http.delete(`/drivers/${d.id}`);
      await invalidate();
      toast.success('Motorista excluído');
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
            { value: 'ACTIVE', label: 'Ativos' },
            { value: 'INACTIVE', label: 'Inativos' },
            { value: 'ALL', label: 'Todos' },
          ]}
        />
        {canManage && (
          <Button className="hidden md:inline-flex" onClick={() => setForm({ open: true })}>
            <Plus /> Novo motorista
          </Button>
        )}
      </div>

      {drivers.isPending ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : drivers.isError ? (
        <p className="text-sm text-destructive">{errorMessage(drivers.error)}</p>
      ) : !items.length ? (
        <EmptyState
          icon={UserRound}
          title={drivers.data.length ? 'Nenhum motorista nesta situação' : 'Nenhum motorista cadastrado'}
          description="Cadastre os motoristas para montar as escalas e registrar km e despesas por pessoa."
          action={
            canManage && (
              <Button onClick={() => setForm({ open: true })}>
                <Plus /> Novo motorista
              </Button>
            )
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((d) => (
            <Card key={d.id} className="flex items-start gap-3 p-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <UserRound className="size-5" aria-hidden />
              </div>
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="truncate font-semibold">{d.name}</p>
                <p className="text-sm tabular-nums text-muted-foreground">
                  CPF {formatDocument(d.document)}
                  {d.phone ? ` · ${d.phone}` : ''}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {EMPLOYMENT_TYPE_LABELS[d.employmentType]}
                  {d.hiredAt ? ` · desde ${formatDateBR(d.hiredAt)}` : ''}
                </p>
                {d.member && <p className="truncate text-xs text-muted-foreground">Portal: {d.member.name}</p>}
                <p className="truncate text-xs text-muted-foreground">{d.currentRoutes.length ? `Hoje: ${d.currentRoutes.join(', ')}` : 'Sem escala hoje'}</p>
                <div className="pt-1.5">{d.status === 'ACTIVE' ? <Badge>Ativo</Badge> : <Badge variant="secondary">Inativo</Badge>}</div>
              </div>
              {canManage && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost" className="-mr-2 -mt-2" aria-label={`Ações de ${d.name}`}>
                      <MoreVertical />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => setForm({ open: true, editing: d })}>
                      <Pencil /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onSelect={() => setRemoving(d)}>
                      <Trash2 /> Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </Card>
          ))}
        </div>
      )}

      {canManage && <Fab icon={Plus} label="Novo motorista" onClick={() => setForm({ open: true })} />}
      <DriverFormDialog open={form.open} editing={form.editing} drivers={drivers.data ?? []} onOpenChange={(open) => setForm((f) => ({ ...f, open }))} />
      <ConfirmDialog
        open={!!removing}
        onOpenChange={(o) => !o && setRemoving(null)}
        title="Excluir motorista?"
        description="Só é possível excluir motoristas sem histórico. Com escalas, km ou despesas, marque como inativo."
        confirmLabel="Excluir"
        destructive
        onConfirm={() => remove(removing!)}
      />
    </>
  );
}
