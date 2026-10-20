import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/page-header';
import { Segmented } from '@/components/ui/segmented';
import { useAuth } from '@/lib/auth';
import { AssignmentsTab } from './assignments-tab';
import { DriversTab } from './drivers-tab';
import { RoutesTab } from './routes-tab';

type Tab = 'drivers' | 'routes' | 'assignments';
const TABS: readonly { value: Tab; label: string }[] = [
  { value: 'drivers', label: 'Motoristas' },
  { value: 'routes', label: 'Rotas' },
  { value: 'assignments', label: 'Escalas' },
];

/** Operação: motoristas, rotas e a escala de quem faz cada rota. A aba fica na URL. */
export function OperationsPage() {
  const { can } = useAuth();
  const canManage = can('fleet:manage');
  const [params, setParams] = useSearchParams();
  const raw = params.get('tab');
  const tab: Tab = TABS.some((t) => t.value === raw) ? (raw as Tab) : 'drivers';

  return (
    <>
      <PageHeader title="Operação" description="Motoristas, rotas e a escala de veículos e motoristas em cada rota." />
      <Segmented<Tab> label="Seção" className="mb-4 w-fit" value={tab} onChange={(v) => setParams(v === 'drivers' ? {} : { tab: v }, { replace: true })} options={TABS} />
      {tab === 'drivers' && <DriversTab canManage={canManage} />}
      {tab === 'routes' && <RoutesTab canManage={canManage} />}
      {tab === 'assignments' && <AssignmentsTab canManage={canManage} />}
    </>
  );
}
