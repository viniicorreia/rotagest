import { format } from 'date-fns';
import { Ban, Building2, LifeBuoy, LogIn, RotateCcw, Search, ShieldOff, XCircle } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { errorMessage, http } from '@/api/client';
import type { CompanyStatus, PlatformCompany, PlatformCompanyDetail, PlatformSupportAccess } from '@/api/types';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Input, NativeSelect } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ReasonDialog } from '@/features/finance/reason-dialog';
import { formatDateTime } from '@/features/support/support-logic';
import { useAuth } from '@/lib/auth';
import { formatDocument } from '@/lib/documents';
import { cn } from '@/lib/utils';
import { auditActionLabel, COMPANY_STATUS_LABELS, formatUsage } from './labels';
import { ErrorState, Pagination } from './platform-ui';
import { CompanyStatusBadge, SubscriptionStatusBadge } from './status-badge';
import { useInvalidatePlatform, usePlatformCompanies, usePlatformCompany } from './use-platform';

const PAGE_SIZE = 20;
const STATUSES = Object.keys(COMPANY_STATUS_LABELS) as CompanyStatus[];

function formatDate(value: string | null | undefined): string {
  return value ? format(new Date(value), 'dd/MM/yyyy') : '—';
}

function place(c: Pick<PlatformCompany, 'city' | 'state'>): string {
  return [c.city, c.state].filter(Boolean).join('/') || '—';
}

