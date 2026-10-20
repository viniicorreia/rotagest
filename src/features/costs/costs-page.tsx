import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Fab } from '@/components/ui/fab';
import { Input, NativeSelect } from '@/components/ui/input';
import { Segmented } from '@/components/ui/segmented';
import { useAuth } from '@/lib/auth';
import { currentMonth, formatMonthBR, shiftMonth } from '@/lib/dates';
import { useVehicles } from '@/features/finance/use-finance';
import { FuelingFormDialog } from './fueling-form-dialog';
import { FuelingsTab } from './fuelings-tab';
import { MaintenanceFormDialog } from './maintenance-form-dialog';
import { MaintenancesTab } from './maintenances-tab';
import { SummaryTab } from './summary-tab';

type Tab = 'summary' | 'maintenances' | 'fuelings';
const TABS: readonly { value: Tab; label: string }[] = [
  { value: 'summary', label: 'Resumo' },
  { value: 'maintenances', label: 'Manutenções' },
  { value: 'fuelings', label: 'Abastecimentos' },
];

/** Manutenção, combustível e custo por km por veículo. Filtros na URL (compartilháveis e preservados ao voltar). */
export function CostsPage() {
  const { can } = useAuth();
  const canManage = can('fleet:manage') && can('finance:manage');
  const [params, setParams] = useSearchParams();
  const tabParam = params.get('tab') as Tab | null;
  const tab: Tab = tabParam && TABS.some((t) => t.value === tabParam) ? tabParam : 'summary';
  const monthParam = params.get('month') ?? '';
  const month = /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : currentMonth();
  const vehicleId = params.get('vehicle') ?? '';
  const page = Math.max(1, Number(params.get('page') ?? '1') || 1);

  const [creating, setCreating] = useState<'maintenance' | 'fueling' | null>(null);
  const vehicles = useVehicles(false, can('fleet:read'));

  function set(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next, { replace: true });
  }

  const createKind = tab === 'fuelings' ? 'fueling' : 'maintenance';
  const createLabel = tab === 'fuelings' ? 'Novo abastecimento' : 'Nova manutenção';

  return (
    <>
      <PageHeader
        title="Manutenção e combustível"
        description="Custos por veículo: cada lançamento gera uma conta a pagar."
        actions={
          canManage && (
            <>
              <Button variant={tab === 'fuelings' ? 'default' : 'outline'} className="hidden md:inline-flex" onClick={() => setCreating('fueling')}>
                <Plus /> Abastecimento
              </Button>
              <Button variant={tab === 'fuelings' ? 'outline' : 'default'} className="hidden md:inline-flex" onClick={() => setCreating('maintenance')}>
                <Plus /> Manutenção
              </Button>
            </>
          )
        }
      />

      <Card className="mb-4 space-y-3 p-3">
        <Segmented<Tab> label="Visão" value={tab} onChange={(v) => set('tab', v === 'summary' ? '' : v)} options={TABS} />
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" aria-label="Mês anterior" onClick={() => set('month', shiftMonth(month, -1))}>
              <ChevronLeft />
            </Button>
            <Input
              type="month"
              aria-label="Mês"
              className="min-w-0 flex-1"
              value={month}
              onChange={(e) => e.target.value && set('month', e.target.value === currentMonth() ? '' : e.target.value)}
            />
            <Button size="icon" variant="ghost" aria-label="Próximo mês" onClick={() => set('month', shiftMonth(month, 1))}>
              <ChevronRight />
            </Button>
          </div>
          <NativeSelect aria-label="Veículo" value={vehicleId} onChange={(e) => set('vehicle', e.target.value)}>
            <option value="">Todos os veículos</option>
            {vehicles.data?.items.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} · {v.plate}
              </option>
            ))}
          </NativeSelect>
        </div>
        <p className="text-xs text-muted-foreground first-letter:uppercase">{formatMonthBR(month, true)}</p>
      </Card>

      {tab === 'summary' && <SummaryTab month={month} vehicleId={vehicleId} />}
      {tab === 'maintenances' && (
        <MaintenancesTab month={month} vehicleId={vehicleId} page={page} onPage={(p) => set('page', String(p))} canManage={canManage} onCreate={() => setCreating('maintenance')} />
      )}
      {tab === 'fuelings' && (
        <FuelingsTab month={month} vehicleId={vehicleId} page={page} onPage={(p) => set('page', String(p))} canManage={canManage} onCreate={() => setCreating('fueling')} />
      )}

      {canManage && <Fab icon={Plus} label={createLabel} onClick={() => setCreating(createKind)} />}
      <MaintenanceFormDialog open={creating === 'maintenance'} onOpenChange={(o) => !o && setCreating(null)} defaultVehicleId={vehicleId || undefined} />
      <FuelingFormDialog open={creating === 'fueling'} onOpenChange={(o) => !o && setCreating(null)} defaultVehicleId={vehicleId || undefined} />
    </>
  );
}
