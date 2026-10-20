import {
  ArrowLeftRight,
  CalendarRange,
  ChevronRight,
  Fuel,
  HandCoins,
  type LucideIcon,
  Receipt,
  Route as RouteIcon,
  Tags,
  Truck,
  Wallet,
  Wrench,
  FileBarChart,
  FileDown,
  FileSpreadsheet,
} from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { errorMessage } from '@/api/client';
import type { ReportKey } from '@/api/types';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { NativeSelect } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { currentMonth } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { ReportFilters } from './report-filters';
import { ReportSkeleton, ReportView } from './report-view';
import { ALL_FILTERS, exportReport, type FilterName, type ReportParams, useReport, useReportCatalog } from './use-reports';

const ICONS: Record<ReportKey, LucideIcon> = {
  'cash-flow': ArrowLeftRight,
  'revenue-by-contract': HandCoins,
  'expenses-by-category': Tags,
  'result-by-vehicle': Truck,
  'result-by-route': RouteIcon,
  'result-by-period': CalendarRange,
  payables: Receipt,
  receivables: Wallet,
  fuel: Fuel,
  maintenance: Wrench,
};

const MONTH = /^\d{4}-\d{2}$/;

/**
 * Relatórios gerenciais. Relatório, período e filtros ficam na URL
 * (compartilháveis e preservados ao voltar). Todos os números vêm da API;
 * a tela e as exportações PDF/Excel leem o mesmo relatório.
 */
export function ReportsPage() {
  const [params, setParams] = useSearchParams();
  const catalog = useReportCatalog();
  const items = catalog.data?.items ?? [];

  const keyParam = params.get('report');
  const reportKey = items.find((i) => i.key === keyParam)?.key ?? null;

  const fromParam = params.get('from') ?? '';
  const toParam = params.get('to') ?? '';
  const from = MONTH.test(fromParam) ? fromParam : currentMonth();
  const to = MONTH.test(toParam) && toParam >= from ? toParam : from;
  const filters: ReportParams['filters'] = {};
  for (const f of ALL_FILTERS) {
    const v = params.get(f);
    if (v) filters[f] = v;
  }
  const reportParams: ReportParams = { from, to, compare: params.get('compare') === 'true', filters };

  const report = useReport(reportKey, reportParams);
  const [exporting, setExporting] = useState<'pdf' | 'xlsx' | null>(null);

  function update(changes: Record<string, string | null>) {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    setParams(next, { replace: true });
  }

  function selectReport(key: string) {
    // Troca de relatório mantém período e comparativo; os filtros que não se aplicam não são enviados.
    const next = new URLSearchParams(params);
    if (key) next.set('report', key);
    else next.delete('report');
    setParams(next);
  }

  async function onExport(format: 'pdf' | 'xlsx') {
    if (!reportKey) return;
    setExporting(format);
    try {
      await exportReport(reportKey, reportParams, format);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setExporting(null);
    }
  }

  const exportButtons = reportKey && (
    <div className="flex gap-2">
      <Button variant="outline" className="flex-1 sm:flex-none" loading={exporting === 'pdf'} disabled={!!exporting || !report.data} onClick={() => onExport('pdf')}>
        {exporting !== 'pdf' && <FileDown />} PDF
      </Button>
      <Button variant="outline" className="flex-1 sm:flex-none" loading={exporting === 'xlsx'} disabled={!!exporting || !report.data} onClick={() => onExport('xlsx')}>
        {exporting !== 'xlsx' && <FileSpreadsheet />} Excel
      </Button>
    </div>
  );

  if (catalog.isPending) {
    return (
      <>
        <PageHeader title="Relatórios" description="Números gerenciais da empresa, prontos para exportar." />
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      </>
    );
  }
  if (catalog.isError) {
    return (
      <>
        <PageHeader title="Relatórios" />
        <p className="text-sm text-destructive">{errorMessage(catalog.error)}</p>
      </>
    );
  }
  if (!items.length) {
    return (
      <>
        <PageHeader title="Relatórios" />
        <EmptyState icon={FileBarChart} title="Nenhum relatório disponível" />
      </>
    );
  }

  return (
    <>
      <PageHeader title="Relatórios" description="Números gerenciais da empresa, prontos para exportar." actions={<div className="hidden sm:block">{exportButtons}</div>} />

      <div className="grid gap-4 lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-start">
        {/* Desktop: lista lateral fixa. */}
        <nav aria-label="Relatórios" className="hidden lg:block">
          <Card className="p-1.5">
            <ul className="space-y-0.5">
              {items.map((i) => {
                const Icon = ICONS[i.key] ?? FileBarChart;
                const active = i.key === reportKey;
                return (
                  <li key={i.key}>
                    <button
                      type="button"
                      aria-current={active ? 'page' : undefined}
                      onClick={() => selectReport(i.key)}
                      className={cn(
                        'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        active ? 'bg-accent font-medium text-accent-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      )}
                    >
                      <Icon className="size-4 shrink-0" aria-hidden />
                      <span className="truncate">{i.title}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Card>
        </nav>

        <div className="min-w-0 space-y-4">
          {!reportKey ? (
            <>
              {/* Celular/tablet: cartões para escolher. */}
              <ul className="grid gap-2 sm:grid-cols-2 lg:hidden">
                {items.map((i) => {
                  const Icon = ICONS[i.key] ?? FileBarChart;
                  return (
                    <li key={i.key}>
                      <button
                        type="button"
                        onClick={() => selectReport(i.key)}
                        className="flex min-h-14 w-full items-center gap-3 rounded-xl border bg-card px-4 py-3 text-left shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                          <Icon className="size-4" aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">{i.title}</span>
                        <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="hidden lg:block">
                <EmptyState icon={FileBarChart} title="Escolha um relatório" description="Selecione um relatório na lista ao lado para ver os números do período." />
              </div>
            </>
          ) : (
            <>
              <NativeSelect aria-label="Relatório" className="lg:hidden" value={reportKey} onChange={(e) => selectReport(e.target.value)}>
                {items.map((i) => (
                  <option key={i.key} value={i.key}>
                    {i.title}
                  </option>
                ))}
              </NativeSelect>

              <ReportFilters
                reportKey={reportKey}
                params={reportParams}
                onPeriod={(f, t) => update({ from: f === currentMonth() && t === f ? null : f, to: t === f ? null : t })}
                onFilter={(name: FilterName, value) => update({ [name]: value })}
                onCompare={(v) => update({ compare: v ? 'true' : null })}
              />

              <div className="sm:hidden">{exportButtons}</div>

              {report.isPending ? (
                <ReportSkeleton />
              ) : report.isError ? (
                <div className="space-y-2 rounded-xl border border-destructive/30 p-4">
                  <p className="text-sm text-destructive">{errorMessage(report.error)}</p>
                  <Button variant="outline" size="sm" onClick={() => report.refetch()}>
                    Tentar novamente
                  </Button>
                </div>
              ) : (
                <ReportView report={report.data} fetching={report.isFetching} />
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
