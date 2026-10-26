import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Card } from './card';
import { Skeleton } from './skeleton';

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  hint?: ReactNode;
  tone?: 'default' | 'positive' | 'negative' | 'warning';
  loading?: boolean;
  className?: string;
}

/** Card financeiro compacto: rótulo, valor em destaque e observação. */
export function StatCard({ label, value, icon: Icon, hint, tone = 'default', loading, className }: StatCardProps) {
  return (
    <Card className={cn('p-4', className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-xs font-medium text-muted-foreground sm:text-sm">{label}</p>
        {Icon && <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />}
      </div>
      {loading ? (
        <Skeleton className="mt-2 h-7 w-3/4" />
      ) : (
        <p
          className={cn(
            'mt-1 truncate text-lg font-semibold tabular-nums sm:text-xl',
            tone === 'positive' && 'text-primary',
            tone === 'negative' && 'text-destructive',
            tone === 'warning' && 'text-warning',
          )}
        >
          {value}
        </p>
      )}
      {hint && !loading && <p className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}
