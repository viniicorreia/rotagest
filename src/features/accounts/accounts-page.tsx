import { useQuery } from '@tanstack/react-query';
import { ArrowLeftRight, Landmark, MoreVertical, Pencil, Plus, Scale, Undo2, Wallet } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { errorMessage, http } from '@/api/client';
import type { Account, Transfer } from '@/api/types';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/ui/empty-state';
import { Fab } from '@/components/ui/fab';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/ui/stat-card';
import { useAuth } from '@/lib/auth';
import { formatDateBR, shiftMonth, currentMonth, todayISO } from '@/lib/dates';
import { formatBRL, isNegative } from '@/lib/money';
import { cn } from '@/lib/utils';
import { ReasonDialog } from '../finance/reason-dialog';
import { ACCOUNT_TYPE_LABELS } from '../finance/labels';
import { useAccounts, useInvalidateFinance } from '../finance/use-finance';
import { AccountFormDialog, AdjustmentDialog, TransferDialog } from './account-dialogs';

export function AccountsPage() {
  const { can } = useAuth();
  const canManage = can('accounts:manage');
  const canAdjust = can('accounts:adjust');
  const accounts = useAccounts(true);
  const invalidate = useInvalidateFinance();
  const transfersFrom = `${shiftMonth(currentMonth(), -2)}-01`;
  const transfers = useQuery({ queryKey: ['transfers', transfersFrom], queryFn: () => http.get<Transfer[]>(`/transfers?from=${transfersFrom}&to=${todayISO()}`) });

  const [form, setForm] = useState<{ open: boolean; editing?: Account }>({ open: false });
  const [transfer, setTransfer] = useState<{ open: boolean; from?: string }>({ open: false });
  const [adjusting, setAdjusting] = useState<Account | null>(null);
  const [reversing, setReversing] = useState<Transfer | null>(null);

  const active = accounts.data?.items.filter((a) => a.status === 'ACTIVE') ?? [];
  const inactive = accounts.data?.items.filter((a) => a.status !== 'ACTIVE') ?? [];

  return (
    <>
      <PageHeader
        title="Contas"
        description="Saldo real = saldo inicial + recebimentos − pagamentos ± transferências e ajustes."
        actions={
          canManage && (
            <>
              <Button variant="outline" onClick={() => setTransfer({ open: true })} disabled={active.length < 2}>
                <ArrowLeftRight /> Transferir
              </Button>
              <Button className="hidden md:inline-flex" onClick={() => setForm({ open: true })}>
                <Plus /> Nova conta
              </Button>
            </>
          )
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Saldo total hoje" icon={Wallet} value={formatBRL(accounts.data?.totalBalance)} tone={accounts.data && isNegative(accounts.data.totalBalance) ? 'negative' : 'default'} loading={accounts.isPending} />
        <StatCard label="Contas ativas" icon={Landmark} value={active.length} loading={accounts.isPending} />
      </div>

      {accounts.isPending ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : accounts.isError ? (
        <p className="text-sm text-destructive">{errorMessage(accounts.error)}</p>
      ) : !accounts.data.items.length ? (
        <EmptyState
          icon={Landmark}
          title="Nenhuma conta cadastrada"
          description="Cadastre o banco ou o caixa da empresa para registrar pagamentos e recebimentos."
          action={
            canManage && (
              <Button onClick={() => setForm({ open: true })}>
                <Plus /> Nova conta
              </Button>
            )
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[...active, ...inactive].map((a) => (
            <Card key={a.id} className={cn('relative p-4 transition-colors hover:bg-muted/40', a.status !== 'ACTIVE' && 'opacity-60')}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link to={`/app/accounts/${a.id}`} className="block truncate font-semibold after:absolute after:inset-0">
                    {a.name}
                  </Link>
                  <p className="truncate text-xs text-muted-foreground">
                    {ACCOUNT_TYPE_LABELS[a.type]}
                    {a.bankName ? ` · ${a.bankName}` : ''}
                  </p>
                </div>
                {a.status !== 'ACTIVE' && <Badge variant="secondary">Inativa</Badge>}
                {(canManage || canAdjust) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost" className="relative z-10 -mr-2 -mt-2" aria-label={`Ações de ${a.name}`}>
                        <MoreVertical />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {canManage && (
                        <DropdownMenuItem onSelect={() => setForm({ open: true, editing: a })}>
                          <Pencil /> Editar
                        </DropdownMenuItem>
                      )}
                      {canManage && a.status === 'ACTIVE' && (
                        <DropdownMenuItem onSelect={() => setTransfer({ open: true, from: a.id })}>
                          <ArrowLeftRight /> Transferir daqui
                        </DropdownMenuItem>
                      )}
                      {canAdjust && a.status === 'ACTIVE' && (
                        <DropdownMenuItem onSelect={() => setAdjusting(a)}>
                          <Scale /> Ajustar saldo
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              <p className={cn('mt-3 text-2xl font-semibold tabular-nums', isNegative(a.balance) && 'text-destructive')}>{formatBRL(a.balance)}</p>
            </Card>
          ))}
        </div>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Transferências recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {transfers.isPending ? (
            <Skeleton className="h-16" />
          ) : !transfers.data?.length ? (
            <p className="text-sm text-muted-foreground">Nenhuma transferência nos últimos três meses.</p>
          ) : (
            <ul className="divide-y">
              {transfers.data.map((t) => (
                <li key={t.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className={cn('truncate text-sm font-medium', t.reversedAt && 'line-through opacity-60')}>
                      {t.fromAccountName} → {t.toAccountName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatDateBR(t.transferredAt)}
                      {t.description ? ` · ${t.description}` : ''}
                    </p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums">{formatBRL(t.amount)}</span>
                  {t.reversedAt ? (
                    <Badge variant="secondary">Estornada</Badge>
                  ) : (
                    canManage && (
                      <Button size="icon" variant="ghost" aria-label="Estornar transferência" onClick={() => setReversing(t)}>
                        <Undo2 />
                      </Button>
                    )
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {canManage && <Fab icon={Plus} label="Nova conta" onClick={() => setForm({ open: true })} />}
      <AccountFormDialog open={form.open} editing={form.editing} onOpenChange={(open) => setForm((f) => ({ ...f, open }))} />
      <TransferDialog open={transfer.open} fromAccountId={transfer.from} onOpenChange={(open) => setTransfer((t) => ({ ...t, open }))} />
      <AdjustmentDialog account={adjusting} onClose={() => setAdjusting(null)} />
      <ReasonDialog
        open={!!reversing}
        onOpenChange={(o) => !o && setReversing(null)}
        title="Estornar transferência?"
        description={reversing ? `${formatBRL(reversing.amount)} volta de ${reversing.toAccountName} para ${reversing.fromAccountName} com data de hoje. O lançamento original continua no extrato.` : ''}
        confirmLabel="Estornar"
        onConfirm={async (reason) => {
          try {
            await http.post(`/transfers/${reversing!.id}/reverse`, { reason });
            await invalidate();
            toast.success('Transferência estornada');
          } catch (e) {
            toast.error(errorMessage(e));
            throw e;
          }
        }}
      />
    </>
  );
}
