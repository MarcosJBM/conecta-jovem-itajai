import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation, useNavigate } from 'react-router';
import { afterEach, expect, it, vi } from 'vitest';
import App from './app';
import { api, ApiError } from './api';

vi.mock('./api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./api')>()),
  api: vi.fn(),
}));
vi.mock('./components/resume-dashboard', () => ({
  ResumeDashboard: () => <h1>Meu currículo</h1>,
}));

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

function NavigationProbe() {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  return (
    <>
      <output aria-label="URL atual">
        {pathname}
        {search}
      </output>
      <button type="button" onClick={() => void navigate(-1)}>
        Voltar no navegador
      </button>
    </>
  );
}

it('protects Vagas and sends the young user to Perfil after login', async () => {
  const user = userEvent.setup();
  vi.mocked(api)
    .mockRejectedValueOnce(new ApiError('Autenticação necessária.', 401))
    .mockResolvedValueOnce({
      user: { id: 'youth-id', role: 'YOUTH', email: 'jovem@example.com' },
    })
    .mockResolvedValueOnce({
      items: [],
      options: { areas: [], contracts: [], regimes: [] },
      total: 0,
      totalPages: 0,
    })
    .mockResolvedValueOnce({});
  render(
    <MemoryRouter initialEntries={['/vagas']}>
      <App />
      <NavigationProbe />
    </MemoryRouter>,
  );

  await user.type(
    await screen.findByLabelText('E-mail de acesso'),
    'jovem@example.com',
  );
  expect(screen.getByLabelText('URL atual').textContent).toBe('/login');
  await user.type(screen.getByLabelText('Senha'), 'abcdef');
  await user.click(screen.getByRole('button', { name: 'Entrar' }));
  expect(
    await screen.findByRole('heading', { name: 'Meu currículo' }),
  ).toBeTruthy();
  expect(screen.getByLabelText('URL atual').textContent).toBe('/perfil');
  expect(screen.getByText('Perfil').getAttribute('aria-current')).toBe('page');

  const menu = screen.getByRole('button', { name: 'Menu' });
  await user.click(menu);
  expect(menu.getAttribute('aria-expanded')).toBe('true');
  await user.click(screen.getByRole('link', { name: 'Vagas' }));
  expect(
    await screen.findByRole('heading', { name: 'Vagas abertas' }),
  ).toBeTruthy();
  expect(
    screen.getByRole('link', { name: 'Vagas' }).getAttribute('aria-current'),
  ).toBe('page');
  expect(menu.getAttribute('aria-expanded')).toBe('false');
  expect(document.activeElement).toBe(screen.getByRole('main'));
  expect(screen.queryByRole('heading', { name: 'Meu currículo' })).toBeNull();

  await user.click(screen.getByRole('button', { name: 'Sair' }));
  expect(await screen.findByRole('button', { name: 'Entrar' })).toBeTruthy();
  expect(api).toHaveBeenLastCalledWith('/auth/logout', 'POST');
});

it('restores the URL, page and filters on browser Back from details', async () => {
  const user = userEvent.setup();
  const job = {
    id: 'job-id',
    title: 'Aprendiz',
    description: 'Apoio à equipe',
    requirements: 'Organização',
    companyName: 'Empresa local',
    city: 'Itajaí',
    state: 'SC',
    area: 'ADMINISTRATION',
    contract: 'APPRENTICESHIP',
    regime: 'ONSITE',
    deadline: '2099-12-31',
    availability: 'OPEN',
  };
  vi.mocked(api)
    .mockResolvedValueOnce({
      user: { id: 'youth-id', role: 'YOUTH', email: 'jovem@example.com' },
    })
    .mockResolvedValueOnce({
      items: [job],
      options: { areas: [], contracts: [], regimes: [] },
      total: 12,
      totalPages: 2,
    })
    .mockResolvedValueOnce({ job, application: null });
  render(
    <MemoryRouter initialEntries={['/vagas?page=2&keyword=equipe']}>
      <App />
      <NavigationProbe />
    </MemoryRouter>,
  );
  const trigger = await screen.findByRole('link', {
    name: 'Ver detalhes de Aprendiz',
  });
  expect(api).toHaveBeenLastCalledWith(
    '/jobs?page=2&pageSize=10&keyword=equipe',
  );
  await user.click(trigger);
  expect(await screen.findByText('Organização')).toBeTruthy();
  expect(screen.getByLabelText('URL atual').textContent).toBe(
    '/vagas/job-id?page=2&keyword=equipe',
  );

  await user.click(screen.getByRole('button', { name: 'Voltar no navegador' }));
  const keyword = await screen.findByRole<HTMLInputElement>('searchbox', {
    name: 'Palavra-chave',
  });
  expect(keyword.value).toBe('equipe');
  expect(screen.getByText('Página 2 de 2')).toBeTruthy();
  expect(screen.getByLabelText('URL atual').textContent).toBe(
    '/vagas?page=2&keyword=equipe',
  );
});

it('opens the youth applications with a notification and the status history', async () => {
  const user = userEvent.setup();
  const event = {
    id: 'event-id',
    changedAt: '2026-11-27T14:00:00Z',
    previousStatus: 'RECEIVED',
    newStatus: 'IN_REVIEW',
  };
  vi.mocked(api)
    .mockResolvedValueOnce({
      user: { id: 'youth-id', role: 'YOUTH', email: 'jovem@example.com' },
    })
    .mockResolvedValueOnce({
      page: 1,
      totalPages: 1,
      items: [
        {
          id: 'application-id',
          jobTitle: 'Aprendiz',
          companyName: 'Empresa local',
          status: 'IN_REVIEW',
          submittedAt: '2026-11-27T13:00:00Z',
          statusHistory: [event],
        },
      ],
      notifications: [{ ...event, jobTitle: 'Aprendiz' }],
    });
  render(
    <MemoryRouter initialEntries={['/perfil']}>
      <App />
    </MemoryRouter>,
  );
  await user.click(
    await screen.findByRole('link', { name: 'Minhas candidaturas' }),
  );
  expect(await screen.findByText('Aprendiz · Em análise')).toBeTruthy();
  expect(screen.getByText('Empresa local · Em análise')).toBeTruthy();
  const summary = screen.getByText('Histórico de status');
  await user.click(summary);
  expect(summary.parentElement?.hasAttribute('open')).toBe(true);
  expect(screen.getByText('De Recebida para Em análise')).toBeTruthy();
});
