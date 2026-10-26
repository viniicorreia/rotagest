import { Pencil } from 'lucide-react';
import { errorMessage } from '@/api/client';
import type { Contract, ContractDetail } from '@/api/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateBR, formatMonthBR } from '@/lib/dates';
import { formatBRL } from '@/lib/money';
import { SIDES } from '../finance/sides';
import { formatPlate } from '../vehicles/vehicles-page';
import { ContractStatusBadge } from './contract-status-badge';
import { BILLING_TYPE_LABELS, STATUS_ACTION_LABELS, STATUS_TRANSITIONS, useContract, type StatusChange } from './use-contracts';

const RECEIVABLE_LABELS = SIDES.receivables.statusLabels;

function ReceivableBadge({ status }: { status: string }) {
  const variant = status === 'RECEIVED' ? 'default' : status === 'PARTIALLY_RECEIVED' ? 'warning' : status === 'CANCELED' ? 'outline' : 'secondary';
  return <Badge variant={variant}>{RECEIVABLE_LABELS[status] ?? status}</Badge>;
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="truncate text-sm font-medium">{children}</dd>
    </div>
  );
}

const OFFSET_TEXT = ['no mesmo mês', 'no mês seguinte', '2 meses depois', '3 meses depois'];

export function ContractDetailDialog({
  id,
  onClose,
  canManage,
  onEdit,
  onStatus,
}: {
  id: string | null;
  onClose: () => void;
  canManage: boolean;
  onEdit: (c: Contract) => void;
  onStatus: (c: Contract, status: StatusChange) => void;
}) {
  const detail = useContract(id);
  const c: ContractDetail | undefined = detail.data;

  return (
    <Dialog open={!!id} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="truncate">{c ? c.contractor.name : 'Contrato'}</DialogTitle>
          <DialogDescription>{c ? [c.number ? `Nº ${c.number}` : null, c.description].filter(Boolean).join(' · ') || 'Contrato de transporte' : 'Carregando…'}</DialogDescription>
        </DialogHeader>

        {detail.isPending ? (
          <div className="space-y-2">
            <Skeleton className="h-20" />
            <Skeleton className="h-40" />
          </div>
        ) : detail.isError ? (
          <p className="text-sm text-destructive">{errorMessage(detail.error)}</p>
        ) : c ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <ContractStatusBadge status={c.status} />
              <Badge variant="outline">{BILLING_TYPE_LABELS[c.billingType]}</Badge>
            </div>

            {c.status === 'DRAFT' && (
              <p className="rounded-lg bg-accent p-3 text-sm text-accent-foreground">
                {c.billingType === 'VARIABLE'
                  ? 'Rascunho. Contrato variável não gera contas sozinho: o faturamento é feito por km ou manualmente.'
                  : 'Rascunho. Ao ativar, as contas a receber mensais são geradas automaticamente, do início do contrato até o mês que vem; os meses seguintes são gerados conforme o tempo passa.'}
              </p>
            )}

            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Info label={c.billingType === 'VARIABLE' ? 'Valor de referência' : 'Valor mensal'}>
                <span className="tabular-nums">{formatBRL(c.amount)}</span>
              </Info>
              <Info label="Vigência">
                {formatDateBR(c.startDate)}
                {c.endDate ? ` a ${formatDateBR(c.endDate)}` : ' em diante'}
              </Info>
              <Info label="Vencimento">
                {c.dueDay ? `Dia ${c.dueDay}, ${OFFSET_TEXT[c.dueMonthOffset] ?? `${c.dueMonthOffset} meses depois`}` : '—'}
              </Info>
              <Info label="Categoria de receita">{c.revenueCategory?.name ?? 'Contratos'}</Info>
              <Info label="Rotas">{c.routes.length ? c.routes.map((r) => r.name).join(', ') : '—'}</Info>
            </dl>

            {c.vehicles.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs text-muted-foreground">Veículos</p>
                <ul className="flex flex-wrap gap-1.5">
                  {c.vehicles.map((v) => (
                    <li key={v.vehicle.id}>
                      <Badge variant="secondary">
                        {v.vehicle.name} · {formatPlate(v.vehicle.plate)}
                        {v.sharePercent ? ` · ${v.sharePercent.replace('.', ',')}%` : ''}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {canManage && (c.status !== 'ENDED' && c.status !== 'CANCELED') && (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => onEdit(c)}>
                  <Pencil /> Editar
                </Button>
                {STATUS_TRANSITIONS[c.status].map((s) => (
                  <Button key={s} size="sm" variant={s === 'ACTIVE' ? 'default' : s === 'CANCELED' ? 'destructive' : 'outline'} onClick={() => onStatus(c, s)}>
                    {STATUS_ACTION_LABELS[s]}
                  </Button>
                ))}
              </div>
            )}

            <div>
              <p className="mb-2 text-sm font-semibold">Contas a receber geradas</p>
              {!c.receivables.length ? (
                <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                  {c.status === 'DRAFT' ? 'Nenhuma conta ainda: elas são geradas ao ativar.' : 'Nenhuma conta a receber gerada para este contrato.'}
                </p>
              ) : (
                <div className="overflow-hidden rounded-lg border">
                  <ul className="divide-y sm:hidden">
                    {c.receivables.map((r) => (
                      <li key={r.id} className="flex items-center gap-3 px-3 py-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium capitalize">{formatMonthBR(r.competence)}</p>
                          <p className="text-xs tabular-nums text-muted-foreground">
                            vence {formatDateBR(r.dueDate)}
                            {Number(r.receivedAmount) > 0 ? ` · recebido ${formatBRL(r.receivedAmount)}` : ''}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-sm font-semibold tabular-nums">{formatBRL(r.amount)}</span>
                          <ReceivableBadge status={r.status} />
                        </div>
                      </li>
                    ))}
                  </ul>
                  <table className="hidden w-full text-sm sm:table">
                    <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 font-medium">Competência</th>
                        <th className="px-3 py-2 font-medium">Vencimento</th>
                        <th className="px-3 py-2 text-right font-medium">Valor</th>
                        <th className="px-3 py-2 text-right font-medium">Recebido</th>
                        <th className="px-3 py-2 font-medium">Situação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {c.receivables.map((r) => (
                        <tr key={r.id}>
                          <td className="px-3 py-2 capitalize">{formatMonthBR(r.competence)}</td>
                          <td className="px-3 py-2 tabular-nums">{formatDateBR(r.dueDate)}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{formatBRL(r.amount)}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{formatBRL(r.receivedAmount)}</td>
                          <td className="px-3 py-2">
                            <ReceivableBadge status={r.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="mt-2 text-xs text-muted-foreground">Recebimentos são lançados em Contas a receber.</p>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
