import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { errorMessage, http } from '@/api/client';
import type { Account, AccountType } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input, NativeSelect } from '@/components/ui/input';
import { MoneyInput } from '@/components/ui/money-input';
import { Segmented } from '@/components/ui/segmented';
import { todayISO } from '@/lib/dates';
import { parseMoneyInput, toMoneyInput } from '@/lib/money';
import { ACCOUNT_TYPE_LABELS } from '../finance/labels';
import { newIdempotencyKey, useAccounts, useInvalidateFinance } from '../finance/use-finance';

type Errors = Record<string, string | undefined>;

function useSubmit(onDone: () => void) {
  const invalidate = useInvalidateFinance();
  const [busy, setBusy] = useState(false);
  return {
    busy,
    async run(fn: () => Promise<unknown>, success: string) {
      setBusy(true);
      try {
        await fn();
        await invalidate();
        toast.success(success);
        onDone();
      } catch (e) {
        toast.error(errorMessage(e));
      } finally {
        setBusy(false);
      }
    },
  };
}

/** Cadastro e edição de conta. O saldo inicial vira o lançamento de abertura do extrato. */
export function AccountFormDialog({ open, onOpenChange, editing }: { open: boolean; onOpenChange: (o: boolean) => void; editing?: Account | null }) {
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('CHECKING');
  const [bankName, setBankName] = useState('');
  const [opening, setOpening] = useState('');
  const [openingDate, setOpeningDate] = useState(todayISO());
  const [errors, setErrors] = useState<Errors>({});
  const submit = useSubmit(() => onOpenChange(false));

  useEffect(() => {
    if (!open) return;
    setName(editing?.name ?? '');
    setType(editing?.type ?? 'CHECKING');
    setBankName(editing?.bankName ?? '');
    setOpening(editing ? toMoneyInput(editing.openingBalance) : '');
    setOpeningDate(editing?.openingBalanceDate ?? todayISO());
    setErrors({});
  }, [open, editing]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amount = opening.trim() ? parseMoneyInput(opening) : '0.00';
    const next: Errors = {
      name: name.trim().length < 2 ? 'Informe o nome da conta' : undefined,
      opening: amount === null ? 'Valor inválido' : undefined,
      openingDate: !openingDate ? 'Informe a data' : openingDate > todayISO() ? 'A data não pode ser futura' : undefined,
    };
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;
    const body = { name: name.trim(), type, bankName: bankName.trim() || null, openingBalance: amount!, openingBalanceDate: openingDate };
    void submit.run(() => (editing ? http.patch(`/accounts/${editing.id}`, body) : http.post('/accounts', body)), editing ? 'Conta atualizada' : 'Conta criada');
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !submit.busy && onOpenChange(o)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar conta' : 'Nova conta'}</DialogTitle>
          <DialogDescription>Banco ou caixa onde o dinheiro da empresa entra e sai.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="acc-name" label="Nome" error={errors.name}>
              <Input id="acc-name" placeholder="Banco do Brasil" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!errors.name} />
            </Field>
            <Field id="acc-type" label="Tipo">
              <NativeSelect id="acc-type" value={type} onChange={(e) => setType(e.target.value as AccountType)}>
                {(Object.keys(ACCOUNT_TYPE_LABELS) as AccountType[]).map((t) => (
                  <option key={t} value={t}>
                    {ACCOUNT_TYPE_LABELS[t]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field id="acc-bank" label="Banco (opcional)">
              <Input id="acc-bank" maxLength={60} value={bankName} onChange={(e) => setBankName(e.target.value)} />
            </Field>
            <div />
            <Field id="acc-opening" label="Saldo inicial" error={errors.opening} hint="Pode ser negativo (cheque especial)">
              <MoneyInput id="acc-opening" value={opening} onChange={(e) => setOpening(e.target.value)} aria-invalid={!!errors.opening} />
            </Field>
            <Field id="acc-opening-date" label="Data do saldo inicial" error={errors.openingDate}>
              <Input id="acc-opening-date" type="date" max={todayISO()} value={openingDate} onChange={(e) => setOpeningDate(e.target.value)} aria-invalid={!!errors.openingDate} />
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={submit.busy}>
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Transferência entre contas da empresa: sai de uma e entra na outra no mesmo instante. */
export function TransferDialog({ open, onOpenChange, fromAccountId }: { open: boolean; onOpenChange: (o: boolean) => void; fromAccountId?: string }) {
  const accounts = useAccounts(false, open);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO());
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const keyRef = useRef(newIdempotencyKey());
  const submit = useSubmit(() => onOpenChange(false));

  useEffect(() => {
    if (!open) return;
    setFrom(fromAccountId ?? '');
    setTo('');
    setAmount('');
    setDate(todayISO());
    setDescription('');
    setErrors({});
    keyRef.current = newIdempotencyKey();
  }, [open, fromAccountId]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = parseMoneyInput(amount);
    const next: Errors = {
      from: !from ? 'Escolha a conta de origem' : undefined,
      to: !to ? 'Escolha a conta de destino' : to === from ? 'Escolha uma conta diferente da origem' : undefined,
      amount: !value || Number(value) <= 0 ? 'Informe um valor maior que zero' : undefined,
      date: !date ? 'Informe a data' : undefined,
    };
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;
    void submit.run(
      () => http.post('/transfers', { fromAccountId: from, toAccountId: to, amount: value, transferredAt: date, description: description.trim() || null, idempotencyKey: keyRef.current }),
      'Transferência registrada',
    );
  }

  const options = accounts.data?.items ?? [];
  return (
    <Dialog open={open} onOpenChange={(o) => !submit.busy && onOpenChange(o)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transferir entre contas</DialogTitle>
          <DialogDescription>Não é receita nem despesa: só move dinheiro entre contas da empresa.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="tr-from" label="De" error={errors.from}>
              <NativeSelect id="tr-from" value={from} onChange={(e) => setFrom(e.target.value)} aria-invalid={!!errors.from}>
                <option value="">Selecione</option>
                {options.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field id="tr-to" label="Para" error={errors.to}>
              <NativeSelect id="tr-to" value={to} onChange={(e) => setTo(e.target.value)} aria-invalid={!!errors.to}>
                <option value="">Selecione</option>
                {options
                  .filter((a) => a.id !== from)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
              </NativeSelect>
            </Field>
            <Field id="tr-amount" label="Valor" error={errors.amount}>
              <MoneyInput id="tr-amount" value={amount} onChange={(e) => setAmount(e.target.value)} aria-invalid={!!errors.amount} />
            </Field>
            <Field id="tr-date" label="Data" error={errors.date}>
              <Input id="tr-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-invalid={!!errors.date} />
            </Field>
          </div>
          <Field id="tr-desc" label="Descrição (opcional)">
            <Input id="tr-desc" maxLength={200} value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={submit.busy}>
              Transferir
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Ajuste manual de saldo: exige permissão própria e justificativa, e fica no extrato como lançamento de ajuste. */
export function AdjustmentDialog({ account, onClose }: { account: Account | null; onClose: () => void }) {
  const [direction, setDirection] = useState<'IN' | 'OUT'>('IN');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO());
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const submit = useSubmit(onClose);

  useEffect(() => {
    if (!account) return;
    setDirection('IN');
    setAmount('');
    setDate(todayISO());
    setReason('');
    setErrors({});
  }, [account]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = parseMoneyInput(amount);
    const next: Errors = {
      amount: !value || Number(value) <= 0 ? 'Informe um valor maior que zero' : undefined,
      date: !date ? 'Informe a data' : date > todayISO() ? 'A data não pode ser futura' : undefined,
      reason: reason.trim().length < 10 ? 'Explique em pelo menos 10 caracteres' : undefined,
    };
    setErrors(next);
    if (Object.values(next).some(Boolean) || !account) return;
    void submit.run(() => http.post(`/accounts/${account.id}/adjustments`, { direction, amount: value, occurredAt: date, reason: reason.trim() }), 'Ajuste registrado');
  }

  return (
    <Dialog open={!!account} onOpenChange={(o) => !o && !submit.busy && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajustar saldo</DialogTitle>
          <DialogDescription>{account?.name}: use só para conciliar com o extrato do banco. O ajuste fica registrado com a sua justificativa.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <Segmented
            label="Tipo de ajuste"
            value={direction}
            onChange={setDirection}
            options={[
              { value: 'IN', label: 'Entrada (aumenta)' },
              { value: 'OUT', label: 'Saída (diminui)' },
            ]}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="adj-amount" label="Valor" error={errors.amount}>
              <MoneyInput id="adj-amount" value={amount} onChange={(e) => setAmount(e.target.value)} aria-invalid={!!errors.amount} />
            </Field>
            <Field id="adj-date" label="Data" error={errors.date}>
              <Input id="adj-date" type="date" max={todayISO()} value={date} onChange={(e) => setDate(e.target.value)} aria-invalid={!!errors.date} />
            </Field>
          </div>
          <Field id="adj-reason" label="Justificativa" error={errors.reason}>
            <Input id="adj-reason" maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} aria-invalid={!!errors.reason} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" loading={submit.busy}>
              Registrar ajuste
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
