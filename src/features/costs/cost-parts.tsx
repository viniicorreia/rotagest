import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { UseFormRegisterReturn } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { errorMessage, http } from '@/api/client';
import type { Account, Fueling } from '@/api/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input, NativeSelect } from '@/components/ui/input';
import { todayISO } from '@/lib/dates';
import { PAYMENT_METHOD_LABELS } from '@/features/finance/labels';
import { ReasonDialog } from '@/features/finance/reason-dialog';
import { useInvalidateCosts } from './use-costs';

type CostPayable = Fueling['payable'];

/** Situação da conta a pagar gerada pela manutenção/abastecimento (vinda da API). */
export function CostPayableStatus({ payable }: { payable: CostPayable | null }) {
  if (!payable) return <Badge variant="outline">Sem conta</Badge>;
  if (payable.status === 'CANCELED') return <Badge variant="outline">Cancelada</Badge>;
  if (payable.approvalStatus === 'PENDING_APPROVAL') return <Badge variant="warning">Aguardando aprovação</Badge>;
  if (payable.approvalStatus === 'REJECTED') return <Badge variant="destructive">Rejeitada</Badge>;
  if (payable.status === 'PAID') return <Badge>Paga</Badge>;
  if (payable.status === 'PARTIALLY_PAID') return <Badge variant="warning">Paga em parte</Badge>;
  return <Badge variant="secondary">A pagar</Badge>;
}

interface SettleNowFieldsProps {
  idPrefix: string;
  checked: boolean;
  accounts: Account[] | undefined;
  accountsLoaded: boolean;
  accountError?: string;
  toggle: UseFormRegisterReturn;
  account: UseFormRegisterReturn;
  method: UseFormRegisterReturn;
  settledAt: UseFormRegisterReturn;
}

/** Bloco "já pago": a API cria a conta e a liquida na mesma operação (com chave de idempotência). */
export function SettleNowFields({ idPrefix, checked, accounts, accountsLoaded, accountError, toggle, account, method, settledAt }: SettleNowFieldsProps) {
  const noAccounts = accountsLoaded && !accounts?.length;
  return (
    <div className="space-y-4 rounded-lg border p-3">
      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium">
        <input type="checkbox" className="size-4 accent-[var(--primary)]" {...toggle} />
        Já foi pago
      </label>
      {checked &&
        (noAccounts ? (
          <p className="text-sm text-muted-foreground">
            Cadastre uma conta financeira antes.{' '}
            <Link to="/app/accounts" className="font-medium text-primary hover:underline">
              Ir para contas
            </Link>
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            <Field id={`${idPrefix}-account`} label="Conta" error={accountError}>
              <NativeSelect id={`${idPrefix}-account`} {...account} aria-invalid={!!accountError}>
                {accounts?.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field id={`${idPrefix}-method`} label="Forma">
              <NativeSelect id={`${idPrefix}-method`} {...method}>
                {Object.entries(PAYMENT_METHOD_LABELS).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field id={`${idPrefix}-settled`} label="Data do pagamento">
              <Input id={`${idPrefix}-settled`} type="date" max={todayISO()} {...settledAt} />
            </Field>
          </div>
        ))}
    </div>
  );
}

export function Pager({ page, totalPages, total, onPage }: { page: number; totalPages: number; total: number; onPage: (page: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between border-t px-4 py-2 text-sm">
      <span className="text-muted-foreground">
        Página {page} de {totalPages} · {total} lançamentos
      </span>
      <div className="flex gap-1">
        <Button size="icon" variant="ghost" disabled={page <= 1} aria-label="Página anterior" onClick={() => onPage(page - 1)}>
          <ChevronLeft />
        </Button>
        <Button size="icon" variant="ghost" disabled={page >= totalPages} aria-label="Próxima página" onClick={() => onPage(page + 1)}>
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}

/** Pode cancelar enquanto a conta ligada não estiver cancelada; a API recusa se houver pagamento (estorne antes). */
export function canCancelCost(payable: CostPayable | null): boolean {
  return !!payable && payable.status !== 'CANCELED';
}

interface CancelCostDialogProps {
  target: { path: string; label: string } | null;
  onClose: () => void;
}

/** Cancela manutenção/abastecimento: a API cancela a conta a pagar gerada. */
export function CancelCostDialog({ target, onClose }: CancelCostDialogProps) {
  const invalidate = useInvalidateCosts();
  return (
    <ReasonDialog
      open={!!target}
      onOpenChange={(o) => !o && onClose()}
      title="Cancelar lançamento"
      description={
        <>
          {target?.label}. A conta a pagar gerada será cancelada. Se já houver pagamento, estorne-o antes em Contas a pagar.
        </>
      }
      confirmLabel="Cancelar lançamento"
      minLength={3}
      onConfirm={async (reason) => {
        if (!target) return;
        try {
          await http.post(`${target.path}/cancel`, { reason });
          toast.success('Lançamento cancelado');
          await invalidate();
        } catch (e) {
          toast.error(errorMessage(e));
          throw e;
        }
      }}
    />
  );
}
