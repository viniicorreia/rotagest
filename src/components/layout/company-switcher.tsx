import { Building2, Check, ChevronsUpDown, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { errorMessage } from '@/api/client';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

export function CompanySwitcher({ compact }: { compact?: boolean }) {
  const { me, switchCompany } = useAuth();
  const navigate = useNavigate();
  const active = me?.activeCompany;

  async function choose(id: string) {
    if (id === active?.id) return;
    try {
      await switchCompany(id);
      navigate('/app/dashboard');
      toast.success('Empresa alterada');
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'flex min-w-0 items-center gap-2 rounded-lg border bg-card px-3 py-2 text-left text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          compact ? 'max-w-[60vw]' : 'w-full',
        )}
        aria-label="Trocar de empresa"
      >
        <Building2 className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="min-w-0 flex-1 truncate font-medium">{active?.tradeName ?? 'Selecionar empresa'}</span>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel>Suas empresas</DropdownMenuLabel>
        {me?.companies.map((c) => (
          <DropdownMenuItem key={c.id} onSelect={() => choose(c.id)} disabled={c.status !== 'ACTIVE'}>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{c.tradeName}</p>
              <p className="text-xs text-muted-foreground">{c.status === 'ACTIVE' ? c.roleLabel : 'Suspensa'}</p>
            </div>
            {c.id === active?.id && <Check className="text-primary" aria-label="Ativa" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate('/onboarding')}>
          <Plus /> Cadastrar nova empresa
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
