import { format, formatDistanceToNowStrict } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Ban, Link2, MoreVertical, RotateCcw, ShieldCheck, Trash2, UserPlus, Users } from 'lucide-react';
import { useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/ui/empty-state';
import { Fab } from '@/components/ui/fab';
import { Skeleton } from '@/components/ui/skeleton';
import { errorMessage, http } from '@/api/client';
import { useAuth } from '@/lib/auth';
import type { Invitation, Member } from '@/api/types';
import { EditMemberDialog } from './edit-member-dialog';
import { InviteDialog, ShareInviteLink } from './invite-dialog';
import { useInvitations, useMembers, useResendInvitation, useTeamAction, type InviteResult } from './use-team';

type Confirm = { title: string; description: string; label: string; destructive?: boolean; action: () => Promise<unknown>; success: string };

export function TeamPage() {
  const { can, me } = useAuth();
  const canManage = can('members:manage');
  const members = useMembers();
  const invitations = useInvitations(canManage);
  const resend = useResendInvitation();
  const run = useTeamAction();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [shared, setShared] = useState<InviteResult | null>(null);

  const canTouch = (m: Member) => canManage && !m.isMe && (m.role !== 'OWNER' || me?.activeCompany?.role === 'OWNER');

  return (
    <>
      <PageHeader
        title="Equipe"
        description="Quem acessa esta empresa e com qual papel."
        actions={
          canManage && (
            <Button className="hidden md:inline-flex" onClick={() => setInviteOpen(true)}>
              <UserPlus /> Convidar
            </Button>
          )
        }
      />

      <Card>
        <CardHeader className="pb-2 md:pb-2">
          <CardTitle>Membros</CardTitle>
        </CardHeader>
        <CardContent className="p-0 md:p-0">
          {members.isPending ? (
            <div className="space-y-3 p-4">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          ) : members.isError ? (
            <p className="p-4 text-sm text-destructive">{errorMessage(members.error)}</p>
          ) : (
            <ul className="divide-y">
              {members.data.map((m) => (
                <li key={m.id} className="flex items-center gap-3 px-4 py-3 md:px-6">
                  <Avatar name={m.user.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {m.user.name} {m.isMe && <span className="text-muted-foreground">(você)</span>}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{m.user.email}</p>
                  </div>
                  <div className="hidden text-xs text-muted-foreground lg:block">
                    desde {format(new Date(m.joinedAt), 'dd/MM/yyyy')}
                  </div>
                  <div className="flex flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-2">
                    <Badge variant={m.role === 'OWNER' ? 'default' : 'outline'}>{m.roleLabel}</Badge>
                    {m.status === 'INACTIVE' && <Badge variant="secondary">Desativado</Badge>}
                  </div>
                  {canTouch(m) ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label={`Ações para ${m.user.name}`}>
                          <MoreVertical />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => setEditing(m)}>
                          <ShieldCheck /> Alterar papel e permissões
                        </DropdownMenuItem>
                        {m.status === 'ACTIVE' ? (
                          <DropdownMenuItem
                            onSelect={() =>
                              setConfirm({
                                title: 'Desativar acesso?',
                                description: `${m.user.name} perde o acesso imediatamente. O histórico é mantido e você pode reativar depois.`,
                                label: 'Desativar',
                                destructive: true,
                                action: () => http.post(`/members/${m.id}/deactivate`),
                                success: 'Acesso desativado',
                              })
                            }
                          >
                            <Ban /> Desativar acesso
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onSelect={() => run(() => http.post(`/members/${m.id}/reactivate`), 'Acesso reativado').catch(() => undefined)}>
                            <RotateCcw /> Reativar acesso
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onSelect={() =>
                            setConfirm({
                              title: 'Remover da empresa?',
                              description: `${m.user.name} deixa de ter acesso a esta empresa. A conta da pessoa continua existindo.`,
                              label: 'Remover',
                              destructive: true,
                              action: () => http.delete(`/members/${m.id}`),
                              success: 'Membro removido',
                            })
                          }
                        >
                          <Trash2 /> Remover
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <span className="size-11 md:size-10" aria-hidden />
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {canManage && (
        <Card className="mt-6">
          <CardHeader className="pb-2 md:pb-2">
            <CardTitle>Convites pendentes</CardTitle>
          </CardHeader>
          <CardContent className={invitations.data?.length ? 'p-0 md:p-0' : undefined}>
            {invitations.isPending ? (
              <Skeleton className="h-14" />
            ) : !invitations.data?.length ? (
              <EmptyState
                icon={Users}
                title="Nenhum convite pendente"
                description="Convide motoristas, gestores ou o financeiro para trabalhar com você."
                action={
                  <Button variant="outline" onClick={() => setInviteOpen(true)}>
                    <UserPlus /> Convidar
                  </Button>
                }
              />
            ) : (
              <ul className="divide-y">
                {invitations.data.map((inv: Invitation) => (
                  <li key={inv.id} className="flex flex-wrap items-center gap-3 px-4 py-3 md:px-6">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{inv.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {inv.roleLabel} ·{' '}
                        {inv.status === 'EXPIRED'
                          ? 'expirado'
                          : `expira em ${formatDistanceToNowStrict(new Date(inv.expiresAt), { locale: ptBR })}`}
                      </p>
                    </div>
                    {inv.status === 'EXPIRED' && <Badge variant="warning">Expirado</Badge>}
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        loading={resend.isPending && resend.variables === inv.id}
                        onClick={async () => setShared(await resend.mutateAsync(inv.id))}
                      >
                        <Link2 /> Novo link
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() =>
                          setConfirm({
                            title: 'Revogar convite?',
                            description: `O link enviado para ${inv.email} deixa de funcionar.`,
                            label: 'Revogar',
                            destructive: true,
                            action: () => http.post(`/invitations/${inv.id}/revoke`),
                            success: 'Convite revogado',
                          })
                        }
                      >
                        Revogar
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {canManage && <Fab icon={UserPlus} label="Convidar pessoa" onClick={() => setInviteOpen(true)} />}
      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} />
      <EditMemberDialog member={editing} onClose={() => setEditing(null)} />
      <Dialog open={!!shared} onOpenChange={(o) => !o && setShared(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo link gerado</DialogTitle>
          </DialogHeader>
          {shared && <ShareInviteLink result={shared} />}
          <DialogFooter>
            <Button onClick={() => setShared(null)}>Concluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {confirm && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setConfirm(null)}
          title={confirm.title}
          description={confirm.description}
          confirmLabel={confirm.label}
          destructive={confirm.destructive}
          onConfirm={() => run(confirm.action, confirm.success).catch(() => undefined)}
        />
      )}
    </>
  );
}
