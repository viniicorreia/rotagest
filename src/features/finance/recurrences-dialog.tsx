import { useQuery } from '@tanstack/react-query';
import { Repeat, StopCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { RecurrenceRule } from '@/api/types';
import { errorMessage, http } from '@/api/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/auth';
import { formatMonthBR } from '@/lib/dates';
import { formatBRL } from '@/lib/money';
import type { SideConfig } from './sides';
import { useInvalidateFinance } from './use-finance';

export function RecurrencesDialog({ config, open, onOpenChange }: { config: SideConfig; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { can } = useAuth();
  const target = config.side === 'payables' ? 'PAYABLE' : 'RECEIVABLE';
  const rules = useQuery({ queryKey: ['recurrences', target], queryFn: () => http.get<RecurrenceRule[]>(`/recurrences?target=${target}`), enabled: open });
  const invalidate = useInvalidateFinance();

  async function stop(rule: RecurrenceRule) {
    try {
      await http.post(`/recurrences/${rule.id}/stop`);
      await invalidate();
      toast.success('Recorrência encerrada');
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Recorrências</DialogTitle>
          <DialogDescription>Lançamentos gerados automaticamente todo mês (ou ano), até o mês que vem.</DialogDescription>
        </DialogHeader>
        {rules.isPending ? (
          <Skeleton className="h-32" />
        ) : !rules.data?.length ? (
          <EmptyState icon={Repeat} title="Nenhuma recorrência" description={`Ao lançar uma ${config.singular}, escolha “Recorrente” para repetir automaticamente.`} />
        ) : (
          <ul className="divide-y rounded-lg border">
            {rules.data.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{r.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatBRL(r.amount)} · {r.frequency === 'MONTHLY' ? 'mensal' : 'anual'} · dia {r.dueDay} · desde {formatMonthBR(r.startMonth)}
                    {r.endMonth ? ` até ${formatMonthBR(r.endMonth)}` : ''}
                  </p>
                </div>
                {r.status === 'ACTIVE' ? (
                  can('finance:manage') && (
                    <Button size="sm" variant="ghost" onClick={() => stop(r)}>
                      <StopCircle /> Encerrar
                    </Button>
                  )
                ) : (
                  <Badge variant="secondary">Encerrada</Badge>
                )}
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
