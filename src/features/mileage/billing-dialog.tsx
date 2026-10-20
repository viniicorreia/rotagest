import { useQuery } from '@tanstack/react-query';
import { addMonths, format, parse } from 'date-fns';
import { AlertTriangle, Receipt } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { errorMessage, http } from '@/api/client';
import type { BillingPreview, BillingResult } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input, NativeSelect } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { formatMonthBR } from '@/lib/dates';
import { formatBRL } from '@/lib/money';
import { useCategories } from '../finance/use-finance';
import { formatPlate } from '../vehicles/vehicles-page';
import { formatKm, formatRate } from './units';

type Row = BillingPreview['vehicles'][number];

/** Dia 5 do mês seguinte ao faturado: sugestão de vencimento, editável. */
function defaultDueDate(month: string): string {
  return format(addMonths(parse(month, 'yyyy-MM', new Date()), 1), 'yyyy-MM-05');
}

/** A API manda o valor a faturar já calculado; aqui só decidimos se há algo a faturar. */
const hasAmount = (r: Row) => Number(r.amount) > 0;

/**
 * Faturamento dos km do mês: a API mostra o que há a faturar por veículo
 * (km × R$/km dos dias ainda não faturados) e gera uma conta a receber por veículo.
 */
export function BillingDialog({ open, onOpenChange, month, onBilled }: { open: boolean; onOpenChange: (o: boolean) => void; month: string; onBilled: () => Promise<unknown> }) {
  const preview = useQuery({
    queryKey: ['daily-logs', 'billing', month],
    queryFn: () => http.get<BillingPreview>(`/daily-logs/billing?month=${month}`),
    enabled: open,
  });
  const categories = useCategories('INCOME', false, open);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dueDate, setDueDate] = useState(defaultDueDate(month));
  const [categoryId, setCategoryId] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setDueDate(defaultDueDate(month));
      setCategoryId('');
    }
  }, [open, month]);

  useEffect(() => {
    if (open && preview.data) setSelected(new Set(preview.data.vehicles.filter(hasAmount).map((r) => r.vehicle.id)));
  }, [open, preview.data]);

  function toggle(id: string, on: boolean) {
    setSelected((s) => {
      const next = new Set(s);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function bill() {
    if (!selected.size) return toast.error('Escolha pelo menos um veículo');
    if (!dueDate) return toast.error('Informe o vencimento');
    setBusy(true);
    try {
      const res = await http.post<BillingResult>('/daily-logs/billing', { month, dueDate, vehicleIds: [...selected], categoryId: categoryId || undefined });
      await onBilled();
      toast.success(res.items.length === 1 ? '1 conta a receber criada' : `${res.items.length} contas a receber criadas`, {
        description: 'Acompanhe em Receitas.',
      });
      onOpenChange(false);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const rows = preview.data?.vehicles ?? [];

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Faturar km de {formatMonthBR(month, true)}</DialogTitle>
          <DialogDescription>Cria uma conta a receber por veículo com os dias ainda não faturados. Depois de faturados, os dias não podem mais ser alterados.</DialogDescription>
        </DialogHeader>

        {preview.isPending ? (
          <Skeleton className="h-40" />
        ) : preview.isError ? (
          <p className="text-sm text-destructive">{errorMessage(preview.error)}</p>
        ) : !rows.length ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            <Receipt className="size-6" aria-hidden />
            Nenhum km registrado em {formatMonthBR(month, true)}.
          </div>
        ) : (
          <div className="space-y-4">
            <ul className="divide-y rounded-lg border">
              {rows.map((r) => {
                const billable = hasAmount(r);
                return (
                  <li key={r.vehicle.id}>
                    <label className={`flex min-h-11 items-start gap-3 px-3 py-2.5 ${billable ? 'cursor-pointer' : 'opacity-70'}`}>
                      <input
                        type="checkbox"
                        className="mt-1 size-4 shrink-0 accent-[var(--primary)]"
                        checked={selected.has(r.vehicle.id)}
                        disabled={!billable}
                        onChange={(e) => toggle(r.vehicle.id, e.target.checked)}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="truncate text-sm font-medium">{r.vehicle.name}</span>
                          <span className="shrink-0 text-sm font-semibold tabular-nums">{formatBRL(r.amount)}</span>
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {formatPlate(r.vehicle.plate)} · {r.days} dia(s) · {formatKm(r.km)} · {r.ratePerKm ? formatRate(r.ratePerKm) : 'sem valor/km'}
                        </span>
                        {r.billedDays > 0 && (
                          <span className="block text-xs text-muted-foreground">
                            Já faturado: {formatBRL(r.billedAmount)} ({r.billedDays} dia(s))
                          </span>
                        )}
                        {r.missingRateDays > 0 && (
                          <Link to={`/app/vehicles/${r.vehicle.id}`} className="mt-0.5 flex items-center gap-1 text-xs font-medium text-warning hover:underline">
                            <AlertTriangle className="size-3 shrink-0" aria-hidden />
                            {r.missingRateDays} dia(s) sem valor por km ficam de fora. Definir valor
                          </Link>
                        )}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
            <p className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total a faturar no mês (todos os veículos)</span>
              <span className="font-semibold tabular-nums">{formatBRL(preview.data.totalAmount)}</span>
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="bill-due" label="Vencimento">
                <Input id="bill-due" type="date" min={`${month}-01`} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </Field>
              <Field id="bill-category" label="Categoria">
                <NativeSelect id="bill-category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                  <option value="">Contratos (padrão)</option>
                  {categories.data?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancelar
          </Button>
          <Button onClick={bill} loading={busy} disabled={!selected.size}>
            Faturar {selected.size ? `${selected.size} veículo(s)` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
