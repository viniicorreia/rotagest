import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Me } from '@/api/types';
import { RequireCompany } from './guards';

const auth = vi.hoisted(() => ({ me: undefined as unknown }));
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ me: auth.me, can: () => false }) }));

function renderAt(me: Me) {
  auth.me = me;
  const router = createMemoryRouter(
    [
      { element: <RequireCompany />, children: [{ path: '/app', element: <p>app</p> }] },
      { path: '/platform', element: <p>plataforma</p> },
      { path: '/onboarding', element: <p>onboarding</p> },
    ],
    { initialEntries: ['/app'] },
  );
  render(<RouterProvider router={router} />);
}

const superAdmin: Me['user'] = { id: 'u1', name: 'Admin', email: 'admin@rotagest.com', platformRole: 'SUPER_ADMIN' };

afterEach(() => {
  auth.me = undefined;
});

describe('RequireCompany', () => {
  it('manda o SUPER_ADMIN sem empresa para o painel da plataforma', async () => {
    renderAt({ user: superAdmin, companies: [], activeCompany: null });
    expect(await screen.findByText('plataforma')).toBeInTheDocument();
  });

  it('deixa o SUPER_ADMIN em modo suporte entrar no app', async () => {
    renderAt({
      user: superAdmin,
      companies: [],
      activeCompany: { id: 'c1', tradeName: 'Transportes X', role: 'MANAGER', permissions: ['company:read'], support: { expiresAt: '2026-10-22T18:00:00Z' } },
    });
    expect(await screen.findByText('app')).toBeInTheDocument();
  });
});
