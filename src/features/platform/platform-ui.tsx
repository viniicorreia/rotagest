import { ChevronLeft, ChevronRight } from 'lucide-react';
import { errorMessage } from '@/api/client';
import { Button } from '@/components/ui/button';

/** Erro de carregamento com botão de nova tentativa. */
export function ErrorState({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <div className="rounded-xl border p-4">
      <p className="text-sm text-destructive">{errorMessage(error)}</p>
      <Button variant="outline" className="mt-3" onClick={onRetry}>
        Tentar novamente
      </Button>
    </div>
  );
}

/** Rodapé de paginação: "Página 1 de 3 · 42 itens". */
export function Pagination({ page, pageSize, total, noun, onPage }: { page: number; pageSize: number; total: number; noun: string; onPage: (page: number) => void }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-2 border-t px-4 py-2 text-sm">
      <span className="text-muted-foreground">
        Página {page} de {totalPages} · {total} {noun}
      </span>
      <div className="flex gap-1">
        <Button size="icon" variant="ghost" disabled={page <= 1} aria-label="Página anterior" onClick={() => onPage(page - 1)}>
          <ChevronLeft />
        </Button>
        <Button size="icon" variant="ghost" disabled={page >= totalPages} aria-label="Próxima página" onClick={() => onPage(page + 1)}>
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}
