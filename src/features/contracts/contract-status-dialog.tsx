import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { errorMessage, http } from '@/api/client';
import type { Contract } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { todayISO } from '@/lib/dates';
import { STATUS_ACTION_LABELS, useInvalidateContracts, type StatusChange } from './use-contracts';

export interface StatusTarget {
  contract: Contract;
  status: StatusChange;
}

function describe({ contract, status }: StatusTarget): string {
  const generates = contract.billingType !== 'VARIABLE';
  switch (status) {
    case 'ACTIVE':
      return generates
        ? 'Ao ativar, o sistema gera automaticamente uma conta a receber por mês, do início do contrato até o mês que vem, com o vencimento configurado. Os meses seguintes são gerados sozinhos conforme o tempo passa e aparecem em Contas a receber.'
        : 'Contrato variável: as contas a receber são lançadas pelo faturamento por km ou manualmente.';
    case 'SUSPENDED':
      return 'Novas competências deixam de ser geradas enquanto o contrato estiver suspenso. O que já foi gerado continua valendo.';
    case 'ENDED':
      return 'As contas a receber em aberto e sem recebimento depois do mês de encerramento são canceladas. O histórico é mantido.';
    case 'CANCELED':
      return 'Todas as contas a receber em aberto e sem recebimento deste contrato são canceladas (exceto em meses já fechados). Esta ação não pode ser desfeita.';
  }
}

export function ContractStatusDialog({ target, onClose }: { target: StatusTarget | null; onClose: () => void }) {
  const invalidate = useInvalidateContracts();
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const closing = target?.status === 'ENDED' || target?.status === 'CANCELED';

  useEffect(() => {
    if (target) {
      setEndDate(todayISO());
      setReason('');
      setError(undefined);
    }
  }, [target]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!target) return;
    if (target.status === 'ENDED' && !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) return setError('Informe o último dia');
    setBusy(true);
    try {
      await http.post(`/contracts/${target.contract.id}/status`, {
        status: target.status,
        ...(target.status === 'ENDED' ? { endDate } : {}),
        ...(closing && reason.trim() ? { reason: reason.trim() } : {}),
      });
      await invalidate();
      toast.success(target.status === 'ACTIVE' ? 'Contrato ativo' : target.status === 'SUSPENDED' ? 'Contrato suspenso' : target.status === 'ENDED' ? 'Contrato encerrado' : 'Contrato cancelado');
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const label = target ? STATUS_ACTION_LABELS[target.status] : '';
  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent role="alertdialog">
        <DialogHeader>
          <DialogTitle>{label}?</DialogTitle>
          <DialogDescription>{target ? describe(target) : ''}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="space-y-4">
          {target?.status === 'ENDED' && (
            <Field id="cs-end" label="Último dia do contrato" error={error}>
              <Input id="cs-end" type="date" value={endDate} min={target.contract.startDate} onChange={(e) => setEndDate(e.target.value)} aria-invalid={!!error} />
            </Field>
          )}
          {closing && (
            <Field id="cs-reason" label="Motivo" hint="Opcional; fica registrado nas contas canceladas.">
              <Input id="cs-reason" value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} />
            </Field>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
              Voltar
            </Button>
            <Button type="submit" variant={closing ? 'destructive' : 'default'} loading={busy}>
              {label}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
