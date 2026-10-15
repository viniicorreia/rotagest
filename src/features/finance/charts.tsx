import { formatBRL } from '@/lib/money';

/** Cores dos gráficos vindas do tema (claro/escuro), nunca fixas no componente. */
export const CHART = {
  in: 'var(--primary)',
  out: 'var(--destructive)',
  neutral: 'var(--muted-foreground)',
  warning: 'var(--warning)',
  grid: 'var(--border)',
  palette: ['var(--primary)', '#0ea5e9', '#8b5cf6', 'var(--warning)', '#ec4899', '#14b8a6', 'var(--muted-foreground)'],
};

export const axisTick = { fill: 'var(--muted-foreground)', fontSize: 12 };

/** Eixo Y compacto: 12.345 → "12,3 mil". */
export function compactBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

export function ChartTooltip({ active, payload, label, labelFormatter }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string; labelFormatter?: (l: string) => string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      {label && <p className="mb-1 font-medium capitalize">{labelFormatter ? labelFormatter(label) : label}</p>}
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2 tabular-nums">
          <span className="size-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span> {formatBRL(String(p.value))}
        </p>
      ))}
    </div>
  );
}
