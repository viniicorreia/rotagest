import type { ReactNode } from 'react';
import type { ReportKey } from '@/api/types';
import { Card } from '@/components/ui/card';
import { Input, NativeSelect } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth';
import { currentMonth } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { useContracts } from '@/features/contracts/use-contracts';
import { useAccounts, useCategories, useVehicles } from '@/features/finance/use-finance';
import { useRoutes } from '@/features/fleet/use-fleet';
import { CATEGORY_TYPE, type FilterName, REPORT_FILTERS, type ReportParams, type ReportStatus, STATUS_LABELS } from './use-reports';

interface Preset {
  label: string;
  range: () => { from: string; to: string };
}

const PRESETS: readonly Preset[] = [
  { label: 'Este mês', range: () => ({ from: currentMonth(), to: currentMonth() }) },
  { label: 'Mês passado', range: () => ({ from: currentMonth(-1), to: currentMonth(-1) }) },
  { label: 'Últimos 3 meses', range: () => ({ from: currentMonth(-2), to: currentMonth() }) },
  { label: 'Este ano', range: () => ({ from: `${currentMonth().slice(0, 4)}-01`, to: currentMonth() }) },
];

interface Props {
  reportKey: ReportKey;
  params: ReportParams;
  onPeriod: (from: string, to: string) => void;
  onFilter: (name: FilterName, value: string) => void;
  onCompare: (value: boolean) => void;
}

/** Período, filtros do relatório escolhido e comparativo. Opções vêm dos cadastros da empresa. */
export function ReportFilters({ reportKey, params, onPeriod, onFilter, onCompare }: Props) {
  const { can } = useAuth();
  const allowed = REPORT_FILTERS[reportKey];
  const has = (f: FilterName) => allowed.includes(f);

  const vehicles = useVehicles(false, has('vehicleId') && can('fleet:read'));
  const routes = useRoutes(has('routeId') && can('fleet:read'));
  const contracts = useContracts('', has('contractId') && can('contracts:read'));
  const categories = useCategories(CATEGORY_TYPE[reportKey], false, has('categoryId') && can('finance:read'));
  const accounts = useAccounts(false, has('accountId') && can('finance:read'));

  const { from, to, filters } = params;

  return (
    <Card className="space-y-3 p-3">
      <div className="flex max-w-full gap-1 overflow-x-auto rounded-lg bg-muted p-1" role="group" aria-label="Períodos rápidos">
        {PRESETS.map((p) => {
          const r = p.range();
          const active = r.from === from && r.to === to;
          return (
            <button
              key={p.label}
              type="button"
              aria-pressed={active}
              onClick={() => onPeriod(r.from, r.to)}
              className={cn(
                'h-9 shrink-0 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                active ? 'bg-card text-foreground shadow-sm' : 'hover:text-foreground',
              )}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <div className="min-w-0 space-y-1">
          <Label htmlFor="report-from" className="text-xs text-muted-foreground">
            De
          </Label>
          <Input
            id="report-from"
            type="month"
            value={from}
            max={to}
            onChange={(e) => e.target.value && onPeriod(e.target.value, e.target.value > to ? e.target.value : to)}
          />
        </div>
        <div className="min-w-0 space-y-1">
          <Label htmlFor="report-to" className="text-xs text-muted-foreground">
            Até
          </Label>
          <Input
            id="report-to"
            type="month"
            value={to}
            min={from}
            onChange={(e) => e.target.value && onPeriod(e.target.value < from ? e.target.value : from, e.target.value)}
          />
        </div>

        {has('vehicleId') && (
          <FilterSelect label="Veículo" value={filters.vehicleId} onChange={(v) => onFilter('vehicleId', v)} all="Todos os veículos">
            {vehicles.data?.items.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} · {v.plate}
              </option>
            ))}
          </FilterSelect>
        )}
        {has('routeId') && (
          <FilterSelect label="Rota" value={filters.routeId} onChange={(v) => onFilter('routeId', v)} all="Todas as rotas">
            {routes.data?.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </FilterSelect>
        )}
        {has('contractId') && (
          <FilterSelect label="Contrato" value={filters.contractId} onChange={(v) => onFilter('contractId', v)} all="Todos os contratos">
            {contracts.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.number ? `${c.number} — ${c.contractor.name}` : c.contractor.name}
              </option>
            ))}
          </FilterSelect>
        )}
        {has('categoryId') && (
          <FilterSelect label="Categoria" value={filters.categoryId} onChange={(v) => onFilter('categoryId', v)} all="Todas as categorias">
            {categories.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </FilterSelect>
        )}
        {has('accountId') && (
          <FilterSelect label="Conta" value={filters.accountId} onChange={(v) => onFilter('accountId', v)} all="Todas as contas">
            {accounts.data?.items.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </FilterSelect>
        )}
        {has('status') && (
          <FilterSelect label="Situação" value={filters.status} onChange={(v) => onFilter('status', v)} all="Todas as situações">
            {(Object.keys(STATUS_LABELS) as ReportStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </FilterSelect>
        )}
      </div>

      <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm md:min-h-0">
        <input type="checkbox" className="size-4 accent-[var(--primary)]" checked={params.compare} onChange={(e) => onCompare(e.target.checked)} />
        Comparar com período anterior
      </label>
    </Card>
  );
}

function FilterSelect({ label, value, onChange, all, children }: { label: string; value?: string; onChange: (v: string) => void; all: string; children: ReactNode }) {
  const id = `report-filter-${label}`;
  return (
    <div className="col-span-2 min-w-0 space-y-1 sm:col-span-1">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <NativeSelect id={id} value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
        <option value="">{all}</option>
        {children}
      </NativeSelect>
    </div>
  );
}
