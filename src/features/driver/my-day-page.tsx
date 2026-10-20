import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Camera, CheckCircle2, Gauge, MapPin, Paperclip, Pencil, Plus, Receipt, Trash2, Truck, Undo2, UserX } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { errorMessage, http } from '@/api/client';
import type { CreateDailyLogRequest, CreateDriverExpenseRequest, DailyLog, DailyLogList, DriverExpense, DriverExpenseList, ExpenseCategoryList, FuelType, MyAssignments, UpdateDailyLogRequest } from '@/api/types';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { Input, NativeSelect } from '@/components/ui/input';
import { MoneyInput } from '@/components/ui/money-input';
import { Segmented } from '@/components/ui/segmented';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/auth';
import { formatDateBR, todayISO } from '@/lib/dates';
import { formatBRL, parseMoneyInput } from '@/lib/money';
import { ACCEPTED_FILES, MAX_FILE_MB, uploadAttachment } from '../finance/attachments';
import { ExpenseStatusBadge, FUEL_TYPE_LABELS, FuelDetail, formatDecimal, formatOdometer, parseDecimalInput } from './shared';

/** Início de /app: motorista (sem acesso à frota) cai direto no "Meu dia". */
export function AppIndexRedirect() {
  const { can } = useAuth();
  return <Navigate to={can('assignments:own') && !can('fleet:read') ? 'my' : 'dashboard'} replace />;
}

const KM_PATTERN = /^\d{1,4}(\.\d)?$/;
const LITERS_PATTERN = /^\d{1,5}(\.\d{1,3})?$/;
const PRICE_PER_LITER_PATTERN = /^\d{1,3}(\.\d{1,4})?$/;
const ODOMETER_PATTERN = /^\d{1,7}$/;
const RECENT_DAYS = 30;
const PAGE_SIZE = 20;

type Errors = Record<string, string | undefined>;

function useMyAssignments() {
  return useQuery({ queryKey: ['my-assignments'], queryFn: () => http.get<MyAssignments>('/assignments/mine') });
}

function useMyLogs(enabled: boolean) {
  const from = format(subDays(new Date(), RECENT_DAYS), 'yyyy-MM-dd');
  return useQuery({
    queryKey: ['daily-logs', 'mine', from],
    queryFn: () => http.get<DailyLogList>(`/daily-logs?from=${from}&to=${todayISO()}`),
    enabled,
  });
}

function useInvalidateMine() {
  const qc = useQueryClient();
  return () => Promise.all(['daily-logs', 'my-expenses', 'my-assignments'].map((k) => qc.invalidateQueries({ queryKey: [k] })));
}

export function MyDayPage() {
  const mine = useMyAssignments();
  const today = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR });

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Meu dia" description={today.charAt(0).toUpperCase() + today.slice(1)} />
      {mine.isPending ? (
        <div className="space-y-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-48" />
        </div>
      ) : mine.isError ? (
        <Card>
          <CardContent className="p-4 md:p-6">
            <p className="text-sm text-destructive">{errorMessage(mine.error)}</p>
            <Button variant="outline" className="mt-3" onClick={() => mine.refetch()}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      ) : !mine.data.driver ? (
        <EmptyState icon={UserX} title="Cadastro de motorista não encontrado" description="Seu usuário ainda não está ligado a um motorista. Peça ao gestor." />
      ) : (
        <div className="space-y-6">
          <TodayCard data={mine.data} />
          <KmSection data={mine.data} />
          <ExpensesSection data={mine.data} />
        </div>
      )}
    </div>
  );
}

