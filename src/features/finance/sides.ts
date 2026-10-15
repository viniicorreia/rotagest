import type { CategoryType, Payable, PayableDetail, Receivable, ReceivableDetail } from '@/api/types';

export type Side = 'payables' | 'receivables';
export type ObligationItem = Payable | Receivable;
export type ObligationDetail = PayableDetail | ReceivableDetail;

export interface SideConfig {
  side: Side;
  path: '/payables' | '/receivables';
  title: string;
  singular: string;
  newLabel: string;
  categoryType: CategoryType;
  settleLabel: string;
  settleTitle: string;
  settledLabel: string;
  settledNowLabel: string;
  settledToast: string;
  createdToast: string;
  statusLabels: Record<string, string>;
  doneStatus: string;
  partialStatus: string;
  empty: string;
}

export const SIDES: Record<Side, SideConfig> = {
  payables: {
    side: 'payables',
    path: '/payables',
    title: 'Despesas',
    singular: 'despesa',
    newLabel: 'Nova despesa',
    categoryType: 'EXPENSE',
    settleLabel: 'Pagar',
    settleTitle: 'Registrar pagamento',
    settledLabel: 'Pago',
    settledNowLabel: 'Já está paga',
    settledToast: 'Pagamento registrado',
    createdToast: 'Despesa lançada',
    statusLabels: { PENDING: 'Pendente', PARTIALLY_PAID: 'Parcialmente paga', PAID: 'Paga', CANCELED: 'Cancelada' },
    doneStatus: 'PAID',
    partialStatus: 'PARTIALLY_PAID',
    empty: 'Combustível, manutenção, salários, seguro... lance as contas a pagar para acompanhar vencimentos e custos por veículo.',
  },
  receivables: {
    side: 'receivables',
    path: '/receivables',
    title: 'Receitas',
    singular: 'receita',
    newLabel: 'Nova receita',
    categoryType: 'INCOME',
    settleLabel: 'Receber',
    settleTitle: 'Registrar recebimento',
    settledLabel: 'Recebido',
    settledNowLabel: 'Já foi recebida',
    settledToast: 'Recebimento registrado',
    createdToast: 'Receita lançada',
    statusLabels: { PENDING: 'Pendente', PARTIALLY_RECEIVED: 'Parcialmente recebida', RECEIVED: 'Recebida', CANCELED: 'Cancelada' },
    doneStatus: 'RECEIVED',
    partialStatus: 'PARTIALLY_RECEIVED',
    empty: 'Lance o que você tem a receber de contratos, escolas, prefeituras e fretes. Recebimentos parciais atualizam o saldo pendente.',
  },
};

/** Valor já liquidado, independentemente do lado. */
export function settledOf(item: ObligationItem): string {
  return 'paidAmount' in item ? item.paidAmount : item.receivedAmount;
}
