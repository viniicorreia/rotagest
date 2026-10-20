import { AlertTriangle, Info } from 'lucide-react';
import type { ReactNode } from 'react';
import type { ClosingSnapshot } from '@/api/types';
import { Card } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { formatBRL, isNegative } from '@/lib/money';
import { cn } from '@/lib/utils';
import { SectionTable } from './section-table';

type Tone = 'default' | 'positive' | 'negative';
const resultTone = (v: string): Tone => (isNegative(v) ? 'negative' : Number(v) > 0 ? 'positive' : 'default');

/** Layout comum ao fechamento gravado e à prévia: totais, pendências, avisos e seções. */
export function SnapshotView({ snapshot, banner, variant }: { snapshot: ClosingSnapshot; banner: ReactNode; variant: 'stored' | 'preview' }) {
  const t = snapshot.totals;
  const p = snapshot.pending;
  return (
    <div className="space-y-4">
      <div
        className={cn(
          'flex items-start gap-2 rounded-lg border px-3 py-2 text-sm',
          variant === 'preview' ? 'border-warning/40 bg-warning/10 text-warning' : 'bg-muted/40 text-muted-foreground',
        )}
      >
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
        <div className="min-w-0">{banner}</div>
      </div>

      {snapshot.warnings.length > 0 && (
        <div role="alert" className="space-y-1 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm">
          <p className="flex items-center gap-2 font-medium text-warning">
            <AlertTriangle className="size-4 shrink-0" aria-hidden /> Atenção
          </p>
          <ul className="list-disc space-y-0.5 pl-6">
            {snapshot.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      <section aria-labelledby="totals-accrual" className="space-y-2">
        <h3 id="totals-accrual" className="text-sm font-semibold">
          Resultado gerencial <span className="font-normal text-muted-foreground">— competência</span>
        </h3>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <StatCard label="Receitas" value={formatBRL(t.revenue)} />
          <StatCard label="Despesas" value={formatBRL(t.expense)} />
          <StatCard label="Resultado gerencial" value={formatBRL(t.result)} tone={resultTone(t.result)} className="col-span-2 lg:col-span-1" />
        </div>
      </section>

      <section aria-labelledby="totals-cash" className="space-y-2">
        <h3 id="totals-cash" className="text-sm font-semibold">
          Caixa <span className="font-normal text-muted-foreground">— pela data efetiva</span>
        </h3>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Recebido" value={formatBRL(t.received)} />
          <StatCard label="Pago" value={formatBRL(t.paid)} />
          <StatCard label="Resultado de caixa" value={formatBRL(t.cashResult)} tone={resultTone(t.cashResult)} />
          <StatCard label="Saldo das contas" value={formatBRL(t.balance)} hint="no último dia do mês" tone={isNegative(t.balance) ? 'negative' : 'default'} />
        </div>
      </section>

      <section aria-labelledby="pending" className="space-y-2">
        <h3 id="pending" className="text-sm font-semibold">
          Pendências <span className="font-normal text-muted-foreground">— até o fim do mês</span>
        </h3>
        <Card className="divide-y text-sm">
          <PendingRow label="Contas a pagar em aberto" count={`${p.payablesOpenCount} lançamento(s)`} value={formatBRL(p.payablesOpen)} />
          <PendingRow label="Contas a receber em aberto" count={`${p.receivablesOpenCount} lançamento(s)`} value={formatBRL(p.receivablesOpen)} />
          <PendingRow label="Despesas de motorista aguardando aprovação" count="ficam fora do fechamento" value={String(p.pendingApprovals)} warn={p.pendingApprovals > 0} />
          <PendingRow label="Km rodado não faturado" count={`${p.unbilledKmDays} dia(s)`} value={formatBRL(p.unbilledKmAmount)} warn={p.unbilledKmDays > 0} />
        </Card>
      </section>

      {snapshot.sections.map((s, i) => (
        <SectionTable key={`${s.title}-${i}`} section={s} />
      ))}

      <p className="text-xs text-muted-foreground">Resultado operacional/gerencial; não é lucro contábil definitivo.</p>
    </div>
  );
}

function PendingRow({ label, count, value, warn }: { label: string; count: string; value: string; warn?: boolean }) {
  return (
    <div className={cn('flex items-center justify-between gap-3 px-4 py-3', warn && 'bg-warning/10')}>
      <div className="min-w-0">
        <p className={cn('font-medium', warn && 'text-warning')}>{label}</p>
        <p className="text-xs text-muted-foreground">{count}</p>
      </div>
      <span className={cn('shrink-0 font-semibold tabular-nums', warn && 'text-warning')}>{value}</span>
    </div>
  );
}
