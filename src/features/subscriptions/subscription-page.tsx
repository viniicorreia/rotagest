import { differenceInCalendarDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowRightLeft, Check, CreditCard, Mail } from "lucide-react";
import type { PublicPlan, SubscriptionInfo } from "@/api/types";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { errorMessage } from "@/api/client";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  SUBSCRIPTION_STATUS,
  usePublicPlans,
  useSubscription,
} from "./use-subscription";
import { UsageMeter } from "./usage-meter";

export function SubscriptionPage() {
  const { data, isPending, isError, error, refetch } = useSubscription();

  return (
    <>
      <PageHeader
        title="Assinatura"
        description="Plano contratado, limites e uso atual."
      />
      {isPending ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      ) : isError ? (
        <EmptyState
          icon={CreditCard}
          title="Não foi possível carregar a assinatura"
          description={errorMessage(error)}
          action={
            <Button variant="outline" onClick={() => refetch()}>
              Tentar novamente
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-xl">
                    Plano {data.plan.name}
                  </CardTitle>
                  <Badge variant={SUBSCRIPTION_STATUS[data.status].variant}>
                    {SUBSCRIPTION_STATUS[data.status].label}
                  </Badge>
                </div>
                {data.plan.description && (
                  <CardDescription>{data.plan.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>
                  <span className="text-2xl font-semibold tabular-nums">
                    {formatMoney(data.plan.price)}
                  </span>
                  <span className="text-muted-foreground">
                    {" "}
                    / {data.plan.interval === "MONTHLY" ? "mês" : "ano"}
                  </span>
                </p>
                {data.status === "TRIALING" && data.trialEndsAt && (
                  <p className="text-muted-foreground">
                    Teste gratuito até{" "}
                    {format(
                      new Date(data.trialEndsAt),
                      "dd 'de' MMMM 'de' yyyy",
                      { locale: ptBR },
                    )}{" "}
                    (
                    {Math.max(
                      0,
                      differenceInCalendarDays(
                        new Date(data.trialEndsAt),
                        new Date(),
                      ),
                    )}{" "}
                    dias restantes).
                  </p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Uso do plano</CardTitle>
                <CardDescription>
                  Usuários incluem convites pendentes.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <UsageMeter
                  label="Usuários"
                  used={data.usage.users}
                  limit={data.limits.maxUsers}
                />
                <UsageMeter
                  label="Veículos"
                  used={data.usage.vehicles}
                  limit={data.limits.maxVehicles}
                />
              </CardContent>
            </Card>
          </div>
          <ChangePlan info={data} />
          <PlansComparison currentCode={data.plan.code} />
        </>
      )}
    </>
  );
}

/** Mudar de plano: sem gateway integrado, a troca é feita pela equipe da plataforma. */
function ChangePlan({ info }: { info: SubscriptionInfo }) {
  const subject = encodeURIComponent(
    `Mudança de plano (plano atual: ${info.plan.name})`,
  );
  return (
    <Card className="mt-4">
      <CardContent className="flex flex-col gap-4 pt-4 sm:flex-row sm:items-center md:pt-6">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <ArrowRightLeft className="size-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1 space-y-1 text-sm">
          <p className="font-medium">Mudar de plano</p>
          <p className="text-muted-foreground">
            {info.billing.configured
              ? "A mudança de plano é feita pela equipe RotaGest."
              : "O pagamento online ainda não está disponível: a mudança de plano é feita pela equipe RotaGest."}{" "}
            {info.supportEmail ? (
              <>
                Escreva para{" "}
                <span className="break-all font-medium text-foreground">
                  {info.supportEmail}
                </span>{" "}
                informando o plano desejado.
              </>
            ) : (
              "Entre em contato com o suporte informando o plano desejado."
            )}
          </p>
        </div>
        {info.supportEmail && (
          <Button asChild variant="outline" className="shrink-0">
            <a href={`mailto:${info.supportEmail}?subject=${subject}`}>
              <Mail /> Falar com a equipe
            </a>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function PlansComparison({ currentCode }: { currentCode: string }) {
  const plans = usePublicPlans();
  return (
    <section className="mt-6" aria-labelledby="plans-title">
      <h2
        id="plans-title"
        className="mb-3 text-lg font-semibold tracking-tight"
      >
        Planos disponíveis
      </h2>
      {plans.isPending ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-56" />
          ))}
        </div>
      ) : plans.isError ? (
        <div className="rounded-xl border border-dashed p-6 text-center">
          <p className="text-sm text-destructive">
            {errorMessage(plans.error)}
          </p>
          <Button
            variant="outline"
            className="mt-3"
            onClick={() => plans.refetch()}
          >
            Tentar novamente
          </Button>
        </div>
      ) : !plans.data.items.length ? (
        <EmptyState
          icon={CreditCard}
          title="Nenhum plano disponível"
          description="Fale com o suporte para conhecer as opções."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {plans.data.items.map((p) => (
            <PlanOption
              key={p.code}
              plan={p}
              current={p.code === currentCode}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function PlanOption({ plan, current }: { plan: PublicPlan; current: boolean }) {
  return (
    <Card
      className={cn(
        "flex flex-col",
        current && "border-primary ring-1 ring-primary",
      )}
    >
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg">{plan.name}</CardTitle>
          {current && <Badge>Seu plano</Badge>}
        </div>
        {plan.description && (
          <CardDescription>{plan.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3 text-sm">
        <p>
          <span className="text-2xl font-semibold tabular-nums">
            {formatMoney(plan.price)}
          </span>
          <span className="text-muted-foreground">
            {" "}
            / {plan.interval === "MONTHLY" ? "mês" : "ano"}
          </span>
        </p>
        <ul className="space-y-1">
          <li>
            <span className="font-medium tabular-nums">
              {plan.maxVehicles ?? "Ilimitados"}
            </span>{" "}
            <span className="text-muted-foreground">
              {plan.maxVehicles === 1 ? "veículo" : "veículos"}
            </span>
          </li>
          <li>
            <span className="font-medium tabular-nums">
              {plan.maxUsers ?? "Ilimitados"}
            </span>{" "}
            <span className="text-muted-foreground">
              {plan.maxUsers === 1 ? "usuário" : "usuários"}
            </span>
          </li>
          {plan.features.map((f) => (
            <li key={f.key} className="flex items-center gap-2">
              <Check className="size-4 shrink-0 text-primary" aria-hidden />{" "}
              {f.label}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
