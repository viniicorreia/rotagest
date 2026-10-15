import { Badge } from '@/components/ui/badge';
import type { ObligationItem, SideConfig } from './sides';

/** Status exibido: "Vencida" é derivada pela API (campo overdue), nunca calculada aqui. */
export function ObligationStatus({ item, config }: { item: ObligationItem; config: SideConfig }) {
  if (item.status === 'CANCELED') return <Badge variant="outline">Cancelada</Badge>;
  if (item.overdue) return <Badge variant="destructive">{item.status === config.partialStatus ? 'Vencida (parcial)' : 'Vencida'}</Badge>;
  if (item.status === config.doneStatus) return <Badge>{config.statusLabels[item.status]}</Badge>;
  if (item.status === config.partialStatus) return <Badge variant="warning">{config.statusLabels[item.status]}</Badge>;
  return <Badge variant="secondary">{config.statusLabels[item.status]}</Badge>;
}
