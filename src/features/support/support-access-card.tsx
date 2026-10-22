import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, LifeBuoy, Mail, ShieldCheck, ShieldOff } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { errorMessage, http } from '@/api/client';
import type { CreateSupportGrantRequest, SupportAccessLogEntry, SupportAccessOverview, SupportGrant } from '@/api/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input, NativeSelect } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  formatAccessCount,
  formatDateTime,
  shortApiPath,
  SUPPORT_GRANT_STATUS_TONE,
  SUPPORT_HOURS_OPTIONS,
  supportGrantSchema,
  supportGrantStatusLabel,
  type SupportGrantForm,
} from './support-logic';

const KEY = ['support-access'] as const;

/** Autorizações do dono para o suporte da plataforma ver os dados (só com support:grant). */
export function SupportAccessCard() {
  const qc = useQueryClient();
  const overview = useQuery({ queryKey: KEY, queryFn: () => http.get<SupportAccessOverview>('/support-access') });
  const [revoking, setRevoking] = useState<SupportGrant | null>(null);
  const [logOf, setLogOf] = useState<SupportGrant | null>(null);
  const data = overview.data;

  async function revoke(grant: SupportGrant) {
    try {
      await http.post(`/support-access/${grant.id}/revoke`);
      toast.success('Acesso do suporte revogado');
      await qc.invalidateQueries({ queryKey: KEY });
    } catch (e) {
      toast.error(errorMessage(e));
      throw e;
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LifeBuoy className="size-5 text-primary" aria-hidden /> Acesso do suporte
        </CardTitle>
        <CardDescription>
          O suporte do RotaGest só vê os dados da empresa se você autorizar: somente leitura, por um prazo que você escolhe. Cada página que eles abrirem fica
          registrada aqui para você conferir.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {overview.isPending ? (
          <Skeleton className="h-40" />
        ) : overview.isError ? (
          <div className="space-y-2">
            <p className="text-sm text-destructive">{errorMessage(overview.error)}</p>
            <Button variant="outline" size="sm" onClick={() => overview.refetch()}>
              Tentar novamente
            </Button>
          </div>
        ) : data ? (
          <>
            {data.active ? <ActiveGrant grant={data.active} onRevoke={() => setRevoking(data.active)} onLog={() => setLogOf(data.active)} /> : <GrantForm />}

            {data.supportEmail && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="size-4 shrink-0" aria-hidden />
                <span className="min-w-0">
                  Fale com o suporte:{' '}
                  <a className="break-all font-medium text-primary hover:underline" href={`mailto:${data.supportEmail}`}>
                    {data.supportEmail}
                  </a>
                </span>
              </p>
            )}

            <section className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Histórico de autorizações</h4>
              {data.grants.length ? (
                <ul className="divide-y rounded-lg border">
                  {data.grants.map((g) => (
                    <li key={g.id}>
                      <button type="button" className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/50" onClick={() => setLogOf(g)}>
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={SUPPORT_GRANT_STATUS_TONE[g.status]}>{supportGrantStatusLabel(g.status)}</Badge>
                            <span className="text-xs text-muted-foreground">{formatAccessCount(g.accessCount)}</span>
                          </div>
                          <p className="truncate text-sm">{g.reason}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDateTime(g.createdAt)} · {g.grantedBy.name}
                          </p>
                        </div>
                        <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Você ainda não autorizou o suporte.</p>
              )}
            </section>
          </>
        ) : null}
      </CardContent>

      <ConfirmDialog
        open={!!revoking}
        onOpenChange={(o) => !o && setRevoking(null)}
        title="Revogar acesso do suporte?"
        description="O suporte deixa de ver os dados da empresa imediatamente. Você pode autorizar de novo quando precisar."
        confirmLabel="Revogar"
        destructive
        onConfirm={() => revoke(revoking!)}
      />
      <AccessLogDialog grant={logOf} onClose={() => setLogOf(null)} />
    </Card>
  );
}

function ActiveGrant({ grant, onRevoke, onLog }: { grant: SupportGrant; onRevoke: () => void; onLog: () => void }) {
  return (
    <div className="space-y-3 rounded-lg border border-primary/40 bg-accent/50 p-4">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium">Suporte autorizado até {formatDateTime(grant.expiresAt)}</p>
          <p className="break-words text-sm text-muted-foreground">“{grant.reason}”</p>
          <p className="text-xs text-muted-foreground">
            Autorizado por {grant.grantedBy.name} · {formatAccessCount(grant.accessCount)}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="destructive" onClick={onRevoke}>
          <ShieldOff /> Revogar
        </Button>
        <Button size="sm" variant="outline" onClick={onLog}>
          Ver acessos
        </Button>
      </div>
    </div>
  );
}

function GrantForm() {
  const qc = useQueryClient();
  const form = useForm<SupportGrantForm, unknown, CreateSupportGrantRequest>({
    resolver: zodResolver(supportGrantSchema),
    defaultValues: { hours: '24', reason: '' },
  });
  const { errors, isSubmitting } = form.formState;

  async function grant(values: CreateSupportGrantRequest) {
    try {
      await http.post<SupportGrant>('/support-access', values);
      form.reset({ hours: '24', reason: '' });
      toast.success('Suporte autorizado');
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      // 409 = já existe uma autorização ativa (outra aba/pessoa): recarrega para mostrar.
      await qc.invalidateQueries({ queryKey: KEY });
    }
  }

  return (
    <form className="space-y-4 rounded-lg border p-4" onSubmit={form.handleSubmit(grant)} noValidate>
      <p className="text-sm font-medium">Autorizar o suporte</p>
      <Field id="support-hours" label="Por quanto tempo" error={errors.hours?.message}>
        <NativeSelect id="support-hours" aria-invalid={!!errors.hours} {...form.register('hours')}>
          {SUPPORT_HOURS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field id="support-reason" label="Motivo" hint="Ex.: conferir o relatório de setembro que não fecha." error={errors.reason?.message}>
        <Input id="support-reason" maxLength={500} aria-invalid={!!errors.reason} {...form.register('reason')} />
      </Field>
      <Button type="submit" className="w-full sm:w-auto" loading={isSubmitting}>
        <ShieldCheck /> Autorizar acesso
      </Button>
    </form>
  );
}

function AccessLogDialog({ grant, onClose }: { grant: SupportGrant | null; onClose: () => void }) {
  const log = useQuery({
    queryKey: [...KEY, grant?.id, 'log'],
    queryFn: () => http.get<SupportAccessLogEntry[]>(`/support-access/${grant!.id}/log`),
    enabled: !!grant,
  });

  return (
    <Dialog open={!!grant} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>O que o suporte consultou</DialogTitle>
          <DialogDescription>
            {grant
              ? `${supportGrantStatusLabel(grant.status)} · de ${formatDateTime(grant.createdAt)} até ${formatDateTime(grant.revokedAt ?? grant.expiresAt)}`
              : ''}
          </DialogDescription>
        </DialogHeader>
        {grant && <p className="break-words text-sm text-muted-foreground">Motivo: “{grant.reason}”</p>}
        {log.isPending ? (
          <Skeleton className="h-32" />
        ) : log.isError ? (
          <p className="text-sm text-destructive">{errorMessage(log.error)}</p>
        ) : !log.data?.length ? (
          <p className="text-sm text-muted-foreground">O suporte não abriu nenhuma página com esta autorização.</p>
        ) : (
          <ul className="max-h-[50vh] divide-y overflow-y-auto rounded-lg border">
            {log.data.map((entry, i) => (
              <li key={`${entry.at}-${i}`} className="space-y-0.5 px-3 py-2">
                <p className="break-all font-mono text-xs">
                  <span className="font-semibold">{entry.method}</span> {shortApiPath(entry.path)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(entry.at)} · {entry.actorName ?? 'Suporte'}
                </p>
              </li>
            ))}
          </ul>
        )}
        {log.data && log.data.length >= 200 && <p className="text-xs text-muted-foreground">Mostrando as 200 leituras mais recentes.</p>}
      </DialogContent>
    </Dialog>
  );
}
