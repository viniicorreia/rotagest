import { Loader2 } from 'lucide-react';

export function FullPageLoader() {
  return (
    <div className="flex min-h-dvh items-center justify-center" role="status" aria-label="Carregando">
      <Loader2 className="size-6 animate-spin text-primary" />
    </div>
  );
}
