import { ArrowLeft, Eye, FileSpreadsheet, FileText, Lock, LockOpen, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ApiError, errorMessage, http } from '@/api/client';
import type { ClosingDetail as ClosingDetailData } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ReasonDialog } from '@/features/finance/reason-dialog';
import { useAuth } from '@/lib/auth';
import { formatMonthBR } from '@/lib/dates';
import { ClosingStatusBadge } from './closing-status';
import { formatDateTimeBR } from './format';
import { SnapshotView } from './snapshot-view';
import { downloadClosing, useClosingDetail, useClosingPreview, useInvalidateClosings } from './use-closings';

/** Detalhe de um mês: snapshot gravado (fechado) ou prévia + confirmação (aberto/reaberto). */
export function ClosingDetail({ month, onBack }: { month: string; onBack: () => void }) {
  const { can } = useAuth();
  const canManage = can('closing:manage');
  const canReopen = can('closing:reopen');
  const detail = useClosingDetail(month);
  const [showPreview, setShowPreview] = useState(false);
  const data = detail.data;
  const previewEnabled = showPreview && !!data && data.status !== 'CLOSED' && data.closable && canManage;
  const preview = useClosingPreview(month, previewEnabled);
  const invalidate = useInvalidateClosings();
  const [confirming, setConfirming] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [exporting, setExporting] = useState<'pdf' | 'xlsx' | null>(null);

  useEffect(() => setShowPreview(false), [month]);

  async function exportAs(format: 'pdf' | 'xlsx') {
    setExporting(format);
    try {
      await downloadClosing(month, format);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setExporting(null);
    }
  }

  async function confirmClose(current: ClosingDetailData) {
    try {
      await http.post(`/closings/${month}`, { expectedVersion: current.version });
      toast.success(`Mês ${formatMonthBR(month, true)} fechado. Lançamentos bloqueados.`);
      setShowPreview(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        toast.error(`${errorMessage(err)} Os dados foram atualizados.`);
      } else {
        toast.error(errorMessage(err));
      }
    } finally {
      await invalidate();
    }
  }

  async function reopen(reason: string) {
    try {
      await http.post(`/closings/${month}/reopen`, { reason });
      toast.success(`Mês ${formatMonthBR(month, true)} reaberto.`);
    } catch (err) {
      toast.error(errorMessage(err));
      if (err instanceof ApiError && (err.status === 409 || err.status === 422)) await invalidate();
      throw err;
    }
    await invalidate();
  }

  const title = <span className="inline-block first-letter:uppercase">{formatMonthBR(month, true)}</span>;

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" className="-ml-2" onClick={onBack}>
        <ArrowLeft /> Voltar para {month.slice(0, 4)}
      </Button>

      {detail.isPending ? (
        <div className="space-y-3">
          <Skeleton className="h-24" />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
          <Skeleton className="h-40" />
        </div>
      ) : detail.isError ? (
        <Card className="space-y-3 p-4">
          <p className="text-sm text-destructive">{errorMessage(detail.error)}</p>
          <Button variant="outline" size="sm" onClick={() => detail.refetch()}>
            <RefreshCw /> Tentar de novo
          </Button>
        </Card>
      ) : data ? (
        <>
          <Card className="space-y-3 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-semibold">{title}</h2>
                  <ClosingStatusBadge closing={data} />
                </div>
                {data.status === 'CLOSED' && (
                  <p className="text-sm text-muted-foreground">
                    Fechado por {data.closedBy?.name ?? '—'} em {formatDateTimeBR(data.closedAt)} · versão {data.version}
                  </p>
                )}
                {data.status === 'OPEN' && (
                  <p className="text-sm text-muted-foreground">{data.closable ? 'Mês encerrado e ainda não fechado.' : 'O mês ainda não terminou, então não pode ser fechado.'}</p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {data.status === 'CLOSED' && (
                  <>
                    <Button variant="outline" size="sm" loading={exporting === 'pdf'} disabled={!!exporting} onClick={() => exportAs('pdf')}>
                      <FileText /> PDF
                    </Button>
                    <Button variant="outline" size="sm" loading={exporting === 'xlsx'} disabled={!!exporting} onClick={() => exportAs('xlsx')}>
                      <FileSpreadsheet /> Excel
                    </Button>
                    {canReopen && (
                      <Button variant="outline" size="sm" onClick={() => setReopening(true)}>
                        <LockOpen /> Reabrir
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>

            {data.status === 'REOPENED' && (
              <div className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm">
                <p className="font-medium text-warning">
                  Reaberto por {data.reopenedBy?.name ?? '—'} em {formatDateTimeBR(data.reopenedAt)}
                </p>
                {data.reopenReason && <p className="mt-1 break-words">Motivo: “{data.reopenReason}”</p>}
                <p className="mt-1 text-xs text-muted-foreground">
                  Último fechamento: versão {data.version}
                  {data.closedAt ? `, em ${formatDateTimeBR(data.closedAt)}` : ''}
                  {data.closedBy ? ` por ${data.closedBy.name}` : ''}. Os lançamentos do mês voltaram a aceitar alterações.
                </p>
              </div>
            )}
          </Card>

          {data.status === 'CLOSED' ? (
            data.snapshot ? (
              <SnapshotView
                variant="stored"
                snapshot={data.snapshot}
                banner={
                  <>
                    <span className="font-medium text-foreground">Valores gravados no fechamento em {formatDateTimeBR(data.snapshot.generatedAt)}.</span> Lançamentos deste mês estão
                    bloqueados até uma reabertura.
                  </>
                }
              />
            ) : (
              <p className="text-sm text-muted-foreground">Este fechamento não tem valores gravados.</p>
            )
          ) : !data.closable ? (
            <Card className="p-4 text-sm text-muted-foreground">O mês ainda não terminou. O fechamento fica disponível a partir do primeiro dia do mês seguinte.</Card>
          ) : !canManage ? (
            <Card className="p-4 text-sm text-muted-foreground">Mês em aberto. Só quem tem permissão de fechamento pode ver a prévia e fechar o mês.</Card>
          ) : !showPreview ? (
            <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">Confira os números antes de fechar. A prévia é calculada agora e não grava nada.</p>
              <Button onClick={() => setShowPreview(true)}>
                <Eye /> Ver prévia
              </Button>
            </Card>
          ) : preview.isPending ? (
            <div className="space-y-3">
              <Skeleton className="h-10" />
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </div>
              <Skeleton className="h-40" />
            </div>
          ) : preview.isError ? (
            <Card className="space-y-3 p-4">
              <p className="text-sm text-destructive">{errorMessage(preview.error)}</p>
              <Button variant="outline" size="sm" onClick={() => preview.refetch()}>
                <RefreshCw /> Tentar de novo
              </Button>
            </Card>
          ) : preview.data ? (
            <>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
                <Button variant="outline" loading={preview.isFetching} onClick={() => preview.refetch()}>
                  <RefreshCw /> Atualizar prévia
                </Button>
                <Button onClick={() => setConfirming(true)} disabled={preview.isFetching}>
                  <Lock /> Confirmar fechamento
                </Button>
              </div>
              <SnapshotView
                variant="preview"
                snapshot={preview.data}
                banner={
                  <>
                    <span className="font-medium">Prévia — nada foi gravado ainda.</span> Calculada em {formatDateTimeBR(preview.data.generatedAt)}.
                  </>
                }
              />
            </>
          ) : null}

          <ConfirmDialog
            open={confirming}
            onOpenChange={setConfirming}
            title={`Fechar ${formatMonthBR(month, true)}?`}
            confirmLabel="Fechar o mês"
            description={
              <>
                Os valores da prévia serão gravados como retrato do mês e <strong>todos os lançamentos do mês ficam bloqueados</strong>: qualquer inclusão, edição,
                baixa ou estorno com data deste mês será recusada até alguém reabrir o mês com justificativa.
                {preview.data && preview.data.warnings.length > 0 && <span className="mt-2 block text-warning">Há {preview.data.warnings.length} aviso(s) na prévia.</span>}
              </>
            }
            onConfirm={() => confirmClose(data)}
          />
          <ReasonDialog
            open={reopening}
            onOpenChange={setReopening}
            title={`Reabrir ${formatMonthBR(month, true)}?`}
            description="Os lançamentos do mês voltam a aceitar alterações. A reabertura fica registrada na auditoria com o fechamento anterior e a justificativa."
            confirmLabel="Reabrir mês"
            minLength={10}
            onConfirm={reopen}
          />
        </>
      ) : null}
    </div>
  );
}