/** Empresas clientes do SaaS: filtros na URL; o detalhe abre por ?id=. */
export function PlatformCompaniesPage() {
  const [params, setParams] = useSearchParams();
  const search = params.get('search') ?? '';
  const statusParam = params.get('status') ?? '';
  const status = STATUSES.includes(statusParam as CompanyStatus) ? (statusParam as CompanyStatus) : undefined;
  const page = Math.max(1, Number(params.get('page')) || 1);
  const detailId = params.get('id');
  const [searchInput, setSearchInput] = useState(search);

  useEffect(() => setSearchInput(search), [search]);

  function set(key: string, value: string) {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set(key, value);
        else next.delete(key);
        if (key !== 'page' && key !== 'id') next.delete('page');
        return next;
      },
      { replace: key !== 'id' },
    );
  }

  const list = usePlatformCompanies({ search: search || undefined, status, page, pageSize: PAGE_SIZE });
  const data = list.data;
  const filtered = !!(search || status);

  return (
    <>
      <PageHeader title="Empresas" description="Empresas cadastradas, plano, uso e situação de acesso." />

      <Card className="mb-4 grid gap-2 p-3 sm:grid-cols-[1fr_220px]">
        <form
          className="relative"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            set('search', searchInput.trim());
          }}
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            aria-label="Buscar empresa"
            placeholder="Buscar por nome ou documento"
            className="pl-9"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onBlur={() => searchInput.trim() !== search && set('search', searchInput.trim())}
          />
        </form>
        <NativeSelect aria-label="Situação" value={status ?? ''} onChange={(e) => set('status', e.target.value)}>
          <option value="">Todas as situações</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {COMPANY_STATUS_LABELS[s]}
            </option>
          ))}
        </NativeSelect>
      </Card>

      {list.isPending ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : list.isError ? (
        <ErrorState error={list.error} onRetry={() => list.refetch()} />
      ) : !data?.items.length ? (
        <EmptyState
          icon={Building2}
          title={filtered ? 'Nenhuma empresa com estes filtros' : 'Nenhuma empresa cadastrada'}
          description={filtered ? 'Ajuste a busca ou a situação.' : 'As empresas aparecem aqui assim que alguém conclui o cadastro.'}
          action={
            filtered && (
              <Button variant="outline" onClick={() => setParams({}, { replace: true })}>
                Limpar filtros
              </Button>
            )
          }
        />
      ) : (
        <Card className={cn('overflow-hidden', list.isFetching && 'opacity-70')}>
          <ul className="divide-y md:hidden">
            {data.items.map((c) => (
              <li key={c.id}>
                <button type="button" className="w-full space-y-1.5 px-4 py-3 text-left hover:bg-muted/50" onClick={() => set('id', c.id)}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{c.tradeName}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {formatDocument(c.document)} · {place(c)}
                      </p>
                    </div>
                    <CompanyStatusBadge status={c.status} className="shrink-0" />
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    {c.subscription ? (
                      <>
                        <span className="font-medium text-foreground">{c.subscription.plan.name}</span>
                        <SubscriptionStatusBadge status={c.subscription.status} />
                      </>
                    ) : (
                      <span>Sem assinatura</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatUsage(c.usage.vehicles, c.usage.maxVehicles, 'veículo', 'veículos')} · {formatUsage(c.usage.users, c.usage.maxUsers, 'usuário', 'usuários')} · criada em{' '}
                    {formatDate(c.createdAt)}
                  </p>
                </button>
              </li>
            ))}
          </ul>
          <table className="hidden w-full text-sm md:table">
            <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Empresa</th>
                <th className="px-4 py-2 font-medium">Cidade/UF</th>
                <th className="px-4 py-2 font-medium">Situação</th>
                <th className="px-4 py-2 font-medium">Plano</th>
                <th className="px-4 py-2 font-medium">Uso</th>
                <th className="px-4 py-2 font-medium">Criada em</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.items.map((c) => (
                <tr
                  key={c.id}
                  className="cursor-pointer hover:bg-muted/40"
                  tabIndex={0}
                  onClick={() => set('id', c.id)}
                  onKeyDown={(e) => e.key === 'Enter' && set('id', c.id)}
                >
                  <td className="max-w-xs px-4 py-3">
                    <p className="truncate font-medium">{c.tradeName}</p>
                    <p className="truncate text-xs text-muted-foreground tabular-nums">{formatDocument(c.document)}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{place(c)}</td>
                  <td className="px-4 py-3">
                    <CompanyStatusBadge status={c.status} />
                  </td>
                  <td className="px-4 py-3">
                    {c.subscription ? (
                      <div className="space-y-1">
                        <p className="truncate">{c.subscription.plan.name}</p>
                        <SubscriptionStatusBadge status={c.subscription.status} />
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Sem assinatura</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">
                    <p>{formatUsage(c.usage.vehicles, c.usage.maxVehicles, 'veículo', 'veículos')}</p>
                    <p>{formatUsage(c.usage.users, c.usage.maxUsers, 'usuário', 'usuários')}</p>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">{formatDate(c.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} pageSize={data.pageSize || PAGE_SIZE} total={data.total} noun="empresas" onPage={(p) => set('page', String(p))} />
        </Card>
      )}

      <CompanyDetailDialog id={detailId} onClose={() => set('id', '')} />
    </>
  );
}

type StatusAction = { status: CompanyStatus; title: string; label: string; description: string };

const ACTIONS: Record<'suspend' | 'reactivate' | 'cancel', StatusAction> = {
  suspend: {
    status: 'SUSPENDED',
    title: 'Suspender empresa?',
    label: 'Suspender',
    description: 'Suspender bloqueia o acesso de todos os membros desta empresa até que ela seja reativada. Nada é apagado: cadastros, lançamentos e histórico continuam guardados.',
  },
  reactivate: {
    status: 'ACTIVE',
    title: 'Reativar empresa?',
    label: 'Reativar',
    description: 'Os membros voltam a acessar a empresa normalmente, com todos os dados como estavam.',
  },
  cancel: {
    status: 'CANCELED',
    title: 'Cancelar empresa?',
    label: 'Cancelar empresa',
    description: 'A empresa é encerrada e todos os membros perdem o acesso. Nada é apagado: os dados ficam guardados e a empresa pode ser reativada depois.',
  },
};

function CompanyDetailDialog({ id, onClose }: { id: string | null; onClose: () => void }) {
  const detail = usePlatformCompany(id);
  const invalidate = useInvalidatePlatform();
  const [action, setAction] = useState<StatusAction | null>(null);
  const c = detail.data;

  async function changeStatus(reason: string) {
    if (!id || !action) return;
    try {
      await http.post(`/platform/companies/${id}/status`, { status: action.status, reason });
      toast.success(action.status === 'ACTIVE' ? 'Empresa reativada' : action.status === 'SUSPENDED' ? 'Empresa suspensa' : 'Empresa cancelada');
      await invalidate();
    } catch (e) {
      toast.error(errorMessage(e));
      throw e;
    }
  }

  return (
    <>
      <Dialog open={!!id} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="truncate">{c?.tradeName ?? 'Empresa'}</DialogTitle>
            <DialogDescription>{c ? `${formatDocument(c.document)} · criada em ${formatDate(c.createdAt)}` : 'Carregando…'}</DialogDescription>
          </DialogHeader>
          {detail.isPending ? (
            <div className="space-y-3">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
          ) : detail.isError ? (
            <ErrorState error={detail.error} onRetry={() => detail.refetch()} />
          ) : c ? (
            <CompanyDetailBody company={c} onAction={setAction} />
          ) : null}
        </DialogContent>
      </Dialog>
      <ReasonDialog
        open={!!action}
        onOpenChange={(o) => !o && setAction(null)}
        title={action?.title ?? ''}
        description={action?.description ?? ''}
        confirmLabel={action?.label ?? ''}
        tone={action?.status === 'ACTIVE' ? 'default' : 'destructive'}
        onConfirm={changeStatus}
      />
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h4>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-right">{value || '—'}</dd>
    </div>
  );
}

function CompanyDetailBody({ company: c, onAction }: { company: PlatformCompanyDetail; onAction: (a: StatusAction) => void }) {
  const sub = c.subscription;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <CompanyStatusBadge status={c.status} />
        <div className="ml-auto flex flex-wrap gap-2">
          {c.status !== 'ACTIVE' && (
            <Button size="sm" variant="outline" onClick={() => onAction(ACTIONS.reactivate)}>
              <RotateCcw /> Reativar
            </Button>
          )}
          {c.status === 'ACTIVE' && (
            <Button size="sm" variant="outline" onClick={() => onAction(ACTIONS.suspend)}>
              <Ban /> Suspender
            </Button>
          )}
          {c.status !== 'CANCELED' && (
            <Button size="sm" variant="outline" className="text-destructive" onClick={() => onAction(ACTIONS.cancel)}>
              <XCircle /> Cancelar
            </Button>
          )}
        </div>
      </div>

      <Section title="Acesso aos dados">
        <SupportAccessBox companyId={c.id} access={c.supportAccess} />
      </Section>

      <div className="grid gap-6 sm:grid-cols-2">
        <Section title="Cadastro">
          <dl className="space-y-1.5">
            <Row label="Razão social" value={c.legalName} />
            <Row label="Documento" value={formatDocument(c.document)} />
            <Row label="E-mail" value={c.email} />
            <Row label="Telefone" value={c.phone} />
            <Row label="Cidade/UF" value={place(c)} />
          </dl>
        </Section>

        <Section title="Assinatura e uso">
          <dl className="space-y-1.5">
            {sub ? (
              <>
                <Row label="Plano" value={sub.plan.name} />
                <Row label="Situação" value={<SubscriptionStatusBadge status={sub.status} />} />
                {sub.trialEndsAt && <Row label="Teste até" value={formatDate(sub.trialEndsAt)} />}
                {sub.currentPeriodEnd && <Row label="Período até" value={formatDate(sub.currentPeriodEnd)} />}
              </>
            ) : (
              <Row label="Plano" value="Sem assinatura" />
            )}
            <Row label="Veículos" value={formatUsage(c.usage.vehicles, c.usage.maxVehicles, 'veículo', 'veículos')} />
            <Row label="Usuários" value={formatUsage(c.usage.users, c.usage.maxUsers, 'usuário', 'usuários')} />
          </dl>
        </Section>
      </div>

      <Section title="Proprietários">
        {c.owners.length ? (
          <ul className="divide-y rounded-lg border">
            {c.owners.map((o) => (
              <li key={o.id} className="px-3 py-2">
                <p className="truncate text-sm font-medium">{o.name}</p>
                <p className="truncate text-xs text-muted-foreground">{o.email}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum proprietário ativo.</p>
        )}
      </Section>

      <Section title="Histórico">
        {c.history.length ? (
          <ol className="space-y-3 border-l pl-4">
            {c.history.map((h) => (
              <li key={h.id} className="relative">
                <span className="absolute -left-[21px] top-1.5 size-2 rounded-full bg-primary" aria-hidden />
                <p className="text-sm font-medium">{auditActionLabel(h.action)}</p>
                {h.reason && <p className="break-words text-sm text-muted-foreground">“{h.reason}”</p>}
                <p className="text-xs text-muted-foreground">
                  {format(new Date(h.createdAt), 'dd/MM/yyyy HH:mm')} · {h.actor ? h.actor.name : 'Sistema'}
                </p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhuma ação registrada.</p>
        )}
      </Section>
    </div>
  );
}

/** Modo suporte: só com autorização vigente do dono; a API revalida ao abrir a sessão. */
function SupportAccessBox({ companyId, access }: { companyId: string; access: PlatformSupportAccess | null }) {
  const { startSupportSession } = useAuth();
  const navigate = useNavigate();
  const invalidate = useInvalidatePlatform();
  const [busy, setBusy] = useState(false);

  if (!access) {
    return (
      <p className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-2.5 text-sm text-muted-foreground">
        <ShieldOff className="size-4 shrink-0" aria-hidden />A empresa não autorizou acesso aos dados
      </p>
    );
  }

  async function enter() {
    setBusy(true);
    try {
      await startSupportSession(companyId);
      navigate('/app/dashboard');
      toast.success('Modo suporte: somente leitura');
    } catch (e) {
      toast.error(errorMessage(e));
      setBusy(false);
      // 409: a autorização expirou ou foi revogada enquanto a tela estava aberta.
      await invalidate();
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-amber-400/60 bg-amber-50 p-3 text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
      <div className="flex items-start gap-2">
        <LifeBuoy className="mt-0.5 size-4 shrink-0" aria-hidden />
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium">Autorizado até {formatDateTime(access.expiresAt)}</p>
          <p className="break-words text-sm opacity-80">“{access.reason}”</p>
          <p className="text-xs opacity-80">Somente leitura. O dono vê cada página que você abrir.</p>
        </div>
      </div>
      <Button size="sm" loading={busy} onClick={enter}>
        <LogIn /> Entrar como suporte
      </Button>
    </div>
  );
}
