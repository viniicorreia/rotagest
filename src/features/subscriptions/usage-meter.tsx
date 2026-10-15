import { cn } from '@/lib/utils';

export function UsageMeter({ label, used, limit }: { label: string; used: number; limit: number | null }) {
  const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const full = limit !== null && used >= limit;
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className={cn('tabular-nums text-muted-foreground', full && 'font-medium text-warning')}>
          {used} de {limit ?? 'ilimitado'}
        </span>
      </div>
      {limit !== null && (
        <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={used} aria-valuemin={0} aria-valuemax={limit} aria-label={label}>
          <div className={cn('h-full rounded-full bg-primary transition-all', full && 'bg-warning')} style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}
