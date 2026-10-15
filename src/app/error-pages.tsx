import { Compass, ShieldX } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';

export function ForbiddenPage() {
  return (
    <EmptyState
      icon={ShieldX}
      title="Acesso não autorizado"
      description="Seu papel nesta empresa não permite acessar esta área. Fale com o proprietário se precisar de acesso."
      action={
        <Button asChild variant="outline">
          <Link to="/app/dashboard">Voltar ao início</Link>
        </Button>
      }
    />
  );
}

export function NotFoundPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <EmptyState
        icon={Compass}
        title="Página não encontrada"
        description="O endereço acessado não existe ou foi movido."
        action={
          <Button asChild>
            <Link to="/app">Ir para o início</Link>
          </Button>
        }
      />
    </div>
  );
}
