import { Badge } from '@/components/ui/badge';
import type { DriverExpense, FuelType } from '@/api/types';

export const FUEL_TYPE_LABELS: Record<FuelType, string> = {
  DIESEL: 'Diesel',
  DIESEL_S10: 'Diesel S10',
  GASOLINE: 'Gasolina',
  ETHANOL: 'Etanol',
  CNG: 'GNV',
  OTHER: 'Outro',
};

/** "120.5" → "120,5" (só exibição; o valor vem da API). */
export function formatDecimal(value: string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  return value.replace('.', ',');
}

/** Converte "120,5" no formato da API ("120.5"); null se não bater com o padrão. */
export function parseDecimalInput(input: string, pattern: RegExp): string | null {
  const s = input.trim().replace(',', '.');
  return pattern.test(s) ? s : null;
}

export function formatOdometer(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : value.toLocaleString('pt-BR');
}

/** Situação da despesa do motorista, sempre derivada dos campos da API. */
export function ExpenseStatusBadge({ expense }: { expense: DriverExpense }) {
  if (expense.approvalStatus === 'REJECTED') return <Badge variant="destructive">Recusada</Badge>;
  if (expense.status === 'CANCELED') return <Badge variant="outline">{expense.approvalStatus === 'PENDING_APPROVAL' ? 'Retirada' : 'Cancelada'}</Badge>;
  if (expense.approvalStatus === 'PENDING_APPROVAL') return <Badge variant="warning">Aguardando aprovação</Badge>;
  return <Badge>{expense.status === 'PAID' ? 'Aprovada · paga' : 'Aprovada'}</Badge>;
}

/** Litros, preço e posto do abastecimento declarado na despesa. */
export function FuelDetail({ fuel }: { fuel: NonNullable<DriverExpense['fuel']> }) {
  return (
    <p className="text-xs text-muted-foreground">
      {FUEL_TYPE_LABELS[fuel.fuelType]} · {formatDecimal(fuel.liters)} L × R$ {formatDecimal(fuel.pricePerLiter)}/L
      {fuel.odometerKm !== null ? ` · hodômetro ${formatOdometer(fuel.odometerKm)}` : ''}
      {fuel.station ? ` · ${fuel.station}` : ''}
    </p>
  );
}
