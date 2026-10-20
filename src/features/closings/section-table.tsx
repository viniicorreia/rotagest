import type { ReportSection } from '@/api/types';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatCell, isNegativeCell } from './format';

type Row = ReportSection['rows'][number];

const NUMERIC = new Set(['money', 'number', 'percent']);

/** Seção do fechamento: tabela no desktop, cartões no celular. Os valores vêm prontos da API. */
export function SectionTable({ section }: { section: ReportSection }) {
  const [head, ...rest] = section.columns;
  const cell = (row: Row, key: string, type: (typeof section.columns)[number]['type']) => (
    <span className={cn(NUMERIC.has(type) && 'tabular-nums', isNegativeCell(type, row[key]) && 'text-destructive')}>{formatCell(type, row[key])}</span>
  );

  return (
    <Card className="overflow-hidden">
      <h3 className="border-b px-4 py-3 text-sm font-semibold">{section.title}</h3>
      {section.rows.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">Sem movimento neste mês.</p>
      ) : (
        <>
          {/* Celular: um cartão por linha. */}
          <ul className="divide-y md:hidden">
            {section.rows.map((row, i) => (
              <li key={i} className="px-4 py-3">
                {head && <p className="mb-1 break-words text-sm font-medium">{formatCell(head.type, row[head.key])}</p>}
                <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  {rest.map((c) => (
                    <div key={c.key} className="min-w-0">
                      <dt className="truncate text-muted-foreground">{c.label}</dt>
                      <dd className="truncate font-medium">{cell(row, c.key, c.type)}</dd>
                    </div>
                  ))}
                </dl>
              </li>
            ))}
            {section.totals && (
              <li className="bg-muted/40 px-4 py-3">
                <p className="mb-1 text-sm font-semibold">{head ? formatCell(head.type, section.totals[head.key] ?? 'Total') : 'Total'}</p>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  {rest
                    .filter((c) => section.totals?.[c.key] !== undefined && section.totals?.[c.key] !== null)
                    .map((c) => (
                      <div key={c.key} className="min-w-0">
                        <dt className="truncate text-muted-foreground">{c.label}</dt>
                        <dd className="truncate font-semibold">{cell(section.totals as Row, c.key, c.type)}</dd>
                      </div>
                    ))}
                </dl>
              </li>
            )}
          </ul>
          {/* Desktop: tabela (rola por dentro se tiver muitas colunas). */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                <tr>
                  {section.columns.map((c) => (
                    <th key={c.key} className={cn('whitespace-nowrap px-4 py-2 font-medium', NUMERIC.has(c.type) && 'text-right')}>
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {section.rows.map((row, i) => (
                  <tr key={i}>
                    {section.columns.map((c) => (
                      <td key={c.key} className={cn('px-4 py-2', NUMERIC.has(c.type) && 'whitespace-nowrap text-right')}>
                        {cell(row, c.key, c.type)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              {section.totals && (
                <tfoot className="border-t bg-muted/40 font-semibold">
                  <tr>
                    {section.columns.map((c) => (
                      <td key={c.key} className={cn('px-4 py-2', NUMERIC.has(c.type) && 'whitespace-nowrap text-right')}>
                        {section.totals?.[c.key] === undefined ? '' : cell(section.totals as Row, c.key, c.type)}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </>
      )}
    </Card>
  );
}
