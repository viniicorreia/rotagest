import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { MemberRole } from '@/api/types';
import { errorMessage, http } from '@/api/client';
import type { Invitation, Member } from '@/api/types';

export const teamKeys = { members: ['members'] as const, invitations: ['invitations'] as const };

export function useMembers(enabled = true) {
  return useQuery({ queryKey: teamKeys.members, queryFn: () => http.get<Member[]>('/members'), enabled });
}

export function useInvitations(enabled: boolean) {
  return useQuery({ queryKey: teamKeys.invitations, queryFn: () => http.get<Invitation[]>('/invitations'), enabled });
}

/** Invalida equipe e assinatura (uso de usuários) após qualquer alteração. */
function useInvalidateTeam() {
  const qc = useQueryClient();
  return () => Promise.all([qc.invalidateQueries({ queryKey: ['members'] }), qc.invalidateQueries({ queryKey: ['invitations'] }), qc.invalidateQueries({ queryKey: ['subscription'] })]);
}

export interface InviteResult {
  invitation: Invitation;
  inviteUrl: string;
}

export function useInvite() {
  const invalidate = useInvalidateTeam();
  return useMutation({
    mutationFn: (body: { email: string; role: MemberRole; permissions: string[] }) => http.post<InviteResult>('/invitations', body),
    onSuccess: invalidate,
  });
}

export function useResendInvitation() {
  const invalidate = useInvalidateTeam();
  return useMutation({
    mutationFn: (id: string) => http.post<InviteResult>(`/invitations/${id}/resend`),
    onSuccess: invalidate,
    onError: (e) => toast.error(errorMessage(e)),
  });
}

export function useTeamAction() {
  const invalidate = useInvalidateTeam();
  return async (action: () => Promise<unknown>, success: string) => {
    try {
      await action();
      await invalidate();
      toast.success(success);
    } catch (e) {
      toast.error(errorMessage(e));
      throw e;
    }
  };
}