function TodayCard({ data }: { data: MyAssignments }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Olá, {data.driver?.name}</CardTitle>
        <p className="text-sm text-muted-foreground">Sua escala de hoje</p>
      </CardHeader>
      <CardContent>
        {data.assignments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Você não tem rota escalada para hoje.</p>
        ) : (
          <ul className="space-y-2">
            {data.assignments.map((a) => (
              <li key={a.id} className="flex items-start gap-3 rounded-lg border p-3">
                <MapPin className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{a.route.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {a.vehicle ? `${a.vehicle.name} · ${a.vehicle.plate}` : 'Sem veículo definido'}
                  </p>
                  {a.notes && <p className="mt-1 text-xs text-muted-foreground">{a.notes}</p>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// km do dia
// ---------------------------------------------------------------------------

function KmSection({ data }: { data: MyAssignments }) {
  const logs = useMyLogs(true);
  const [editing, setEditing] = useState<DailyLog | null>(null);
  const [deleting, setDeleting] = useState<DailyLog | null>(null);
  const invalidate = useInvalidateMine();
  const today = todayISO();
  const items = logs.data?.items ?? [];

  return (
    <section className="space-y-3" aria-labelledby="km-title">
      <h2 id="km-title" className="flex items-center gap-2 text-lg font-semibold">
        <Gauge className="size-5" aria-hidden /> Km do dia
      </h2>
      {data.vehicles.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Nenhum veículo escalado para você hoje.</p>
      ) : logs.isPending ? (
        <Skeleton className="h-48" />
      ) : (
        data.vehicles.map((v) => {
          const done = items.find((l) => l.vehicle.id === v.id && l.date === today);
          return (
            <Card key={v.id}>
              <CardHeader className="pb-2 md:pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Truck className="size-5 shrink-0 text-primary" aria-hidden />
                  <span className="min-w-0 truncate">{v.name}</span>
                  <span className="shrink-0 text-sm font-normal text-muted-foreground">{v.plate}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {done ? (
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="size-6 shrink-0 text-primary" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="text-2xl font-semibold tabular-nums">{formatDecimal(done.kmDriven)} km</p>
                      <p className="text-sm text-muted-foreground">Registrado hoje</p>
                    </div>
                    {done.editable && (
                      <Button variant="outline" onClick={() => setEditing(done)}>
                        <Pencil /> Corrigir
                      </Button>
                    )}
                  </div>
                ) : (
                  <KmForm vehicleId={v.id} onDone={invalidate} />
                )}
              </CardContent>
            </Card>
          );
        })
      )}

      <Card>
        <CardHeader className="pb-2 md:pb-3">
          <CardTitle className="text-base">Últimos {RECENT_DAYS} dias</CardTitle>
          {logs.data && (
            <p className="text-sm text-muted-foreground">
              {logs.data.summary.days} {logs.data.summary.days === 1 ? 'registro' : 'registros'} · {formatDecimal(logs.data.summary.km)} km
            </p>
          )}
        </CardHeader>
        <CardContent>
          {logs.isPending ? (
            <Skeleton className="h-24" />
          ) : logs.isError ? (
            <p className="text-sm text-destructive">{errorMessage(logs.error)}</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum km registrado ainda.</p>
          ) : (
            <ul className="divide-y">
              {items.map((l) => (
                <li key={l.id} className="flex items-center gap-2 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium tabular-nums">
                      {formatDateBR(l.date)} · {formatDecimal(l.kmDriven)} km
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {l.vehicle.plate}
                      {l.route ? ` · ${l.route.name}` : ''}
                      {l.odometerStart !== null ? ` · ${formatOdometer(l.odometerStart)} → ${formatOdometer(l.odometerEnd)}` : ''}
                    </p>
                    {l.billed && <p className="text-xs text-muted-foreground">Já faturado</p>}
                  </div>
                  {l.editable && (
                    <>
                      <Button size="icon" variant="ghost" aria-label={`Corrigir registro de ${formatDateBR(l.date)}`} onClick={() => setEditing(l)}>
                        <Pencil />
                      </Button>
                      <Button size="icon" variant="ghost" className="text-destructive" aria-label={`Excluir registro de ${formatDateBR(l.date)}`} onClick={() => setDeleting(l)}>
                        <Trash2 />
                      </Button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Corrigir km</DialogTitle>
            <DialogDescription>
              {editing && `${editing.vehicle.name} · ${editing.vehicle.plate} · ${formatDateBR(editing.date)}`}
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <KmForm
              key={editing.id}
              vehicleId={editing.vehicle.id}
              editing={editing}
              onDone={async () => {
                setEditing(null);
                await invalidate();
              }}
              onCancel={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Excluir registro de km?"
        description={deleting ? `${formatDecimal(deleting.kmDriven)} km em ${formatDateBR(deleting.date)} (${deleting.vehicle.plate}).` : ''}
        confirmLabel="Excluir"
        destructive
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await http.delete(`/daily-logs/${deleting.id}`);
            toast.success('Registro excluído');
            await invalidate();
          } catch (e) {
            toast.error(errorMessage(e));
          }
        }}
      />
    </section>
  );
}

type KmMode = 'km' | 'odometer';

/** Lançamento rápido dos km: digita os km rodados ou os dois hodômetros (a API calcula a diferença). */
function KmForm({ vehicleId, editing, onDone, onCancel }: { vehicleId: string; editing?: DailyLog; onDone: () => unknown; onCancel?: () => void }) {
  const [mode, setMode] = useState<KmMode>(editing?.odometerStart != null ? 'odometer' : 'km');
  const [km, setKm] = useState(editing ? formatDecimal(editing.kmDriven) : '');
  const [start, setStart] = useState(editing?.odometerStart != null ? String(editing.odometerStart) : '');
  const [end, setEnd] = useState(editing?.odometerEnd != null ? String(editing.odometerEnd) : '');
  const [date, setDate] = useState(editing?.date ?? todayISO());
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const id = editing?.id ?? vehicleId;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next: Errors = {};
    let body: Partial<CreateDailyLogRequest> = {};
    if (mode === 'km') {
      const value = parseDecimalInput(km, KM_PATTERN);
      if (!value || Number(value) <= 0) next.km = 'Informe os km rodados (ex.: 120,5)';
      body = { kmDriven: value ?? undefined, odometerStart: null, odometerEnd: null };
    } else {
      if (!ODOMETER_PATTERN.test(start.trim())) next.start = 'Informe o hodômetro de saída';
      if (!ODOMETER_PATTERN.test(end.trim())) next.end = 'Informe o hodômetro de chegada';
      else if (!next.start && Number(end) < Number(start)) next.end = 'A chegada deve ser maior ou igual à saída';
      body = { odometerStart: Number(start), odometerEnd: Number(end) };
    }
    if (!editing && (!date || date > todayISO())) next.date = 'Informe uma data até hoje';
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;
    setBusy(true);
    try {
      if (editing) await http.patch<DailyLog>(`/daily-logs/${editing.id}`, body satisfies UpdateDailyLogRequest);
      else await http.post<DailyLog>('/daily-logs', { ...body, vehicleId, date } satisfies CreateDailyLogRequest);
      toast.success(editing ? 'Km corrigido' : 'Km registrado');
      await onDone();
      if (!editing) {
        setKm('');
        setStart('');
        setEnd('');
      }
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <Segmented
        label="Como informar"
        value={mode}
        onChange={setMode}
        options={[
          { value: 'km', label: 'Km rodados' },
          { value: 'odometer', label: 'Hodômetro' },
        ]}
      />
      {mode === 'km' ? (
        <Field id={`km-${id}`} label="Km rodados" error={errors.km}>
          <Input
            id={`km-${id}`}
            inputMode="decimal"
            autoComplete="off"
            placeholder="0"
            className="h-14 text-2xl font-semibold tabular-nums md:h-14 md:text-2xl"
            value={km}
            onChange={(e) => setKm(e.target.value)}
            aria-invalid={!!errors.km}
          />
        </Field>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Field id={`start-${id}`} label="Saída" error={errors.start}>
            <Input id={`start-${id}`} inputMode="numeric" autoComplete="off" className="h-14 text-xl tabular-nums md:h-14 md:text-xl" value={start} onChange={(e) => setStart(e.target.value.replace(/\D/g, ''))} aria-invalid={!!errors.start} />
          </Field>
          <Field id={`end-${id}`} label="Chegada" error={errors.end}>
            <Input id={`end-${id}`} inputMode="numeric" autoComplete="off" className="h-14 text-xl tabular-nums md:h-14 md:text-xl" value={end} onChange={(e) => setEnd(e.target.value.replace(/\D/g, ''))} aria-invalid={!!errors.end} />
          </Field>
        </div>
      )}
      {!editing && (
        <Field id={`date-${id}`} label="Dia" error={errors.date}>
          <Input id={`date-${id}`} type="date" max={todayISO()} value={date} onChange={(e) => setDate(e.target.value)} aria-invalid={!!errors.date} />
        </Field>
      )}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
            Cancelar
          </Button>
        )}
        <Button type="submit" size="lg" loading={busy} className="w-full sm:w-auto">
          {editing ? 'Salvar correção' : 'Registrar km'}
        </Button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Despesas
// ---------------------------------------------------------------------------

function ExpensesSection({ data }: { data: MyAssignments }) {
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [withdrawing, setWithdrawing] = useState<DriverExpense | null>(null);
  const invalidate = useInvalidateMine();
  const list = useQuery({
    queryKey: ['my-expenses', page],
    queryFn: () => http.get<DriverExpenseList>(`/my/expenses?page=${page}&pageSize=${PAGE_SIZE}`),
  });
  const pages = list.data ? Math.max(1, Math.ceil(list.data.total / PAGE_SIZE)) : 1;

  return (
    <section className="space-y-3" aria-labelledby="exp-title">
      <div className="flex items-center justify-between gap-2">
        <h2 id="exp-title" className="flex items-center gap-2 text-lg font-semibold">
          <Receipt className="size-5" aria-hidden /> Minhas despesas
        </h2>
        <Button onClick={() => setCreating(true)}>
          <Plus /> Nova despesa
        </Button>
      </div>
      {list.isPending ? (
        <Skeleton className="h-32" />
      ) : list.isError ? (
        <p className="text-sm text-destructive">{errorMessage(list.error)}</p>
      ) : list.data.items.length === 0 ? (
        <EmptyState icon={Receipt} title="Nenhuma despesa enviada" description="Gastou na rota (combustível, pedágio, borracharia)? Envie aqui com o comprovante para o gestor aprovar." />
      ) : (
        <ul className="space-y-2">
          {list.data.items.map((x) => (
            <ExpenseItem key={x.id} expense={x} onWithdraw={() => setWithdrawing(x)} onChange={invalidate} />
          ))}
        </ul>
      )}
      {pages > 1 && (
        <div className="flex items-center justify-between gap-2">
          <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} de {pages}
          </span>
          <Button variant="outline" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
            Próxima
          </Button>
        </div>
      )}

      <ExpenseDialog open={creating} onOpenChange={setCreating} vehicles={data.vehicles} onDone={invalidate} />

      <ConfirmDialog
        open={!!withdrawing}
        onOpenChange={(o) => !o && setWithdrawing(null)}
        title="Retirar despesa?"
        description={withdrawing ? `"${withdrawing.description}" deixa de aguardar aprovação. Se precisar, envie de novo depois.` : ''}
        confirmLabel="Retirar"
        destructive
        onConfirm={async () => {
          if (!withdrawing) return;
          try {
            await http.post(`/my/expenses/${withdrawing.id}/withdraw`);
            toast.success('Despesa retirada');
            await invalidate();
          } catch (e) {
            toast.error(errorMessage(e));
          }
        }}
      />
    </section>
  );
}

function ExpenseItem({ expense: x, onWithdraw, onChange }: { expense: DriverExpense; onWithdraw: () => void; onChange: () => unknown }) {
  const pending = x.approvalStatus === 'PENDING_APPROVAL' && x.status !== 'CANCELED';
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function attach(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await uploadAttachment({ payableId: x.id }, file);
      toast.success('Comprovante anexado');
      await onChange();
    } catch (e) {
      toast.error(e instanceof Error && !('status' in e) ? e.message : errorMessage(e));
    } finally {
      setUploading(false);
      if (input.current) input.current.value = '';
    }
  }

  return (
    <li className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{x.description}</p>
          <p className="text-sm text-muted-foreground">
            {formatDateBR(x.dueDate)} · {x.category.name}
            {x.vehicle ? ` · ${x.vehicle.plate}` : ''}
          </p>
        </div>
        <p className="shrink-0 font-semibold tabular-nums">{formatBRL(x.amount)}</p>
      </div>
      {x.fuel && <FuelDetail fuel={x.fuel} />}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <ExpenseStatusBadge expense={x} />
        {x.attachmentsCount > 0 && (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Paperclip className="size-3.5" aria-hidden /> {x.attachmentsCount} {x.attachmentsCount === 1 ? 'comprovante' : 'comprovantes'}
          </span>
        )}
      </div>
      {x.approvalStatus === 'REJECTED' && x.cancelReason && <p className="mt-2 text-sm text-destructive">Motivo: {x.cancelReason}</p>}
      {pending && (
        <div className="mt-3 flex flex-wrap gap-2">
          <input ref={input} type="file" accept={ACCEPTED_FILES} className="sr-only" aria-label="Escolher comprovante" onChange={(e) => attach(e.target.files)} />
          <Button size="sm" variant="outline" loading={uploading} onClick={() => input.current?.click()}>
            <Camera /> Anexar comprovante
          </Button>
          <Button size="sm" variant="ghost" onClick={onWithdraw}>
            <Undo2 /> Retirar
          </Button>
        </div>
      )}
    </li>
  );
}

interface ExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicles: MyAssignments['vehicles'];
  onDone: () => unknown;
}

/** Despesa do motorista: vai para aprovação; o comprovante sobe logo depois de criar. */
function ExpenseDialog({ open, onOpenChange, vehicles, onDone }: ExpenseDialogProps) {
  const categories = useQuery({
    queryKey: ['my-expense-categories'],
    queryFn: () => http.get<ExpenseCategoryList>('/my/expense-categories'),
    staleTime: 60_000,
    enabled: open,
  });
  const [date, setDate] = useState(todayISO());
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [fuelType, setFuelType] = useState<FuelType>('DIESEL');
  const [liters, setLiters] = useState('');
  const [price, setPrice] = useState('');
  const [odometer, setOdometer] = useState('');
  const [station, setStation] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const category = categories.data?.items.find((c) => c.id === categoryId);
  const isFuel = category?.systemKey === 'FUEL';

  useEffect(() => {
    if (!open) return;
    setDate(todayISO());
    setCategoryId('');
    setAmount('');
    setDescription('');
    setVehicleId(vehicles.length === 1 ? vehicles[0].id : '');
    setFuelType('DIESEL');
    setLiters('');
    setPrice('');
    setOdometer('');
    setStation('');
    setFile(null);
    setErrors({});
  }, [open, vehicles]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = parseMoneyInput(amount);
    const litersValue = isFuel ? parseDecimalInput(liters, LITERS_PATTERN) : null;
    const priceValue = isFuel ? parseDecimalInput(price, PRICE_PER_LITER_PATTERN) : null;
    const next: Errors = {
      date: !date ? 'Informe a data' : date > todayISO() ? 'A data não pode ser futura' : undefined,
      categoryId: !categoryId ? 'Escolha a categoria' : undefined,
      amount: !value || Number(value) <= 0 ? 'Informe um valor maior que zero' : undefined,
      description: description.trim().length < 2 ? 'Descreva o gasto' : undefined,
      vehicleId: isFuel && !vehicleId ? 'Informe o veículo abastecido' : undefined,
      liters: isFuel && (!litersValue || Number(litersValue) <= 0) ? 'Litros inválidos (ex.: 45,320)' : undefined,
      price: isFuel && (!priceValue || Number(priceValue) <= 0) ? 'Preço inválido (ex.: 6,099)' : undefined,
      odometer: isFuel && odometer.trim() && !ODOMETER_PATTERN.test(odometer.trim()) ? 'Hodômetro inválido' : undefined,
      file: file && file.size > MAX_FILE_MB * 1024 * 1024 ? `Arquivo maior que ${MAX_FILE_MB} MB` : undefined,
    };
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;

    const body: CreateDriverExpenseRequest = {
      date,
      categoryId,
      amount: value!,
      description: description.trim(),
      vehicleId: vehicleId || null,
      ...(isFuel
        ? {
            fuel: {
              fuelType,
              liters: litersValue!,
              pricePerLiter: priceValue!,
              odometerKm: odometer.trim() ? Number(odometer) : null,
              station: station.trim() || null,
            },
          }
        : {}),
    };
    setBusy(true);
    try {
      const created = await http.post<DriverExpense>('/my/expenses', body);
      if (file) {
        try {
          await uploadAttachment({ payableId: created.id }, file);
        } catch (err) {
          toast.error(`Despesa enviada, mas o comprovante não subiu: ${err instanceof Error && !('status' in err) ? err.message : errorMessage(err)}. Tente anexar de novo.`);
        }
      }
      toast.success('Despesa enviada para aprovação');
      await onDone();
      onOpenChange(false);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova despesa</DialogTitle>
          <DialogDescription>O gestor confere e aprova antes de entrar no financeiro.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="exp-date" label="Data" error={errors.date}>
              <Input id="exp-date" type="date" max={todayISO()} value={date} onChange={(e) => setDate(e.target.value)} aria-invalid={!!errors.date} />
            </Field>
            <Field id="exp-amount" label="Valor" error={errors.amount}>
              <MoneyInput id="exp-amount" value={amount} onChange={(e) => setAmount(e.target.value)} aria-invalid={!!errors.amount} />
            </Field>
          </div>
          <Field id="exp-category" label="Categoria" error={errors.categoryId ?? (categories.isError ? errorMessage(categories.error) : undefined)}>
            <NativeSelect id="exp-category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} aria-invalid={!!errors.categoryId} disabled={categories.isPending}>
              <option value="">{categories.isPending ? 'Carregando…' : 'Escolha'}</option>
              {categories.data?.items.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field id="exp-description" label="Descrição" error={errors.description}>
            <Input id="exp-description" maxLength={200} placeholder="Ex.: Borracharia na rota" value={description} onChange={(e) => setDescription(e.target.value)} aria-invalid={!!errors.description} />
          </Field>
          <Field id="exp-vehicle" label={isFuel ? 'Veículo' : 'Veículo (opcional)'} error={errors.vehicleId} hint={vehicles.length === 0 ? 'Você não tem veículo escalado hoje.' : undefined}>
            <NativeSelect id="exp-vehicle" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} aria-invalid={!!errors.vehicleId}>
              <option value="">Sem veículo</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} · {v.plate}
                </option>
              ))}
            </NativeSelect>
          </Field>

          {isFuel && (
            <fieldset className="space-y-4 rounded-lg border p-3">
              <legend className="px-1 text-sm font-medium">Abastecimento</legend>
              <Field id="exp-fuel-type" label="Combustível">
                <NativeSelect id="exp-fuel-type" value={fuelType} onChange={(e) => setFuelType(e.target.value as FuelType)}>
                  {(Object.keys(FUEL_TYPE_LABELS) as FuelType[]).map((t) => (
                    <option key={t} value={t}>
                      {FUEL_TYPE_LABELS[t]}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field id="exp-liters" label="Litros" error={errors.liters}>
                  <Input id="exp-liters" inputMode="decimal" autoComplete="off" placeholder="0,000" value={liters} onChange={(e) => setLiters(e.target.value)} aria-invalid={!!errors.liters} />
                </Field>
                <Field id="exp-price" label="Preço por litro" error={errors.price}>
                  <Input id="exp-price" inputMode="decimal" autoComplete="off" placeholder="0,000" value={price} onChange={(e) => setPrice(e.target.value)} aria-invalid={!!errors.price} />
                </Field>
                <Field id="exp-odometer" label="Hodômetro (opcional)" error={errors.odometer}>
                  <Input id="exp-odometer" inputMode="numeric" autoComplete="off" value={odometer} onChange={(e) => setOdometer(e.target.value.replace(/\D/g, ''))} aria-invalid={!!errors.odometer} />
                </Field>
                <Field id="exp-station" label="Posto (opcional)">
                  <Input id="exp-station" maxLength={120} value={station} onChange={(e) => setStation(e.target.value)} />
                </Field>
              </div>
            </fieldset>
          )}

          <Field id="exp-file" label="Comprovante (opcional)" error={errors.file} hint={`Foto ou PDF até ${MAX_FILE_MB} MB`}>
            <input ref={fileInput} id="exp-file" type="file" accept={ACCEPTED_FILES} className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <div className="flex min-w-0 items-center gap-2">
              <Button type="button" variant="outline" onClick={() => fileInput.current?.click()}>
                <Camera /> {file ? 'Trocar' : 'Foto ou arquivo'}
              </Button>
              {file && <span className="min-w-0 truncate text-sm text-muted-foreground">{file.name}</span>}
            </div>
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button type="submit" loading={busy}>
              Enviar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
