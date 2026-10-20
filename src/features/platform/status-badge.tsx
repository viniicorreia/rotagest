import type { CompanyStatus, SubscriptionStatus } from '@/api/types';
import { Badge } from '@/components/ui/badge';
import { COMPANY_STATUS_LABELS, COMPANY_STATUS_TONE, SUBSCRIPTION_STATUS_LABELS, SUBSCRIPTION_STATUS_TONE } from './labels';

export function SubscriptionStatusBadge({ status, className }: { status: SubscriptionStatus; className?: string }) {
  return (
    <Badge variant={SUBSCRIPTION_STATUS_TONE[status]} className={className}>
      {SUBSCRIPTION_STATUS_LABELS[status]}
    </Badge>
  );
}

export function CompanyStatusBadge({ status, className }: { status: CompanyStatus; className?: string }) {
  return (
    <Badge variant={COMPANY_STATUS_TONE[status]} className={className}>
      {COMPANY_STATUS_LABELS[status]}
    </Badge>
  );
}
