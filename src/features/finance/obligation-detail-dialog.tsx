import { useQuery } from '@tanstack/react-query';
import { Ban, CheckCircle2, Pencil, Repeat, Undo2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { errorMessage, http } from '@/api/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/auth';
import { formatDateBR, formatMonthBR } from '@/lib/dates';
import { formatBRL } from '@/lib/money';
import { AttachmentsPanel } from './attachments';
import { ALLOCATION_METHOD_LABELS, PAYMENT_METHOD_LABELS } from './labels';
import { ObligationFormDialog } from './obligation-form-dialog';
import { ObligationStatus } from './obligation-status';
import { ReasonDialog } from './reason-dialog';
import { SettleDialog } from './settle-dialog';
import { settledOf, type ObligationDetail, type SideConfig } from './sides';
import { useInvalidateFinance } from './use-finance';

const PERCENT = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 4 });

/** "33.333333" → "33,3333%" (participação calculada pela API; só formatamos). */
function formatPercent(value: string): string {
  return `${PERCENT.format(Number(value))}%`;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  );
}

export function ObligationDetailDialog({ config, id, onClose }: { config: SideConfig; id: string | null; onClose: () => void }) {
  const { can } = useAuth();
  const canManage = can('finance:manage');
  const invalidate = useInvalidateFinance();
  const detail = useQuery({ queryKey: [config.side, 'detail', id], queryFn: () => http.get<ObligationDetail>(`${config.path}/${id}`), enabled: !!id });
  const [settling, setSettling] = useState(false);
  const [editing, setEditing] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [cancelScope, setCancelScope] = useState<'ONE' | 'THIS_AND_FUTURE'>('ONE');
  const [reversing, setReversing] = useState<string | null>(null);
  const d = detail.data;
  const isOpen = d && d.status !== 'CANCELED' && Number(d.openAmount) > 0;
  const activeSettlements = d?.settlements.filter((s) => !s.reversedAt) ?? [];
  const split = d?.allocations.filter((a) => a.method !== 'DIRECT') ?? [];

  return (
    <>
      <Dialog open={!!id && !settling && !editing && !canceling && !reversing} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="pr-6">{d?.description ?? 'Carregando…'}</DialogTitle>
          </DialogHeader>
          {detail.isPending ? (
            <Skeleton className="h-64" />
          ) : detail.isError ? (
            <p className="text-sm text-destructive">{errorMessage(detail.error)}</p>
          ) : d ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <ObligationStatus item={d} config={config} />
                {d.kind === 'INSTALLMENT' && <Badge variant="outline">Parcela {d.installmentNumber}/{d.installmentCount}</Badge>}
                {d.kind === 'RECURRING' && (
                  <Badge variant="outline">
                    <Repeat className="size-3" /> Recorrente
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/60 p-3 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">Valor</p>
                  <p className="font-semibold tabular-nums">{formatBRL(d.amount)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{config.settledLabel}</p>
                  <p className="font-semibold tabular-nums text-primary">{formatBRL(settledOf(d))}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Em aberto</p>
                  <p className="font-semibold tabular-nums">{formatBRL(d.openAmount)}</p>
                </div>
              </div>

              <div className="divide-y">
                <Row label="Categoria">{d.category.name}</Row>
                <Row label="Competência">{formatMonthBR(d.competence, true)}</Row>
                <Row label="Vencimento">{formatDateBR(d.dueDate)}</Row>
                <Row label="Veículo">
                  {split.length ? `Dividido entre ${split.length} veículos` : d.vehicle ? `${d.vehicle.name} · ${d.vehicle.plate}` : 'Empresa (sem veículo)'}
                </Row>
                {'supplierName' in d && d.supplierName && <Row label="Fornecedor">{d.supplierName}</Row>}
                {d.notes && <Row label="Observações">{d.notes}</Row>}
                {d.cancelReason && <Row label="Motivo do cancelamento">{d.cancelReason}</Row>}
              </div>

              {split.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Rateio · {ALLOCATION_METHOD_LABELS[split[0].method]}</h4>
                  <ul className="divide-y rounded-lg border">
                    {split.map((a, i) => (
                      <li key={a.vehicle?.id ?? i} className="flex items-center gap-3 px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{a.vehicle ? a.vehicle.name : 'Veículo removido'}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {a.vehicle?.plate ? `${a.vehicle.plate} · ` : ''}
                            {ALLOCATION_METHOD_LABELS[a.method]} · {formatPercent(a.percent)}
                          </p>
                        </div>
                        <span className="text-sm font-semibold tabular-nums">{formatBRL(a.amount)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="space-y-2">
                <h4 className="text-sm font-medium">{config.side === 'payables' ? 'Pagamentos' : 'Recebimentos'}</h4>
                {d.settlements.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum ainda.</p>
                ) : (
                  <ul className="divide-y rounded-lg border">
                    {d.settlements.map((s) => (
                      <li key={s.id} className="flex items-center gap-3 px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <p className={s.reversedAt ? 'text-sm tabular-nums line-through text-muted-foreground' : 'text-sm font-medium tabular-nums'}>
                            {formatBRL(s.amount)} · {formatDateBR(s.settledAt)}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {PAYMENT_METHOD_LABELS[s.method]} · {s.account.name}
                            {s.reversedAt ? ` · estornado: ${s.reversalReason}` : ''}
                          </p>
                        </div>
                        {canManage && !s.reversedAt && (
                          <Button size="sm" variant="ghost" onClick={() => setReversing(s.id)}>
                            <Undo2 /> Estornar
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <AttachmentsPanel
                attachments={d.attachments}
                owner={config.side === 'payables' ? { payableId: d.id } : { receivableId: d.id }}
                canManage={canManage}
                onChange={() => void invalidate()}
              />

              {canManage && d.status !== 'CANCELED' && (
                <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
                  <Button variant="ghost" className="text-destructive" onClick={() => setCanceling(true)}>
                    <Ban /> Cancelar lançamento
                  </Button>
                  <Button variant="outline" onClick={() => setEditing(true)}>
                    <Pencil /> Editar
                  </Button>
                  {isOpen && (
                    <Button onClick={() => setSettling(true)}>
                      <CheckCircle2 /> {config.settleLabel}
                    </Button>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <SettleDialog config={config} target={settling && d ? d : null} onClose={() => setSettling(false)} />
      <ObligationFormDialog config={config} open={editing} onOpenChange={setEditing} editing={d} />
      <ReasonDialog
        open={!!reversing}
        onOpenChange={(o) => !o && setReversing(null)}
        title="Estornar lançamento?"
        description="O valor volta para a conta com um lançamento de estorno. Nada é apagado e o saldo em aberto é reaberto."
        confirmLabel="Estornar"
        onConfirm={async (reason) => {
          try {
            await http.post(`/settlements/${reversing}/reverse`, { reason });
            await invalidate();
            toast.success('Estorno registrado');
          } catch (e) {
            toast.error(errorMessage(e));
            throw e;
          }
        }}
      />
      <ReasonDialog
        open={canceling}
        onOpenChange={setCanceling}
        minLength={3}
        title={`Cancelar ${config.singular}?`}
        description={
          activeSettlements.length > 0
            ? 'Este lançamento tem pagamentos/recebimentos ativos. Estorne-os antes de cancelar.'
            : 'O lançamento continua no histórico como cancelado e deixa de contar nos totais.'
        }
        confirmLabel="Cancelar lançamento"
        onConfirm={async (reason) => {
          try {
            await http.post(`${config.path}/${d!.id}/cancel`, { reason, scope: cancelScope });
            await invalidate();
            toast.success('Lançamento cancelado');
          } catch (e) {
            toast.error(errorMessage(e));
            throw e;
          }
        }}
      >
        {d && d.kind !== 'SINGLE' && (
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-[var(--primary)]"
              checked={cancelScope === 'THIS_AND_FUTURE'}
              onChange={(e) => setCancelScope(e.target.checked ? 'THIS_AND_FUTURE' : 'ONE')}
            />
            {d.kind === 'RECURRING' ? 'Cancelar também os próximos meses e encerrar a recorrência' : 'Cancelar também as próximas parcelas em aberto'}
          </label>
        )}
      </ReasonDialog>
    </>
  );
}
