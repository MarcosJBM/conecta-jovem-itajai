import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminDashboard } from './admin-dashboard';
import { api, ApiError } from '../api';
vi.mock('../api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api')>()),
  api: vi.fn(),
}));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
const review = {
  id: 'review',
  status: 'PENDING',
  rejectionReason: null,
  company: {
    id: 'company',
    legalName: 'Empresa teste',
    tradeName: null,
    cnpj: '12ABC34501DE35',
    city: 'Itajaí',
    state: 'SC',
    contactName: 'Ana',
    contactRole: 'RH',
    phone: '47999991234',
    email: 'empresa@example.com',
  },
};
it('requires a rejection reason and removes the decided company from pending requests', async () => {
  const user = userEvent.setup();
  let pending = true;
  vi.mocked(api).mockImplementation(async (path, method) => {
    if (method === 'POST') {
      pending = false;
      return { review: { ...review, status: 'REJECTED' } };
    }
    if (path === '/admin/company-validations/review') return { review };
    return {
      items: pending ? [review] : [],
      total: pending ? 1 : 0,
      totalPages: pending ? 1 : 0,
    };
  });
  render(<AdminDashboard expired={vi.fn()} />);
  await user.click(
    await screen.findByRole('button', { name: 'Analisar Empresa teste' }),
  );
  await user.selectOptions(await screen.findByLabelText('Decisão'), 'REJECTED');
  await user.click(screen.getByRole('button', { name: 'Confirmar decisão' }));
  expect(screen.getByText('Campo obrigatório.')).toBeTruthy();
  await user.type(
    screen.getByLabelText('Justificativa da rejeição'),
    'Corrigir cadastro.',
  );
  await user.click(screen.getByRole('button', { name: 'Confirmar decisão' }));
  await screen.findByText(
    'Empresa rejeitada. O motivo está disponível para a empresa.',
  );
  expect(api).toHaveBeenCalledWith(
    '/admin/company-validations/review/decision',
    'POST',
    { status: 'REJECTED', reason: 'Corrigir cadastro.' },
  );
  expect(
    await screen.findByText('Nenhuma solicitação pendente nesta página.'),
  ).toBeTruthy();
});
it('reports concurrent decisions without clearing the typed reason', async () => {
  const user = userEvent.setup();
  vi.mocked(api).mockImplementation(async (path, method) => {
    if (method === 'POST')
      throw new ApiError(
        'Esta solicitação já foi analisada. Atualize a lista.',
        409,
      );
    return path.endsWith('/review')
      ? { review }
      : { items: [review], total: 1, totalPages: 1 };
  });
  render(<AdminDashboard expired={vi.fn()} />);
  await user.click(
    await screen.findByRole('button', { name: 'Analisar Empresa teste' }),
  );
  await user.selectOptions(await screen.findByLabelText('Decisão'), 'REJECTED');
  await user.type(
    screen.getByLabelText('Justificativa da rejeição'),
    'Dados divergentes.',
  );
  await user.click(screen.getByRole('button', { name: 'Confirmar decisão' }));
  await screen.findByText(
    'Esta solicitação já foi analisada. Atualize a lista.',
  );
  expect(
    (screen.getByLabelText('Justificativa da rejeição') as HTMLInputElement)
      .value,
  ).toBe('Dados divergentes.');
});
