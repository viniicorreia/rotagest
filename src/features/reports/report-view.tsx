import { ArrowDownRight, ArrowRight, ArrowUpRight, FileBarChart, Info } from 'lucide-react';
import type { Report, ReportColumn, ReportSection } from '@/api/types';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { type CellValue, formatCell, formatPeriod, isNegativeCell, isNumericColumn, trend } from './format';
import { REGIME_LABELS } from './use-reports';

type Cells = Record<string, string | number | null | undefined>;

/** Relatório já calculado pela API: cabeçalho, comparativo, seções e notas. */
export function ReportView({ report, fetching }: { report: Report; fetching?: boolean }) {
  const hasRows = report.sections.some((s) => s.rows.length > 0);
  const filters = Object.entries(report.filters);

  return (
    <div className={cn('min-w-0 space-y-4 transition-opacity', fetching && 'opacity-70')}>
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold leading-tight">{report.title}</h2>
          <Badge variant="secondary">{REGIME_LABELS[report.regime]}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">Período: {formatPeriod(report.from, report.to)}</p>
        {filters.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {filters.map(([label, value]) => (
              <Badge key={label} variant="outline" className="max-w-full">
                <span className="text-muted-foreground">{label}:</span> <span className="truncate">{value}</span>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {report.comparison && report.sections[0] && <Comparison report={report} section={report.sections[0]} />}

      {hasRows ? (
        report.sections.map((s, i) => <SectionTable key={`${i}-${s.title}`} section={s} />)
      ) : (
        <EmptyState icon={FileBarChart} title="Nada no período" description="Não há lançamentos para o período e os filtros escolhidos." />
      )}

      {report.notes.length > 0 && (
        <ul className="space-y-1.5 rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
          {report.notes.map((n) => (
            <li key={n} className="flex gap-2">
              <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              <span>{n}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Totais atuais × totais do período anterior, ambos vindos da API. */
function Comparison({ report, section }: { report: Report; section: ReportSection }) {
  const comparison = report.comparison!;
  const columns = section.columns.filter((c) => c.sum);
  if (!columns.length) return null;
  const current = (section.totals ?? {}) as Cells;
  const previous = comparison.totals as Cells;

  return (
    <Card className="p-3 md:p-4">
      <p className="mb-3 text-xs text-muted-foreground">
        Comparativo: {formatPeriod(report.from, report.to)} × {formatPeriod(comparison.from, comparison.to)}
      </p>
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {columns.map((c) => {
          const dir = trend(current[c.key], previous[c.key]);
          const Arrow = dir === 'up' ? ArrowUpRight : dir === 'down' ? ArrowDownRight : ArrowRight;
          return (
            <div key={c.key} className="min-w-0 rounded-lg border p-3">
              <dt className="truncate text-xs text-muted-foreground">{c.label}</dt>
              <dd className="mt-1 flex items-center gap-1.5">
                <Value column={c} value={current[c.key]} className="truncate text-base font-semibold" />
                {dir && <Arrow className="size-4 shrink-0 text-muted-foreground" aria-label={dir === 'up' ? 'Maior que o anterior' : dir === 'down' ? 'Menor que o anterior' : 'Igual ao anterior'} />}
              </dd>
              <dd className="mt-0.5 flex min-w-0 gap-1 text-xs text-muted-foreground">
                <span className="shrink-0">Anterior:</span>
                <Value column={c} value={previous[c.key]} className="truncate" />
              </dd>
            </div>
          );
        })}
      </dl>
    </Card>
  );
}

function Value({ column, value, className }: { column: ReportColumn; value: CellValue; className?: string }) {
  return <span className={cn('tabular-nums', isNegativeCell(column.type, value) && 'text-destructive', className)}>{formatCell(column.type, value)}</span>;
}

/** Celular: cartões (primeira coluna de texto como título). Desktop: tabela com rolagem própria. */
function SectionTable({ section }: { section: ReportSection }) {
  const { columns } = section;
  const rows = section.rows as Cells[];
  const totals = section.totals as Cells | null;
  const titleCol = columns.find((c) => c.type === 'text') ?? columns[0];
  const detailCols = columns.filter((c) => c !== titleCol);

  return (
    <section className="min-w-0 space-y-2">
      <h3 className="text-sm font-semibold">{section.title}</h3>
      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">Sem lançamentos nesta seção.</p>
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y md:hidden">
            {rows.map((r, i) => (
              <MobileRow key={i} row={r} titleCol={titleCol} detailCols={detailCols} />
            ))}
            {totals && <MobileRow row={totals} titleCol={titleCol} detailCols={detailCols.filter((c) => totals[c.key] != null)} total />}
          </ul>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  {columns.map((c) => (
                    <th key={c.key} scope="col" className={cn('whitespace-nowrap px-4 py-2 font-medium', isNumericColumn(c.type) ? 'text-right' : 'text-left')}>
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((r, i) => (
                  <tr key={i}>
                    {columns.map((c) => (
                      <Td key={c.key} column={c} value={r[c.key]} />
                    ))}
                  </tr>
                ))}
              </tbody>
              {totals && (
                <tfoot className="border-t-2 bg-muted/30 font-semibold">
                  <tr>
                    {columns.map((c) => (
                      <Td key={c.key} column={c} value={totals[c.key]} blankIfEmpty />
                    ))}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </Card>
      )}
    </section>
  );
}

function Td({ column, value, blankIfEmpty }: { column: ReportColumn; value: CellValue; blankIfEmpty?: boolean }) {
  const empty = value === null || value === undefined || value === '';
  return (
    <td
      className={cn(
        'px-4 py-2.5',
        isNumericColumn(column.type) ? 'whitespace-nowrap text-right tabular-nums' : column.type === 'text' ? 'max-w-[20rem]' : 'whitespace-nowrap',
        isNegativeCell(column.type, value) && 'text-destructive',
      )}
    >
      {blankIfEmpty && empty ? '' : formatCell(column.type, value)}
    </td>
  );
}

function MobileRow({ row, titleCol, detailCols, total }: { row: Cells; titleCol: ReportColumn; detailCols: ReportColumn[]; total?: boolean }) {
  return (
    <li className={cn('space-y-2 px-4 py-3', total && 'bg-muted/30')}>
      <p className={cn('break-words text-sm', total ? 'font-semibold' : 'font-medium')}>{formatCell(titleCol.type, row[titleCol.key] ?? (total ? 'Total' : null))}</p>
      {detailCols.length > 0 && (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
          {detailCols.map((c) => (
            <div key={c.key} className="flex min-w-0 flex-col">
              <dt className="truncate text-muted-foreground">{c.label}</dt>
              <dd className={cn('break-words text-sm tabular-nums', total && 'font-semibold', isNegativeCell(c.type, row[c.key]) && 'text-destructive')}>
                {formatCell(c.type, row[c.key])}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </li>
  );
}

export function ReportSkeleton() {
  return (
    <div className="space-y-4" aria-busy aria-label="Carregando relatório">
      <Skeleton className="h-7 w-56" />
      <Skeleton className="h-4 w-40" />
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-24" />
      ))}
    </div>
  );
}
