import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ArrowDownCircle, ArrowUpCircle, ChevronLeft, ChevronRight, Plus, Repeat, Search } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { errorMessage, http } from '@/api/client';
import type { PayableList, ReceivableList } from '@/api/types';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Fab } from '@/components/ui/fab';
import { Input, NativeSelect } from '@/components/ui/input';
import { Segmented } from '@/components/ui/segmented';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/ui/stat-card';
import { useAuth } from '@/lib/auth';
import { formatDateBR, formatMonthBR } from '@/lib/dates';
import { formatBRL } from '@/lib/money';
import { cn } from '@/lib/utils';
import { ObligationDetailDialog } from './obligation-detail-dialog';
import { ObligationFormDialog } from './obligation-form-dialog';
import { ObligationStatus } from './obligation-status';
import { RecurrencesDialog } from './recurrences-dialog';
import { SettleDialog } from './settle-dialog';
import { SIDES, settledOf, type ObligationItem, type Side } from './sides';
import { useCategories, useVehicles } from './use-finance';

const PAGE_SIZE = 20;
type StatusFilter = 'OPEN' | 'OVERDUE' | 'DONE' | 'CANCELED' | 'ALL';

/** Lista de contas a pagar ou a receber com filtros na URL (compartilháveis e preservados ao voltar). */
export function ObligationsPage({ side }: { side: Side }) {
  const config = SIDES[side];
  const { can } = useAuth();
  const canManage = can('finance:manage');
  const [params, setParams] = useSearchParams();
  const status = (params.get('status') as StatusFilter) ?? 'OPEN';
  const competence = params.get('competence') ?? '';
  const categoryId = params.get('category') ?? '';
  const vehicleId = params.get('vehicle') ?? '';
  const search = params.get('q') ?? '';
  const page = Number(params.get('page') ?? '1');
  const [searchInput, setSearchInput] = useState(search);

  const [creating, setCreating] = useState(false);
  const [recurrences, setRecurrences] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [settling, setSettling] = useState<ObligationItem | null>(null);

  const categories = useCategories(config.categoryType);
  const vehicles = useVehicles(false, can('fleet:read'));

  function set(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next, { replace: true });
  }

  const query = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
  const apiStatus = status === 'DONE' ? config.doneStatus : status === 'ALL' ? '' : status;
  if (apiStatus) query.set('status', apiStatus);
  if (status === 'ALL') query.set('status', '');
  if (competence) {
    query.set('competenceFrom', competence);
    query.set('competenceTo', competence);
  }
  if (categoryId) query.set('categoryId', categoryId);
  if (vehicleId) query.set('vehicleId', vehicleId);
  if (search) query.set('search', search);
  if (!query.get('status')) query.delete('status');

  const list = useQuery({
    queryKey: [side, 'list', query.toString()],
    queryFn: () => http.get<PayableList | ReceivableList>(`${config.path}?${query}`),
    placeholderData: keepPreviousData,
  });
  const data = list.data;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const Icon = side === 'payables' ? ArrowUpCircle : ArrowDownCircle;

  return (
    <>
      <PageHeader
        title={config.title}
        description={side === 'payables' ? 'Contas a pagar: vencimento não é pagamento.' : 'Contas a receber: receita prevista não altera o saldo bancário.'}
        actions={
          <>
            <Button variant="outline" onClick={() => setRecurrences(true)}>
              <Repeat /> Recorrências
            </Button>
            {canManage && (
              <Button className="hidden md:inline-flex" onClick={() => setCreating(true)}>
                <Plus /> {config.newLabel}
              </Button>
            )}
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total do filtro" value={formatBRL(data?.summary.amount)} loading={list.isPending} />
        <StatCard label={config.settledLabel} value={formatBRL(data?.summary.settled)} tone="positive" loading={list.isPending} />
        <StatCard label="Em aberto" value={formatBRL(data?.summary.open)} loading={list.isPending} />
        <StatCard
          label="Vencido"
          value={formatBRL(data?.summary.overdue)}
          hint={data ? `${data.summary.overdueCount} lançamento(s)` : undefined}
          tone={data && Number(data.summary.overdue) > 0 ? 'negative' : 'default'}
          loading={list.isPending}
        />
      </div>

      <Card className="mb-4 space-y-3 p-3">
        <Segmented<StatusFilter>
          label="Situação"
          value={status}
          onChange={(v) => set('status', v === 'OPEN' ? '' : v)}
          options={[
            { value: 'OPEN', label: 'Em aberto' },
            { value: 'OVERDUE', label: 'Vencidas' },
            { value: 'DONE', label: side === 'payables' ? 'Pagas' : 'Recebidas' },
            { value: 'CANCELED', label: 'Canceladas' },
            { value: 'ALL', label: 'Todas' },
          ]}
        />
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Input type="month" aria-label="Competência" value={competence} onChange={(e) => set('competence', e.target.value)} />
          <NativeSelect aria-label="Categoria" value={categoryId} onChange={(e) => set('category', e.target.value)}>
            <option value="">Todas as categorias</option>
            {categories.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect aria-label="Veículo" value={vehicleId} onChange={(e) => set('vehicle', e.target.value)}>
            <option value="">Todos os veículos</option>
            {vehicles.data?.items.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </NativeSelect>
          <form
            className="relative"
            onSubmit={(e) => {
              e.preventDefault();
              set('q', searchInput.trim());
            }}
          >
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input aria-label="Buscar" placeholder="Buscar descrição" className="pl-9" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} onBlur={() => set('q', searchInput.trim())} />
          </form>
        </div>
      </Card>

      {list.isPending ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : list.isError ? (
        <p className="text-sm text-destructive">{errorMessage(list.error)}</p>
      ) : !data?.items.length ? (
        <EmptyState
          icon={Icon}
          title={params.toString() ? 'Nada encontrado com estes filtros' : `Nenhuma ${config.singular} em aberto`}
          description={config.empty}
          action={
            canManage && (
              <Button onClick={() => setCreating(true)}>
                <Plus /> {config.newLabel}
              </Button>
            )
          }
        />
      ) : (
        <Card className={cn('overflow-hidden', list.isFetching && 'opacity-70')}>
          {/* Celular: cartões. Desktop: tabela. */}
          <ul className="divide-y md:hidden">
            {data.items.map((item) => (
              <li key={item.id}>
                <button type="button" className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/50" onClick={() => setDetailId(item.id)}>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.description}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      vence {formatDateBR(item.dueDate)} · {item.category.name}
                      {item.vehicle ? ` · ${item.vehicle.name}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-sm font-semibold tabular-nums">{formatBRL(item.status === 'CANCELED' ? item.amount : item.openAmount === '0.00' ? item.amount : item.openAmount)}</span>
                    <ObligationStatus item={item} config={config} />
                  </div>
                </button>
              </li>
            ))}
          </ul>
          <table className="hidden w-full text-sm md:table">
            <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Descrição</th>
                <th className="px-4 py-2 font-medium">Competência</th>
                <th className="px-4 py-2 font-medium">Vencimento</th>
                <th className="px-4 py-2 text-right font-medium">Valor</th>
                <th className="px-4 py-2 text-right font-medium">Em aberto</th>
                <th className="px-4 py-2 font-medium">Situação</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.items.map((item) => (
                <tr key={item.id} className="cursor-pointer hover:bg-muted/40" onClick={() => setDetailId(item.id)}>
                  <td className="max-w-xs px-4 py-3">
                    <p className="truncate font-medium">{item.description}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {item.category.name}
                      {item.vehicle ? ` · ${item.vehicle.name}` : ''}
                      {item.kind === 'RECURRING' ? ' · recorrente' : ''}
                    </p>
                  </td>
                  <td className="px-4 py-3 capitalize text-muted-foreground">{formatMonthBR(item.competence)}</td>
                  <td className={cn('px-4 py-3 tabular-nums', item.overdue && 'font-medium text-destructive')}>{formatDateBR(item.dueDate)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatBRL(item.amount)}</td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums">{formatBRL(item.openAmount)}</td>
                  <td className="px-4 py-3">
                    <ObligationStatus item={item} config={config} />
                  </td>
                  <td className="px-4 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                    {canManage && item.status !== 'CANCELED' && Number(item.openAmount) > 0 && (
                      <Button size="sm" variant="outline" onClick={() => setSettling(item)}>
                        {config.settleLabel}
                      </Button>
                    )}
                    {Number(settledOf(item)) > 0 && item.status !== config.doneStatus && (
                      <Badge variant="secondary" className="ml-2">
                        {formatBRL(settledOf(item))}
                      </Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-2 text-sm">
              <span className="text-muted-foreground">
                Página {page} de {totalPages} · {data.total} lançamentos
              </span>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" disabled={page <= 1} aria-label="Página anterior" onClick={() => set('page', String(page - 1))}>
                  <ChevronLeft />
                </Button>
                <Button size="icon" variant="ghost" disabled={page >= totalPages} aria-label="Próxima página" onClick={() => set('page', String(page + 1))}>
                  <ChevronRight />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {canManage && <Fab icon={Plus} label={config.newLabel} onClick={() => setCreating(true)} />}
      <ObligationFormDialog config={config} open={creating} onOpenChange={setCreating} />
      <ObligationDetailDialog config={config} id={detailId} onClose={() => setDetailId(null)} />
      <SettleDialog config={config} target={settling} onClose={() => setSettling(null)} />
      <RecurrencesDialog config={config} open={recurrences} onOpenChange={setRecurrences} />
    </>
  );
}
