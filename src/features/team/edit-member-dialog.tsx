import { useEffect, useState } from 'react';
import type { MemberRole } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { http } from '@/api/client';
import { useAuth } from '@/lib/auth';
import type { Member } from '@/api/types';
import { RolePicker } from './role-picker';
import { useTeamAction } from './use-team';

export function EditMemberDialog({ member, onClose }: { member: Member | null; onClose: () => void }) {
  const { me } = useAuth();
  const run = useTeamAction();
  const [role, setRole] = useState<MemberRole>('DRIVER');
  const [permissions, setPermissions] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (member) {
      setRole(member.role);
      setPermissions(member.extraPermissions);
    }
  }, [member]);

  async function save() {
    if (!member) return;
    setBusy(true);
    try {
      await run(
        () => http.patch(`/members/${member.id}`, { role, permissions: role === 'MANAGER' ? permissions : [] }),
        'Acesso atualizado',
      );
      onClose();
    } catch {
      /* toast já exibido */
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={!!member} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Alterar acesso</DialogTitle>
          <DialogDescription>{member?.user.name}</DialogDescription>
        </DialogHeader>
        <RolePicker role={role} onRoleChange={setRole} permissions={permissions} onPermissionsChange={setPermissions} allowOwner={me?.activeCompany?.role === 'OWNER'} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={save} loading={busy}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
