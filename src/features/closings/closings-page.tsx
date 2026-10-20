import { CalendarCheck, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { errorMessage } from '@/api/client';
import type { Closing } from '@/api/types';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { formatMonthBR } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { ClosingDetail } from './closing-detail';
import { ClosingStatusBadge } from './closing-status';
import { formatDateTimeBR } from './format';
import { useClosingList } from './use-closings';

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const MIN_YEAR = 2000;
const MAX_YEAR = 2100;

/** Fechamento mensal: situação dos 12 meses do ano e detalhe do mês selecionado (?month=AAAA-MM). */
export function ClosingsPage() {
  const [params, setParams] = useSearchParams();
  const monthParam = params.get('month');
  const month = monthParam && MONTH.test(monthParam) ? monthParam : null;
  const yearParam = Number(params.get('year'));
  const year = month
    ? Number(month.slice(0, 4))
    : Number.isInteger(yearParam) && yearParam >= MIN_YEAR && yearParam <= MAX_YEAR
      ? yearParam
      : new Date().getFullYear();

  function go(next: { year?: number; month?: string | null }) {
    const p = new URLSearchParams(params);
    if (next.year !== undefined) p.set('year', String(next.year));
    if (next.month) p.set('month', next.month);
    else if (next.month === null) p.delete('month');
    setParams(p, { replace: next.month === undefined });
  }

  return (
    <>
      <PageHeader title="Fechamento mensal" description="Confira, feche e, se preciso, reabra cada mês." />

      <Card className="mb-4 p-4 text-sm text-muted-foreground">
        <p>
          <strong className="text-foreground">Fechar</strong> grava um retrato dos números do mês e bloqueia alterações em lançamentos daquele mês.{' '}
          <strong className="text-foreground">Reabrir</strong> exige justificativa e fica registrado na auditoria.
        </p>
      </Card>

      {month ? <ClosingDetail month={month} onBack={() => go({ year, month: null })} /> : <YearView year={year} onYear={(y) => go({ year: y })} onOpen={(m) => go({ year, month: m })} />}
    </>
  );
}

function YearView({ year, onYear, onOpen }: { year: number; onYear: (y: number) => void; onOpen: (month: string) => void }) {
  const list = useClosingList(year);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="icon" aria-label="Ano anterior" disabled={year <= MIN_YEAR} onClick={() => onYear(year - 1)}>
          <ChevronLeft />
        </Button>
        <h2 className="text-lg font-semibold tabular-nums" aria-live="polite">
          {year}
        </h2>
        <Button variant="ghost" size="icon" aria-label="Próximo ano" disabled={year >= MAX_YEAR} onClick={() => onYear(year + 1)}>
          <ChevronRight />
        </Button>
      </div>

      {list.isPending ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 12 }, (_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : list.isError ? (
        <Card className="space-y-3 p-4">
          <p className="text-sm text-destructive">{errorMessage(list.error)}</p>
          <Button variant="outline" size="sm" onClick={() => list.refetch()}>
            <RefreshCw /> Tentar de novo
          </Button>
        </Card>
      ) : !list.data?.items.length ? (
        <EmptyState icon={CalendarCheck} title="Nenhum mês para mostrar" description="Não há informações de fechamento para este ano." />
      ) : (
        <ul className={cn('grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4', list.isFetching && 'opacity-70')}>
          {list.data.items.map((c) => (
            <li key={c.month}>
              <MonthCard closing={c} onOpen={() => onOpen(c.month)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MonthCard({ closing: c, onOpen }: { closing: Closing; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'flex h-full w-full flex-col gap-2 rounded-xl border bg-card p-4 text-left shadow-sm transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        c.status === 'REOPENED' && 'border-warning/40',
      )}
    >
      <div className="flex w-full items-center justify-between gap-2">
        <span className="inline-block font-medium first-letter:uppercase">{formatMonthBR(c.month, true)}</span>
        <ClosingStatusBadge closing={c} />
      </div>
      <div className="min-w-0 text-xs text-muted-foreground">
        {c.status === 'CLOSED' ? (
          <p className="truncate">
            por {c.closedBy?.name ?? '—'} · {formatDateTimeBR(c.closedAt)}
          </p>
        ) : c.status === 'REOPENED' ? (
          <>
            <p className="truncate">
              por {c.reopenedBy?.name ?? '—'} · {formatDateTimeBR(c.reopenedAt)}
            </p>
            {c.reopenReason && <p className="line-clamp-2 break-words">Motivo: {c.reopenReason}</p>}
          </>
        ) : c.closable ? (
          <p>Pronto para fechar</p>
        ) : (
          <p>O mês ainda não terminou</p>
        )}
      </div>
    </button>
  );
}
