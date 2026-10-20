import { FileText, MoreVertical, Pencil, Plus } from 'lucide-react';
import { useState } from 'react';
import { errorMessage } from '@/api/client';
import type { Contract } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/ui/empty-state';
import { Fab } from '@/components/ui/fab';
import { Segmented } from '@/components/ui/segmented';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateBR } from '@/lib/dates';
import { formatBRL } from '@/lib/money';
import { cn } from '@/lib/utils';
import { ContractDetailDialog } from './contract-detail-dialog';
import { ContractFormDialog } from './contract-form-dialog';
import { ContractStatusBadge } from './contract-status-badge';
import { ContractStatusDialog, type StatusTarget } from './contract-status-dialog';
import { BILLING_TYPE_LABELS, STATUS_ACTION_LABELS, STATUS_TRANSITIONS, useContracts, type ContractStatus } from './use-contracts';

type Filter = ContractStatus | 'ALL';

function period(c: Contract) {
  return c.endDate ? `${formatDateBR(c.startDate)} a ${formatDateBR(c.endDate)}` : `desde ${formatDateBR(c.startDate)}`;
}

function title(c: Contract) {
  return c.number ? `${c.contractor.name} · ${c.number}` : c.contractor.name;
}

export function ContractsTab({ canManage }: { canManage: boolean }) {
  const [filter, setFilter] = useState<Filter>('ACTIVE');
  const list = useContracts(filter === 'ALL' ? '' : filter);
  const [form, setForm] = useState<{ open: boolean; editing?: Contract }>({ open: false });
  const [detailId, setDetailId] = useState<string | null>(null);
  const [statusTarget, setStatusTarget] = useState<StatusTarget | null>(null);
  const editable = (c: Contract) => canManage && c.status !== 'ENDED' && c.status !== 'CANCELED';

  function actions(c: Contract) {
    if (!editable(c)) return null;
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost" className="relative z-10" aria-label={`Ações do contrato ${title(c)}`} onClick={(e) => e.stopPropagation()}>
            <MoreVertical />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onSelect={() => setForm({ open: true, editing: c })}>
            <Pencil /> Editar
          </DropdownMenuItem>
          {STATUS_TRANSITIONS[c.status].map((s) => (
            <DropdownMenuItem key={s} className={s === 'CANCELED' ? 'text-destructive' : undefined} onSelect={() => setStatusTarget({ contract: c, status: s })}>
              {STATUS_ACTION_LABELS[s]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <Segmented<Filter>
          className="min-w-0"
          label="Situação"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'ACTIVE', label: 'Ativos' },
            { value: 'DRAFT', label: 'Rascunhos' },
            { value: 'SUSPENDED', label: 'Suspensos' },
            { value: 'ENDED', label: 'Encerrados' },
            { value: 'CANCELED', label: 'Cancelados' },
            { value: 'ALL', label: 'Todos' },
          ]}
        />
        {canManage && (
          <Button className="hidden shrink-0 md:inline-flex" onClick={() => setForm({ open: true })}>
            <Plus /> Novo contrato
          </Button>
        )}
      </div>

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
          icon={FileText}
          title={filter === 'ACTIVE' ? 'Nenhum contrato ativo' : 'Nenhum contrato nesta situação'}
          description="Cadastre os contratos com escolas, prefeituras e empresas. Ao ativar, as contas a receber mensais são geradas automaticamente."
          action={
            canManage && (
              <Button onClick={() => setForm({ open: true })}>
                <Plus /> Novo contrato
              </Button>
            )
          }
        />
      ) : (
        <Card className={cn('overflow-hidden', list.isFetching && 'opacity-70')}>
          <ul className="divide-y md:hidden">
            {list.data.map((c) => (
              <li key={c.id} className="flex items-center gap-1 pr-2">
                <button type="button" className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left hover:bg-muted/50" onClick={() => setDetailId(c.id)}>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{title(c)}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {BILLING_TYPE_LABELS[c.billingType]} · {period(c)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-sm font-semibold tabular-nums">{formatBRL(c.amount)}</span>
                    <ContractStatusBadge status={c.status} />
                  </div>
                </button>
                {actions(c)}
              </li>
            ))}
          </ul>
          <table className="hidden w-full text-sm md:table">
            <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Contratante</th>
                <th className="px-4 py-2 font-medium">Cobrança</th>
                <th className="px-4 py-2 font-medium">Vigência</th>
                <th className="px-4 py-2 text-right font-medium">Valor</th>
                <th className="px-4 py-2 font-medium">Situação</th>
                <th className="w-12 px-2 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {list.data.map((c) => (
                <tr key={c.id} className="cursor-pointer hover:bg-muted/40" onClick={() => setDetailId(c.id)}>
                  <td className="max-w-xs px-4 py-3">
                    <p className="truncate font-medium">{title(c)}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[c.description, c.vehicles.length ? `${c.vehicles.length} veículo(s)` : null, c.routes.length ? `${c.routes.length} rota(s)` : null].filter(Boolean).join(' · ') || '—'}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {BILLING_TYPE_LABELS[c.billingType]}
                    {c.dueDay ? <span className="block text-xs">vence dia {c.dueDay}</span> : null}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">{period(c)}</td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums">{formatBRL(c.amount)}</td>
                  <td className="px-4 py-3">
                    <ContractStatusBadge status={c.status} />
                  </td>
                  <td className="px-2 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                    {actions(c)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {canManage && <Fab icon={Plus} label="Novo contrato" onClick={() => setForm({ open: true })} />}
      <ContractFormDialog open={form.open} editing={form.editing} onOpenChange={(open) => setForm((f) => ({ ...f, open }))} />
      <ContractDetailDialog
        id={detailId}
        canManage={canManage}
        onClose={() => setDetailId(null)}
        onEdit={(c) => setForm({ open: true, editing: c })}
        onStatus={(c, status) => setStatusTarget({ contract: c, status })}
      />
      <ContractStatusDialog target={statusTarget} onClose={() => setStatusTarget(null)} />
    </>
  );
}
