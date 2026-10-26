import { cn } from '@/lib/utils';

interface SegmentedProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: readonly { value: T; label: string }[];
  label: string;
  className?: string;
}

/** Grupo de opções exclusivas (filtros rápidos, tipo de lançamento). Rola na horizontal no celular sem quebrar o layout. */
export function Segmented<T extends string>({ value, onChange, options, label, className }: SegmentedProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('flex max-w-full gap-1 overflow-x-auto rounded-lg bg-muted p-1', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'h-9 shrink-0 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            value === o.value ? 'bg-card text-foreground shadow-sm' : 'hover:text-foreground',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
