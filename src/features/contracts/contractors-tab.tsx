import { Building2, MoreVertical, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { errorMessage, http } from '@/api/client';
import type { Contractor } from '@/api/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/ui/empty-state';
import { Fab } from '@/components/ui/fab';
import { Segmented } from '@/components/ui/segmented';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDocument } from '@/lib/documents';
import { ContractorFormDialog } from './contractor-form-dialog';
import { CONTRACTOR_KIND_LABELS, useContractors, useInvalidateContracts } from './use-contracts';

type View = 'ACTIVE' | 'INACTIVE' | 'ALL';

export function ContractorsTab({ canManage }: { canManage: boolean }) {
  const contractors = useContractors();
  const invalidate = useInvalidateContracts();
  const [view, setView] = useState<View>('ACTIVE');
  const [form, setForm] = useState<{ open: boolean; editing?: Contractor }>({ open: false });
  const [removing, setRemoving] = useState<Contractor | null>(null);
  const items = (contractors.data ?? []).filter((c) => view === 'ALL' || c.status === view);

  async function remove(c: Contractor) {
    try {
      await http.delete(`/contractors/${c.id}`);
      await invalidate();
      toast.success('Contratante excluído');
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
            <Plus /> Novo contratante
          </Button>
        )}
      </div>

      {contractors.isPending ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : contractors.isError ? (
        <p className="text-sm text-destructive">{errorMessage(contractors.error)}</p>
      ) : !items.length ? (
        <EmptyState
          icon={Building2}
          title={contractors.data.length ? 'Nenhum contratante nesta situação' : 'Nenhum contratante cadastrado'}
          description="Escolas, prefeituras, empresas e pessoas que contratam o transporte."
          action={
            canManage && (
              <Button onClick={() => setForm({ open: true })}>
                <Plus /> Novo contratante
              </Button>
            )
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((c) => (
            <Card key={c.id} className="flex items-start gap-3 p-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <Building2 className="size-5" aria-hidden />
              </div>
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="truncate font-semibold">{c.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {CONTRACTOR_KIND_LABELS[c.kind]}
                  {c.document ? ` · ${formatDocument(c.document)}` : ''}
                </p>
                {(c.email || c.phone) && <p className="truncate text-xs text-muted-foreground">{[c.email, c.phone].filter(Boolean).join(' · ')}</p>}
                <div className="flex flex-wrap gap-1.5 pt-1.5">
                  {c.status === 'ACTIVE' ? <Badge>Ativo</Badge> : <Badge variant="secondary">Inativo</Badge>}
                  <Badge variant="outline">{c.activeContracts === 1 ? '1 contrato ativo' : `${c.activeContracts} contratos ativos`}</Badge>
                </div>
              </div>
              {canManage && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost" className="-mr-2 -mt-2" aria-label={`Ações de ${c.name}`}>
                      <MoreVertical />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => setForm({ open: true, editing: c })}>
                      <Pencil /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onSelect={() => setRemoving(c)}>
                      <Trash2 /> Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </Card>
          ))}
        </div>
      )}

      {canManage && <Fab icon={Plus} label="Novo contratante" onClick={() => setForm({ open: true })} />}
      <ContractorFormDialog open={form.open} editing={form.editing} onOpenChange={(open) => setForm((f) => ({ ...f, open }))} />
      <ConfirmDialog
        open={!!removing}
        onOpenChange={(o) => !o && setRemoving(null)}
        title="Excluir contratante?"
        description="Só é possível excluir contratantes sem contratos. Com contratos, marque como inativo."
        confirmLabel="Excluir"
        destructive
        onConfirm={() => remove(removing!)}
      />
    </>
  );
}
