import { CheckCircle2, LockOpen, Lock } from 'lucide-react';
import type { Closing } from '@/api/types';
import { Badge } from '@/components/ui/badge';

export function ClosingStatusBadge({ closing }: { closing: Pick<Closing, 'status' | 'version'> }) {
  if (closing.status === 'CLOSED')
    return (
      <Badge>
        <Lock className="size-3" aria-hidden /> Fechado · v{closing.version}
      </Badge>
    );
  if (closing.status === 'REOPENED')
    return (
      <Badge variant="warning">
        <LockOpen className="size-3" aria-hidden /> Reaberto
      </Badge>
    );
  return (
    <Badge variant="secondary">
      <CheckCircle2 className="size-3" aria-hidden /> Aberto
    </Badge>
  );
}
