import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { PayableDetail } from '@/api/types';
import { currentMonth, todayISO } from '@/lib/dates';
import { ObligationFormDialog } from './obligation-form-dialog';
import { SIDES } from './sides';

const http = vi.hoisted(() => ({
  get: vi.fn(async (path: string) => {
    if (path.startsWith('/categories')) return [{ id: 'c1', name: 'Seguro' }];
    if (path.startsWith('/vehicles'))
      return {
        items: [
          { id: 'v1', name: 'Van 01', plate: 'ABC1D23' },
          { id: 'v2', name: 'Van 02', plate: 'DEF4G56' },
        ],
      };
    if (path.startsWith('/accounts')) return { items: [{ id: 'a1', name: 'Caixa' }] };
    return [];
  }),
  post: vi.fn(async () => ({})),
  patch: vi.fn(),
}));
vi.mock('@/api/client', () => ({ http, errorMessage: (e: unknown) => String(e) }));
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ can: () => true }) }));

const source = {
  id: 'p1',
  description: 'Seguro frota',
  category: { id: 'c1', name: 'Seguro' },
  amount: '1200.00',
  competence: '2026-08',
  dueDate: '2026-08-10',
  status: 'PAID',
  kind: 'INSTALLMENT',
  installmentNumber: 3,
  installmentCount: 10,
  vehicle: null,
  supplierName: 'Seguradora X',
  notes: 'Apólice 123',
  settlements: [],
  attachments: [{ id: 'att1' }],
  allocations: [
    { vehicle: { id: 'v1', name: 'Van 01', plate: 'ABC1D23' }, method: 'EQUAL', percent: '50.000000', amount: '600.00' },
    { vehicle: { id: 'v2', name: 'Van 02', plate: 'DEF4G56' }, method: 'EQUAL', percent: '50.000000', amount: '600.00' },
  ],
} as unknown as PayableDetail;

describe('ObligationFormDialog duplicando', () => {
  it('cria uma despesa nova com os dados da origem, no mês atual, lançamento único e sem pagamento', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <ObligationFormDialog config={SIDES.payables} open onOpenChange={() => {}} duplicateOf={source} />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Duplicar despesa')).toBeInTheDocument();
    expect(screen.getByLabelText('Descrição')).toHaveValue('Seguro frota');
    await waitFor(() => expect(screen.getByLabelText('Categoria')).toHaveValue('c1'));

    fireEvent.click(screen.getByRole('button', { name: 'Lançar' }));
    await waitFor(() => expect(http.post).toHaveBeenCalled());
    expect(http.post).toHaveBeenCalledWith(
      '/payables',
      expect.objectContaining({
        description: 'Seguro frota',
        categoryId: 'c1',
        amount: '1200.00',
        competence: currentMonth(),
        dueDate: todayISO(),
        supplierName: 'Seguradora X',
        notes: 'Apólice 123',
        kind: 'SINGLE',
        allocationMethod: 'EQUAL',
        allocations: [{ vehicleId: 'v1' }, { vehicleId: 'v2' }],
        settleNow: undefined,
      }),
    );
    expect(http.patch).not.toHaveBeenCalled();
  });
});
