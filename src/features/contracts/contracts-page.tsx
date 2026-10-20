import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/page-header';
import { Segmented } from '@/components/ui/segmented';
import { useAuth } from '@/lib/auth';
import { ContractorsTab } from './contractors-tab';
import { ContractsTab } from './contracts-tab';

type Tab = 'contracts' | 'contractors';
const TABS: readonly { value: Tab; label: string }[] = [
  { value: 'contracts', label: 'Contratos' },
  { value: 'contractors', label: 'Contratantes' },
];

/** Contratos de transporte e seus contratantes. A aba fica na URL. */
export function ContractsPage() {
  const { can } = useAuth();
  // A API exige contracts:manage para escrever em contratos e contratantes.
  const canManage = can('contracts:manage');
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get('tab') === 'contractors' ? 'contractors' : 'contracts';

  return (
    <>
      <PageHeader title="Contratos" description="Contratos com escolas, prefeituras e empresas, e as contas a receber que eles geram." />
      <Segmented<Tab> label="Seção" className="mb-4 w-fit" value={tab} onChange={(v) => setParams(v === 'contracts' ? {} : { tab: v }, { replace: true })} options={TABS} />
      {tab === 'contracts' ? <ContractsTab canManage={canManage} /> : <ContractorsTab canManage={canManage} />}
    </>
  );
}
