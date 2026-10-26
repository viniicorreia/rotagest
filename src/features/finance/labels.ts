import type { AccountType, AllocationMethod, EntryKind, PaymentMethod, VehicleStatus } from '@/api/types';

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  PIX: 'Pix',
  CASH: 'Dinheiro',
  TRANSFER: 'Transferência',
  DEPOSIT: 'Depósito',
  BOLETO: 'Boleto',
  CARD: 'Cartão',
  OTHER: 'Outro',
};

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  CHECKING: 'Conta corrente',
  SAVINGS: 'Poupança',
  CASH: 'Caixa (dinheiro)',
  OTHER: 'Outra',
};

export const ENTRY_KIND_LABELS: Record<EntryKind, string> = {
  SINGLE: 'Avulsa',
  INSTALLMENT: 'Parcelada',
  RECURRING: 'Recorrente',
};

export const VEHICLE_STATUS_LABELS: Record<VehicleStatus, string> = {
  ACTIVE: 'Ativo',
  MAINTENANCE: 'Em manutenção',
  INACTIVE: 'Inativo',
};

export const TRANSACTION_KIND_LABELS = {
  OPENING_BALANCE: 'Saldo inicial',
  SETTLEMENT: 'Pagamento/recebimento',
  TRANSFER: 'Transferência',
  ADJUSTMENT: 'Ajuste',
  REVERSAL: 'Estorno',
} as const;

export const ALLOCATION_METHOD_LABELS: Record<AllocationMethod, string> = {
  DIRECT: 'Direto',
  EQUAL: 'Partes iguais',
  PERCENT: 'Percentual',
  FIXED: 'Valor fixo',
  REVENUE_PROPORTIONAL: 'Proporcional à receita',
};
