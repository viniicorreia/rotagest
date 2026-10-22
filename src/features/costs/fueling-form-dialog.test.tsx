import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Fueling } from '@/api/types';
import { todayISO } from '@/lib/dates';
import { FuelingFormDialog } from './fueling-form-dialog';

const http = vi.hoisted(() => ({
  get: vi.fn(async (path: string) => {
    if (path.startsWith('/vehicles')) return { items: [{ id: 'v1', name: 'Van 01', plate: 'ABC1D23' }] };
    if (path.startsWith('/accounts')) return { items: [{ id: 'a1', name: 'Caixa' }] };
    if (path.startsWith('/drivers')) return [{ id: 'd1', name: 'João' }];
    return { items: [] };
  }),
  post: vi.fn(async () => ({ amount: '276.41' })),
}));
vi.mock('@/api/client', () => ({ http, errorMessage: (e: unknown) => String(e) }));
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ can: () => true }) }));

const source: Fueling = {
  id: 'f1',
  vehicle: { id: 'v1', name: 'Van 01', plate: 'ABC1D23' },
  driver: { id: 'd1', name: 'João' },
  fuelType: 'DIESEL_S10',
  date: '2026-09-02',
  liters: '45.320',
  pricePerLiter: '6.0990',
  amount: '276.41',
  odometerKm: 120345,
  station: 'Posto Central',
  payable: { id: 'p1', status: 'PAID', approvalStatus: 'APPROVED', paidAmount: '276.41', dueDate: '2026-09-02' },
} as Fueling;

describe('FuelingFormDialog duplicando', () => {
  it('pré-preenche com o abastecimento de origem (data de hoje, sem odômetro) e cria um novo', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <FuelingFormDialog open onOpenChange={() => {}} source={source} />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Duplicar abastecimento')).toBeInTheDocument();
    expect(screen.getByLabelText('Litros')).toHaveValue('45,32');
    expect(screen.getByLabelText(/Preço por litro/)).toHaveValue('6,099');
    expect(screen.getByLabelText(/Posto/)).toHaveValue('Posto Central');
    expect(screen.getByLabelText(/Odômetro/)).toHaveValue('');
    await waitFor(() => expect(screen.getByLabelText('Veículo')).toHaveValue('v1'));

    fireEvent.click(screen.getByRole('button', { name: 'Registrar' }));
    await waitFor(() => expect(http.post).toHaveBeenCalled());
    expect(http.post).toHaveBeenCalledWith(
      '/fuelings',
      expect.objectContaining({ vehicleId: 'v1', fuelType: 'DIESEL_S10', liters: '45.32', pricePerLiter: '6.099', date: todayISO(), odometerKm: undefined, settleNow: undefined }),
    );
  });
});
