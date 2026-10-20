import { Badge } from '@/components/ui/badge';
import { CONTRACT_STATUS_LABELS, type ContractStatus } from './use-contracts';

export function ContractStatusBadge({ status }: { status: ContractStatus }) {
  const variant = status === 'ACTIVE' ? 'default' : status === 'SUSPENDED' ? 'warning' : status === 'CANCELED' ? 'outline' : 'secondary';
  return <Badge variant={variant}>{CONTRACT_STATUS_LABELS[status]}</Badge>;
}
