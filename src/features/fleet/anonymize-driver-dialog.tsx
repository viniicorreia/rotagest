import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { errorMessage, http } from '@/api/client';
import type { Driver } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { ANONYMIZE_CONFIRM_WORD, isAnonymizeConfirmed, useInvalidateFleet } from './use-fleet';

/** LGPD: remove nome, CPF e telefone de um motorista inativo. Irreversível; exige digitar a palavra de confirmação. */
export function AnonymizeDriverDialog({ driver, onClose }: { driver: Driver | null; onClose: () => void }) {
  const invalidate = useInvalidateFleet();
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (driver) setTyped('');
  }, [driver]);

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    if (!driver || !isAnonymizeConfirmed(typed)) return;
    setBusy(true);
    try {
      await http.post<Driver>(`/drivers/${driver.id}/anonymize`);
      await invalidate();
      toast.success('Dados pessoais do motorista removidos');
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={!!driver} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent role="alertdialog">
        <DialogHeader>
          <DialogTitle>Remover dados pessoais?</DialogTitle>
          <DialogDescription>
            O nome, o CPF e o telefone de <strong className="text-foreground">{driver?.name}</strong> serão apagados e o cadastro não poderá mais ser editado.{' '}
            <strong className="text-destructive">Esta ação é irreversível.</strong>
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          O histórico (escalas, km, despesas e lançamentos) continua guardado, mas sem identificar a pessoa. Use quando o motorista pedir a exclusão dos dados
          ou quando não houver mais motivo para mantê-los.
        </p>
        <form onSubmit={confirm} noValidate className="space-y-4">
          <Field id="anonymize-confirm" label={`Digite ${ANONYMIZE_CONFIRM_WORD} para confirmar`}>
            <Input id="anonymize-confirm" value={typed} autoComplete="off" autoFocus onChange={(e) => setTyped(e.target.value)} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
              Cancelar
            </Button>
            <Button type="submit" variant="destructive" loading={busy} disabled={!isAnonymizeConfirmed(typed)}>
              Remover dados pessoais
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
