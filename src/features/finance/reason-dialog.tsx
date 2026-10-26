import { useEffect, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

interface ReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  minLength?: number;
  children?: ReactNode;
  /** Ações que desfazem um bloqueio (ex.: reativar) não usam o botão vermelho. */
  tone?: 'destructive' | 'default';
  onConfirm: (reason: string) => Promise<unknown>;
}

/** Confirmação de ação financeira que exige justificativa (estorno, cancelamento, ajuste). */
export function ReasonDialog({ open, onOpenChange, title, description, confirmLabel, minLength = 10, children, tone = 'destructive', onConfirm }: ReasonDialogProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setReason('');
      setError(undefined);
    }
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (reason.trim().length < minLength) return setError(`Explique em pelo menos ${minLength} caracteres`);
    setBusy(true);
    try {
      await onConfirm(reason.trim());
      onOpenChange(false);
    } catch {
      /* o chamador mostra o erro */
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent role="alertdialog">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="space-y-4">
          {children}
          <Field id="reason" label="Justificativa" error={error}>
            <Input id="reason" value={reason} maxLength={500} autoFocus onChange={(e) => setReason(e.target.value)} aria-invalid={!!error} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Voltar
            </Button>
            <Button type="submit" variant={tone === 'destructive' ? 'destructive' : 'default'} loading={busy}>
              {confirmLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
