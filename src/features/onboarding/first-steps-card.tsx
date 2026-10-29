import { ListChecks, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/lib/auth';
import { hideFirstSteps, isFirstStepsHidden, useFirstSteps, type FirstStepKey } from './use-first-steps';

const NEXT_LABEL: Record<FirstStepKey, string> = {
  vehicles: 'Próximo: cadastrar os veículos.',
  drivers: 'Próximo: cadastrar os motoristas.',
  routes: 'Próximo: cadastrar as linhas.',
  km: 'Próximo: registrar o primeiro km.',
};

/** Lembrete no Início enquanto os cadastros básicos não estão completos. Some ao terminar ou ao ocultar. */
export function FirstStepsCard() {
  const { can, me } = useAuth();
  const companyId = me?.activeCompany?.id ?? '';
  const [hidden, setHidden] = useState(() => !companyId || isFirstStepsHidden(companyId));
  const enabled = can('fleet:manage') && !hidden;
  const { loading, progress } = useFirstSteps(enabled);

  if (!enabled || loading || progress.complete) return null;

  return (
    <Card className="mb-4 flex flex-col gap-3 border-primary/40 p-4 sm:flex-row sm:items-center">
      <ListChecks className="hidden size-6 shrink-0 text-primary sm:block" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="font-medium">
          Primeiros passos · {progress.done} de {progress.total}
        </p>
        <p className="text-sm text-muted-foreground">{progress.next && NEXT_LABEL[progress.next]} Cadastre o básico para o sistema funcionar.</p>
      </div>
      <div className="flex gap-2">
        <Button asChild>
          <Link to="/app/first-steps">Continuar</Link>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Ocultar primeiros passos"
          title="Ocultar"
          onClick={() => {
            hideFirstSteps(companyId);
            setHidden(true);
          }}
        >
          <X />
        </Button>
      </div>
    </Card>
  );
}
