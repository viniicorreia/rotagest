import { LifeBuoy, LogOut } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { errorMessage } from '@/api/client';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { formatSupportUntil } from './support-logic';

/** Faixa fixa enquanto um SUPER_ADMIN vê uma empresa em modo suporte (somente leitura). */
export function SupportBanner() {
  const { me, endSupportSession } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const support = me?.activeCompany?.support;
  if (!support) return null;

  async function exit() {
    setBusy(true);
    try {
      await endSupportSession();
      navigate('/platform');
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div role="status" className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 bg-amber-300 px-4 py-2 text-sm text-amber-950">
      <p className="flex min-w-0 items-center gap-2 font-medium">
        <LifeBuoy className="size-4 shrink-0" aria-hidden />
        <span className="min-w-0">
          Modo suporte · somente leitura · até {formatSupportUntil(support.expiresAt)}
          {me?.activeCompany && <span className="font-normal"> · {me.activeCompany.tradeName}</span>}
        </span>
      </p>
      <Button size="sm" variant="outline" className="h-8 border-amber-950/30 bg-amber-50 text-amber-950 hover:bg-amber-100" loading={busy} onClick={exit}>
        <LogOut /> Sair do modo suporte
      </Button>
    </div>
  );
}
