import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import type { PaymentMethod, Settlement } from '@/api/types';
import { errorMessage, http } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input, NativeSelect } from '@/components/ui/input';
import { MoneyInput } from '@/components/ui/money-input';
import { todayISO } from '@/lib/dates';
import { formatBRL, parseMoneyInput, toMoneyInput } from '@/lib/money';
import { ACCEPTED_FILES, uploadAttachment } from './attachments';
import { PAYMENT_METHOD_LABELS } from './labels';
import type { SideConfig } from './sides';
import { newIdempotencyKey, useAccounts, useInvalidateFinance } from './use-finance';

interface SettleDialogProps {
  config: SideConfig;
  target: { id: string; description: string; openAmount: string } | null;
  onClose: () => void;
}

/** Pagamento/recebimento total ou parcial. A API valida o saldo em aberto e trava concorrência. */
export function SettleDialog({ config, target, onClose }: SettleDialogProps) {
  const accounts = useAccounts(false, !!target);
  const invalidate = useInvalidateFinance();
  const keyRef = useRef(newIdempotencyKey());
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO());
  const [accountId, setAccountId] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('PIX');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!target) return;
    keyRef.current = newIdempotencyKey();
    setAmount(toMoneyInput(target.openAmount));
    setDate(todayISO());
    setNotes('');
    setFile(null);
    setError(undefined);
  }, [target]);

  useEffect(() => {
    if (!accountId && accounts.data?.items.length) setAccountId(accounts.data.items[0].id);
  }, [accounts.data, accountId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!target) return;
    const value = parseMoneyInput(amount);
    if (!value || Number(value) <= 0) return setError('Informe um valor maior que zero');
    if (!accountId) return setError('Escolha a conta');
    setError(undefined);
    setBusy(true);
    try {
      const res = await http.post<{ settlement: Settlement }>(`${config.path}/${target.id}/settlements`, {
        accountId,
        amount: value,
        settledAt: date,
        method,
        notes: notes.trim() || undefined,
        idempotencyKey: keyRef.current,
      });
      if (file) {
        try {
          await uploadAttachment({ settlementId: res.settlement.id }, file);
        } catch (err) {
          toast.error(`Lançamento salvo, mas o comprovante não foi enviado: ${errorMessage(err)}`);
        }
      }
      await invalidate();
      toast.success(config.settledToast);
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const noAccounts = accounts.isSuccess && accounts.data.items.length === 0;

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{config.settleTitle}</DialogTitle>
          <DialogDescription>
            {target?.description} · em aberto {formatBRL(target?.openAmount)}
          </DialogDescription>
        </DialogHeader>
        {noAccounts ? (
          <p className="text-sm text-muted-foreground">
            Cadastre uma conta financeira antes.{' '}
            <Link to="/app/accounts" className="font-medium text-primary hover:underline">
              Ir para contas
            </Link>
          </p>
        ) : (
          <form onSubmit={submit} noValidate className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="settle-amount" label="Valor" error={error} hint="Pode ser parcial">
                <MoneyInput id="settle-amount" value={amount} onChange={(e) => setAmount(e.target.value)} aria-invalid={!!error} />
              </Field>
              <Field id="settle-date" label="Data efetiva">
                <Input id="settle-date" type="date" max={todayISO()} value={date} onChange={(e) => setDate(e.target.value)} />
              </Field>
            </div>
            <Field id="settle-account" label="Conta">
              <NativeSelect id="settle-account" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                {accounts.data?.items.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} · {formatBRL(a.balance)}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field id="settle-method" label="Forma de pagamento">
              <NativeSelect id="settle-method" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
                {Object.entries(PAYMENT_METHOD_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field id="settle-notes" label="Observação (opcional)">
              <Input id="settle-notes" value={notes} maxLength={500} onChange={(e) => setNotes(e.target.value)} />
            </Field>
            <Field id="settle-file" label="Comprovante (opcional)" hint="PDF, JPG, PNG ou WEBP até 10 MB">
              <Input id="settle-file" type="file" accept={ACCEPTED_FILES} className="pt-2" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </Field>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
                Cancelar
              </Button>
              <Button type="submit" loading={busy}>
                {config.settleLabel}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
