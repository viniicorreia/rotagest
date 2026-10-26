import { Check, Pencil, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { errorMessage, http } from '@/api/client';
import type { Category, CategoryType } from '@/api/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Segmented } from '@/components/ui/segmented';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/auth';
import { useCategories, useInvalidateFinance } from '../finance/use-finance';

/** Categorias de receita e despesa: as padrão do sistema (não renomeáveis) e as criadas pela empresa. */
export function CategoriesCard() {
  const { can } = useAuth();
  const canManage = can('finance:manage');
  const [type, setType] = useState<CategoryType>('EXPENSE');
  const categories = useCategories(type, true);
  const invalidate = useInvalidateFinance();
  const [newName, setNewName] = useState('');
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function call(fn: () => Promise<unknown>, success: string) {
    setBusy(true);
    try {
      await fn();
      await invalidate();
      toast.success(success);
      return true;
    } catch (e) {
      toast.error(errorMessage(e));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (name.length < 2) return toast.error('Nome da categoria muito curto');
    if (await call(() => http.post('/categories', { type, name }), 'Categoria criada')) setNewName('');
  }

  async function rename(c: Category) {
    const name = editing?.name.trim() ?? '';
    if (name.length < 2) return toast.error('Nome da categoria muito curto');
    if (await call(() => http.patch(`/categories/${c.id}`, { name }), 'Categoria renomeada')) setEditing(null);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Categorias</CardTitle>
        <CardDescription>Usadas para classificar receitas e despesas nos relatórios. Categorias inativas somem dos formulários, mas o histórico continua.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Segmented
          label="Tipo de categoria"
          value={type}
          onChange={setType}
          options={[
            { value: 'EXPENSE', label: 'Despesas' },
            { value: 'INCOME', label: 'Receitas' },
          ]}
        />
        {canManage && (
          <form onSubmit={create} className="flex gap-2">
            <Input aria-label="Nova categoria" placeholder="Nova categoria" maxLength={60} value={newName} onChange={(e) => setNewName(e.target.value)} />
            <Button type="submit" disabled={busy}>
              <Plus /> Adicionar
            </Button>
          </form>
        )}
        {categories.isPending ? (
          <Skeleton className="h-40" />
        ) : (
          <ul className="divide-y rounded-lg border">
            {categories.data?.map((c) => (
              <li key={c.id} className="flex min-h-12 items-center gap-2 px-3 py-2">
                {editing?.id === c.id ? (
                  <>
                    <Input aria-label="Nome da categoria" autoFocus maxLength={60} value={editing.name} onChange={(e) => setEditing({ id: c.id, name: e.target.value })} className="h-9" />
                    <Button size="icon" variant="ghost" aria-label="Salvar" disabled={busy} onClick={() => rename(c)}>
                      <Check />
                    </Button>
                    <Button size="icon" variant="ghost" aria-label="Cancelar" onClick={() => setEditing(null)}>
                      <X />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className={c.status === 'ACTIVE' ? 'flex-1 text-sm' : 'flex-1 text-sm text-muted-foreground line-through'}>{c.name}</span>
                    {c.systemKey && <Badge variant="outline">Padrão</Badge>}
                    {canManage && !c.systemKey && (
                      <Button size="icon" variant="ghost" aria-label={`Renomear ${c.name}`} onClick={() => setEditing({ id: c.id, name: c.name })}>
                        <Pencil />
                      </Button>
                    )}
                    {canManage && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => call(() => http.patch(`/categories/${c.id}`, { status: c.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' }), c.status === 'ACTIVE' ? 'Categoria desativada' : 'Categoria reativada')}
                      >
                        {c.status === 'ACTIVE' ? 'Desativar' : 'Reativar'}
                      </Button>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
