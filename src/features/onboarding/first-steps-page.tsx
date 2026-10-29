import { useQueryClient } from '@tanstack/react-query';
import { Bus, Check, Gauge, PartyPopper, Plus, Route as RouteIcon, Users, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { FINANCE_KEYS } from '../finance/use-finance';
import { DriverFormDialog } from '../fleet/driver-form-dialog';
import { RouteFormDialog } from '../fleet/route-form-dialog';
import { DailyLogDialog } from '../mileage/daily-log-dialog';
import { VehicleFormDialog } from '../vehicles/vehicle-form-dialog';
import { FIRST_STEP_KEYS, isStepBlocked, useFirstSteps, type FirstStepKey } from './use-first-steps';

interface StepCopy {
  icon: LucideIcon;
  title: string;
  description: string;
  action: string;
  blockedHint?: string;
}

const STEPS: Record<FirstStepKey, StepCopy> = {
  vehicles: {
    icon: Bus,
    title: 'Cadastre seus veículos',
    description: 'Vans, ônibus e carros da frota. Informe o valor por km: é com ele que o sistema calcula quanto cada dia rendeu.',
    action: 'Adicionar veículo',
  },
  drivers: {
    icon: Users,
    title: 'Cadastre os motoristas',
    description: 'Quem dirige os veículos. Só o nome é obrigatório.',
    action: 'Adicionar motorista',
  },
  routes: {
    icon: RouteIcon,
    title: 'Cadastre as linhas',
    description: 'O nome de cada linha ou rota que a empresa faz, como "Escolar Centro" ou "Fábrica turno A".',
    action: 'Adicionar linha',
  },
  km: {
    icon: Gauge,
    title: 'Registre o primeiro km',
    description: 'No dia a dia, é só informar quantos km cada veículo rodou. O valor é calculado sozinho.',
    action: 'Registrar km',
    blockedHint: 'Cadastre um veículo antes.',
  },
};

/** Passo a passo do primeiro acesso: o mínimo para o sistema começar a funcionar. */
export function FirstStepsPage() {
  const qc = useQueryClient();
  const { loading, counts, progress, vehicles, drivers, routes } = useFirstSteps();
  const [open, setOpen] = useState<FirstStepKey | null>(null);

  const usage = vehicles.data?.usage;
  const vehiclesFull = !!usage && usage.limit !== null && usage.used >= usage.limit;

  const names: Record<FirstStepKey, string[]> = {
    vehicles: vehicles.data?.items.map((v) => v.name) ?? [],
    drivers: drivers.data?.map((d) => d.name) ?? [],
    routes: routes.data?.map((r) => r.name) ?? [],
    km: [],
  };

  function start(key: FirstStepKey) {
    if (key === 'vehicles' && vehiclesFull) return toast.error(`Seu plano permite ${usage?.limit} veículo(s). Arquive um veículo ou mude de plano.`);
    setOpen(key);
  }

  const refreshKm = () => Promise.all([qc.invalidateQueries({ queryKey: ['daily-logs'] }), ...FINANCE_KEYS.map((k) => qc.invalidateQueries({ queryKey: [k] }))]);

  return (
    <>
      <PageHeader title="Primeiros passos" description="Cadastre o básico para o RotaGest começar a funcionar. Leva poucos minutos e dá para completar depois." />

      <div className="mb-4 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">{loading ? 'Carregando…' : `${progress.done} de ${progress.total} concluídos`}</span>
          <Link to="/app/dashboard" className="text-primary underline-offset-4 hover:underline">
            {progress.complete ? 'Ir para o Início' : 'Fazer depois'}
          </Link>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.done} aria-label="Progresso">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
        </div>
      </div>

      {progress.complete && !loading && (
        <Card className="mb-4 flex flex-col items-start gap-3 border-primary/40 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <PartyPopper className="size-6 shrink-0 text-primary" aria-hidden />
            <div>
              <p className="font-medium">Tudo pronto!</p>
              <p className="text-sm text-muted-foreground">Agora é só registrar os km de cada dia e lançar as despesas.</p>
            </div>
          </div>
          <Button asChild>
            <Link to="/app/dashboard">Ir para o Início</Link>
          </Button>
        </Card>
      )}

      <ol className="space-y-3">
        {FIRST_STEP_KEYS.map((key, i) => {
          const step = STEPS[key];
          const done = counts[key] > 0;
          const blocked = isStepBlocked(key, counts);
          const isNext = progress.next === key;
          const list = names[key];
          return (
            <li key={key}>
              <Card className={cn('flex flex-col gap-4 p-4 sm:flex-row sm:items-start', isNext && 'border-primary/50')}>
                <div
                  className={cn(
                    'flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
                    done ? 'bg-primary text-primary-foreground' : 'bg-accent text-accent-foreground',
                  )}
                  aria-hidden
                >
                  {done ? <Check className="size-5" /> : i + 1}
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="flex items-center gap-2 font-medium">
                    <step.icon className="size-4 text-muted-foreground" aria-hidden />
                    {step.title}
                    {done && <span className="sr-only">(concluído)</span>}
                  </p>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                  {loading ? (
                    <Skeleton className="h-5 w-40" />
                  ) : (
                    list.length > 0 && (
                      <p className="text-sm">
                        <span className="text-muted-foreground">Cadastrados: </span>
                        {list.slice(0, 6).join(', ')}
                        {list.length > 6 && ` e mais ${list.length - 6}`}
                      </p>
                    )
                  )}
                  {key === 'km' && done && <p className="text-sm text-muted-foreground">Primeiro registro feito.</p>}
                  {blocked && <p className="text-sm text-warning">{step.blockedHint}</p>}
                </div>
                <Button className="shrink-0" variant={isNext ? 'default' : 'outline'} disabled={loading || blocked} onClick={() => start(key)}>
                  <Plus /> {step.action}
                </Button>
              </Card>
            </li>
          );
        })}
      </ol>

      <VehicleFormDialog open={open === 'vehicles'} onOpenChange={(o) => !o && setOpen(null)} />
      <DriverFormDialog open={open === 'drivers'} onOpenChange={(o) => !o && setOpen(null)} drivers={drivers.data ?? []} />
      <RouteFormDialog open={open === 'routes'} onOpenChange={(o) => !o && setOpen(null)} />
      <DailyLogDialog open={open === 'km'} onOpenChange={(o) => !o && setOpen(null)} onSaved={refreshKm} />
    </>
  );
}
