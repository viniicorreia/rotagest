import { Bus } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Brand({ collapsed, className }: { collapsed?: boolean; className?: string }) {
  return (
    <div className={cn('flex items-center gap-2 font-semibold tracking-tight', className)}>
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Bus className="size-4" aria-hidden />
      </span>
      {!collapsed && <span className="text-lg">RotaGest</span>}
    </div>
  );
}
