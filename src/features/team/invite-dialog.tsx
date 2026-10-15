import { Check, Copy, MessageCircle } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import type { MemberRole } from '@/api/types';
import { emailSchema } from '@/lib/forms';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { errorMessage } from '@/api/client';
import { useAuth } from '@/lib/auth';
import { RolePicker } from './role-picker';
import { useInvite, type InviteResult } from './use-team';

export function ShareInviteLink({ result }: { result: InviteResult }) {
  const [copied, setCopied] = useState(false);
  const text = `Você foi convidado(a) para o RotaGest como ${result.invitation.roleLabel}. Aceite pelo link: ${result.inviteUrl}`;
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Enviamos o convite para <strong className="text-foreground">{result.invitation.email}</strong>. Você também pode compartilhar o link
        diretamente. Ele vale por 7 dias e só funciona com esse e-mail.
      </p>
      <div className="flex gap-2">
        <Input readOnly value={result.inviteUrl} aria-label="Link do convite" onFocus={(e) => e.currentTarget.select()} />
        <Button
          variant="outline"
          size="icon"
          aria-label="Copiar link"
          onClick={async () => {
            await navigator.clipboard.writeText(result.inviteUrl);
            setCopied(true);
            toast.success('Link copiado');
          }}
        >
          {copied ? <Check /> : <Copy />}
        </Button>
      </div>
      <Button asChild variant="outline" className="w-full">
        <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer noopener">
          <MessageCircle /> Enviar pelo WhatsApp
        </a>
      </Button>
    </div>
  );
}

export function InviteDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { me } = useAuth();
  const invite = useInvite();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<MemberRole>('DRIVER');
  const [permissions, setPermissions] = useState<string[]>([]);
  const [emailError, setEmailError] = useState<string>();
  const [result, setResult] = useState<InviteResult | null>(null);

  function reset(o: boolean) {
    onOpenChange(o);
    if (!o) {
      setEmail('');
      setRole('DRIVER');
      setPermissions([]);
      setEmailError(undefined);
      setResult(null);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) return setEmailError(parsed.error.issues[0].message);
    setEmailError(undefined);
    try {
      setResult(await invite.mutateAsync({ email: parsed.data, role, permissions: role === 'MANAGER' ? permissions : [] }));
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{result ? 'Convite criado' : 'Convidar pessoa'}</DialogTitle>
          {!result && <DialogDescription>A pessoa recebe um link para criar a conta (ou entrar) e acessar esta empresa.</DialogDescription>}
        </DialogHeader>
        {result ? (
          <>
            <ShareInviteLink result={result} />
            <DialogFooter>
              <Button onClick={() => reset(false)}>Concluir</Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={submit} noValidate className="space-y-4">
            <Field id="invite-email" label="E-mail" error={emailError}>
              <Input id="invite-email" type="email" inputMode="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!emailError} />
            </Field>
            <RolePicker role={role} onRoleChange={setRole} permissions={permissions} onPermissionsChange={setPermissions} allowOwner={me?.activeCompany?.role === 'OWNER'} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => reset(false)}>
                Cancelar
              </Button>
              <Button type="submit" loading={invite.isPending}>
                Enviar convite
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
