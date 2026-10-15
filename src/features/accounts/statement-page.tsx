import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Download } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { errorMessage, http } from '@/api/client';
import type { Statement } from '@/api/types';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/ui/stat-card';
import { currentMonth, formatDateBR, todayISO } from '@/lib/dates';
import { formatBRL, isNegative } from '@/lib/money';
import { cn } from '@/lib/utils';
import { ACCOUNT_TYPE_LABELS, TRANSACTION_KIND_LABELS } from '../finance/labels';

/** CSV do extrato exibido (gerado a partir dos dados já calculados pela API). */
function exportCsv(s: Statement) {
  const rows = [['Data', 'Tipo', 'Descrição', 'Entrada', 'Saída', 'Saldo'], ...s.entries.map((e) => [e.occurredAt, TRANSACTION_KIND_LABELS[e.kind], e.description, e.direction === 'IN' ? e.amount : '', e.direction === 'OUT' ? e.amount : '', e.balanceAfter])];
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `extrato-${s.account.name}-${s.from}-${s.to}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function StatementPage() {
  const { id } = useParams<{ id: string }>();
  const [from, setFrom] = useState(`${currentMonth()}-01`);
  const [to, setTo] = useState(todayISO());
  const statement = useQuery({
    queryKey: ['statement', id, from, to],
    queryFn: () => http.get<Statement>(`/accounts/${id}/statement?from=${from}&to=${to}`),
    enabled: !!from && !!to && from <= to,
  });
  const s = statement.data;

  return (
    <>
      <Link to="/app/accounts" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Contas
      </Link>
      <PageHeader
        title={s ? s.account.name : 'Extrato'}
        description={s ? `${ACCOUNT_TYPE_LABELS[s.account.type]} · saldo atual ${formatBRL(s.account.balance)}` : undefined}
        actions={
          s && (
            <Button variant="outline" onClick={() => exportCsv(s)} disabled={!s.entries.length}>
              <Download /> CSV
            </Button>
          )
        }
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <label className="text-sm">
          <span className="mb-1 block text-xs text-muted-foreground">De</span>
          <Input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="w-44" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs text-muted-foreground">Até</span>
          <Input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className="w-44" />
        </label>
      </div>

      {statement.isError ? (
        <p className="text-sm text-destructive">{errorMessage(statement.error)}</p>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Saldo anterior" value={formatBRL(s?.openingBalance)} loading={statement.isPending} />
            <StatCard label="Entradas" value={formatBRL(s?.totalIn)} tone="positive" loading={statement.isPending} />
            <StatCard label="Saídas" value={formatBRL(s?.totalOut)} tone="negative" loading={statement.isPending} />
            <StatCard label="Saldo final" value={formatBRL(s?.closingBalance)} tone={s && isNegative(s.closingBalance) ? 'negative' : 'default'} loading={statement.isPending} />
          </div>
          {statement.isPending ? (
            <Skeleton className="h-48" />
          ) : !s?.entries.length ? (
            <Card className="p-6 text-center text-sm text-muted-foreground">Nenhuma movimentação no período.</Card>
          ) : (
            <Card className="overflow-hidden">
              <ul className="divide-y">
                {s.entries.map((e) => (
                  <li key={e.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className={cn('truncate text-sm font-medium', e.reversed && 'line-through opacity-60')}>{e.description}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {formatDateBR(e.occurredAt)} · {TRANSACTION_KIND_LABELS[e.kind]}
                        {e.reason ? ` · ${e.reason}` : ''}
                      </p>
                    </div>
                    {e.reversed && <Badge variant="secondary">Estornado</Badge>}
                    <div className="text-right">
                      <p className={cn('text-sm font-semibold tabular-nums', e.direction === 'IN' ? 'text-primary' : 'text-destructive')}>
                        {e.direction === 'IN' ? '+' : '−'} {formatBRL(e.amount)}
                      </p>
                      <p className="text-xs tabular-nums text-muted-foreground">{formatBRL(e.balanceAfter)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </>
  );
}
