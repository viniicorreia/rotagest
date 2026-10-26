import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ClipboardCheck, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { errorMessage, http } from '@/api/client';
import type { ApprovalStatus, DriverExpense, DriverExpenseList } from '@/api/types';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Segmented } from '@/components/ui/segmented';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateBR } from '@/lib/dates';
import { formatBRL } from '@/lib/money';
import { AttachmentsPanel } from '../finance/attachments';
import { ReasonDialog } from '../finance/reason-dialog';
import { useInvalidateFinance } from '../finance/use-finance';
import { ExpenseStatusBadge, FuelDetail } from './shared';

const PAGE_SIZE = 20;

const TABS: readonly { value: ApprovalStatus; label: string }[] = [
  { value: 'PENDING_APPROVAL', label: 'Pendentes' },
  { value: 'APPROVED', label: 'Aprovadas' },
  { value: 'REJECTED', label: 'Recusadas' },
];

const EMPTY: Record<ApprovalStatus, string> = {
  PENDING_APPROVAL: 'Nenhuma despesa aguardando aprovação.',
  APPROVED: 'Nenhuma despesa aprovada ainda.',
  REJECTED: 'Nenhuma despesa recusada.',
};

/** Despesas enviadas pelos motoristas: só entram no financeiro depois de aprovadas aqui. */
export function ApprovalsPage() {
  const [status, setStatus] = useState<ApprovalStatus>('PENDING_APPROVAL');
  const [page, setPage] = useState(1);
  const [rejecting, setRejecting] = useState<DriverExpense | null>(null);
  const [approving, setApproving] = useState<string | null>(null);
  const qc = useQueryClient();
  const invalidateFinance = useInvalidateFinance();
  const list = useQuery({
    queryKey: ['expense-approvals', status, page],
    queryFn: () => http.get<DriverExpenseList>(`/expense-approvals?status=${status}&page=${page}&pageSize=${PAGE_SIZE}`),
  });
  const pages = list.data ? Math.max(1, Math.ceil(list.data.total / PAGE_SIZE)) : 1;

  async function invalidate() {
    await Promise.all([qc.invalidateQueries({ queryKey: ['expense-approvals'] }), invalidateFinance()]);
  }

  async function approve(x: DriverExpense) {
    setApproving(x.id);
    try {
      await http.post(`/expense-approvals/${x.id}/approve`);
      toast.success('Despesa aprovada');
      await invalidate();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setApproving(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Aprovações" description="Gastos enviados pelos motoristas. Aprovados viram contas a pagar." />
      <Segmented
        label="Situação"
        className="mb-4"
        value={status}
        onChange={(s) => {
          setStatus(s);
          setPage(1);
        }}
        options={TABS}
      />
      {list.isPending ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      ) : list.isError ? (
        <div className="rounded-xl border p-4">
          <p className="text-sm text-destructive">{errorMessage(list.error)}</p>
          <Button variant="outline" className="mt-3" onClick={() => list.refetch()}>
            Tentar novamente
          </Button>
        </div>
      ) : list.data.items.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title={EMPTY[status]} />
      ) : (
        <ul className="space-y-3">
          {list.data.items.map((x) => (
            <ApprovalCard key={x.id} expense={x} busy={approving === x.id} onApprove={() => approve(x)} onReject={() => setRejecting(x)} />
          ))}
        </ul>
      )}
      {pages > 1 && (
        <div className="mt-4 flex items-center justify-between gap-2">
          <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} de {pages}
          </span>
          <Button variant="outline" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
            Próxima
          </Button>
        </div>
      )}

      <ReasonDialog
        open={!!rejecting}
        onOpenChange={(o) => !o && setRejecting(null)}
        title="Recusar despesa"
        description={rejecting ? `${rejecting.driver?.name ?? 'Motorista'} · ${rejecting.description} · ${formatBRL(rejecting.amount)}. O motorista verá o motivo.` : ''}
        confirmLabel="Recusar"
        minLength={3}
        onConfirm={async (reason) => {
          if (!rejecting) return;
          try {
            await http.post(`/expense-approvals/${rejecting.id}/reject`, { reason });
            toast.success('Despesa recusada');
            await invalidate();
          } catch (e) {
            toast.error(errorMessage(e));
            throw e;
          }
        }}
      />
    </div>
  );
}

function ApprovalCard({ expense: x, busy, onApprove, onReject }: { expense: DriverExpense; busy: boolean; onApprove: () => void; onReject: () => void }) {
  const pending = x.approvalStatus === 'PENDING_APPROVAL' && x.status !== 'CANCELED';
  return (
    <li className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{x.driver?.name ?? 'Motorista'}</p>
          <p className="text-sm text-muted-foreground">
            {formatDateBR(x.dueDate)} · {x.category.name}
          </p>
        </div>
        <p className="shrink-0 text-lg font-semibold tabular-nums">{formatBRL(x.amount)}</p>
      </div>
      <p className="mt-2 break-words text-sm">{x.description}</p>
      <p className="text-sm text-muted-foreground">{x.vehicle ? `${x.vehicle.name} · ${x.vehicle.plate}` : 'Sem veículo'}</p>
      {x.supplierName && !x.fuel && <p className="text-xs text-muted-foreground">Fornecedor: {x.supplierName}</p>}
      {x.fuel && <FuelDetail fuel={x.fuel} />}
      {x.notes && <p className="mt-1 break-words text-xs text-muted-foreground">{x.notes}</p>}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <ExpenseStatusBadge expense={x} />
      </div>
      {x.approvalStatus === 'REJECTED' && x.cancelReason && <p className="mt-2 text-sm text-destructive">Motivo: {x.cancelReason}</p>}
      <ExpenseAttachments expense={x} />
      {pending && (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:justify-end">
          <Button variant="outline" className="text-destructive" onClick={onReject} disabled={busy}>
            <X /> Recusar
          </Button>
          <Button onClick={onApprove} loading={busy}>
            <Check /> Aprovar
          </Button>
        </div>
      )}
    </li>
  );
}

/** Comprovantes da despesa (a API devolve a lista junto; quem aprova pode baixar). */
function ExpenseAttachments({ expense: x }: { expense: DriverExpense }) {
  if (x.attachments.length === 0) return <p className="mt-2 text-xs text-muted-foreground">Sem comprovante anexado.</p>;
  return (
    <div className="mt-2">
      <AttachmentsPanel attachments={x.attachments} owner={{ payableId: x.id }} canManage={false} onChange={() => undefined} />
    </div>
  );
}
