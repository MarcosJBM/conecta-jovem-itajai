import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { JobsDashboard } from './jobs-dashboard';
import { api, ApiError } from '../api';
vi.mock('../api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api')>()),
  api: vi.fn(),
}));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
const values = {
  title: 'Aprendiz',
  description: 'Apoio administrativo',
  requirements: 'Organização',
  city: 'Itajaí',
  state: 'SC',
  area: 'ADMINISTRATION',
  contract: 'APPRENTICESHIP',
  regime: 'ONSITE',
  deadline: '2099-12-31',
};
const job = { ...values, id: 'job', status: 'OPEN', availability: 'OPEN' };
const catalog = {
  today: '2026-10-21',
  options: {
    areas: [{ value: 'ADMINISTRATION', label: 'Administração' }],
    contracts: [{ value: 'APPRENTICESHIP', label: 'Aprendizagem' }],
    regimes: [{ value: 'ONSITE', label: 'Presencial' }],
  },
};
it('creates and publishes directly from a single form without a draft step', async () => {
  const user = userEvent.setup();
  let created = false;
  vi.mocked(api).mockImplementation(async (path, method) => {
    if (path.endsWith('/options')) return catalog;
    if (method === 'POST') {
      created = true;
      return { job };
    }
    return {
      items: created ? [job] : [],
      total: created ? 1 : 0,
      totalPages: created ? 1 : 0,
    };
  });
  render(<JobsDashboard expired={vi.fn()} />);
  const create = await screen.findByRole('button', { name: 'Criar vaga' });
  await user.click(create);
  await user.type(await screen.findByLabelText('Título da vaga'), values.title);
  await user.type(
    screen.getByLabelText('Descrição da vaga'),
    values.description,
  );
  await user.type(screen.getByLabelText('Requisitos'), values.requirements);
  await user.type(screen.getByLabelText('Cidade'), values.city);
  await user.selectOptions(screen.getByLabelText('UF'), 'SC');
  await user.selectOptions(
    screen.getByLabelText('Área profissional'),
    values.area,
  );
  await user.selectOptions(
    screen.getByLabelText('Tipo de contratação'),
    values.contract,
  );
  await user.selectOptions(
    screen.getByLabelText('Regime de trabalho'),
    values.regime,
  );
  await user.type(
    screen.getByLabelText('Prazo de candidatura'),
    values.deadline,
  );
  await user.click(
    screen.getByRole('button', { name: 'Criar e publicar vaga' }),
  );
  await screen.findByText('Vaga criada e publicada.');
  expect(api).toHaveBeenCalledWith('/companies/me/jobs', 'POST', values);
  expect(await screen.findByText('Aprendiz')).toBeTruthy();
});
it('preserves values when editing fails and can close an open job', async () => {
  const user = userEvent.setup();
  let closed = false;
  vi.mocked(api).mockImplementation(async (path, method) => {
    if (path.endsWith('/options')) return catalog;
    if (method === 'PUT') throw new ApiError('Falha ao atualizar.', 500);
    if (path.endsWith('/close')) {
      closed = true;
      return { job: { ...job, availability: 'CLOSED' } };
    }
    if (path.endsWith('/job')) return { job };
    return {
      items: [{ ...job, availability: closed ? 'CLOSED' : 'OPEN' }],
      total: 1,
      totalPages: 1,
    };
  });
  render(<JobsDashboard expired={vi.fn()} />);
  await user.click(await screen.findByRole('button', { name: 'Editar vaga' }));
  await user.clear(await screen.findByLabelText('Título da vaga'));
  await user.type(screen.getByLabelText('Título da vaga'), 'Vaga alterada');
  await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));
  await screen.findByText('Falha ao atualizar.');
  expect(
    (screen.getByLabelText('Título da vaga') as HTMLInputElement).value,
  ).toBe('Vaga alterada');
  await user.click(screen.getByRole('button', { name: 'Fechar' }));
  await user.click(screen.getByRole('button', { name: 'Encerrar vaga' }));
  await screen.findByText('Vaga encerrada.');
  expect(api).toHaveBeenCalledWith('/companies/me/jobs/job/close', 'POST', {});
});
it('does not offer editing or reopening for expired or closed jobs', async () => {
  vi.mocked(api).mockImplementation(async (path) =>
    path.endsWith('/options')
      ? catalog
      : {
          items: [
            { ...job, availability: 'EXPIRED' },
            { ...job, id: 'closed', availability: 'CLOSED' },
          ],
          total: 2,
          totalPages: 1,
        },
  );
  render(<JobsDashboard expired={vi.fn()} />);
  await screen.findByText('Prazo encerrado · Prazo: 31/12/2099');
  expect(screen.queryByRole('button', { name: 'Editar vaga' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Encerrar vaga' })).toBeNull();
  expect(screen.queryByRole('button', { name: /Reabrir/ })).toBeNull();
});

it('opens the submitted resume on a closed job and allows only the next status', async () => {
  const user = userEvent.setup();
  const path = '/companies/me/jobs/job/applications';
  const receipt = { id: 'candidate', submittedAt: '2026-11-25T16:00:00Z' };
  vi.mocked(api).mockImplementation(async (url, method, body) => {
    if (url.endsWith('/options')) return catalog;
    if (url.startsWith(`${path}?`))
      return {
        items: [{ ...receipt, candidateName: 'Ana Silva' }],
        totalPages: 1,
      };
    if (url === `${path}/candidate`)
      return {
        application: {
          ...receipt,
          status: 'RECEIVED',
          nextStatuses: ['IN_REVIEW'],
          resumeSnapshot: {
            personalDetails: {
              firstName: 'Ana',
              lastName: 'Silva',
              city: 'Itajaí',
              state: 'SC',
              phone: '47999991234',
            },
            skills: ['Excel'],
            educations: [],
            experiences: [],
          },
        },
      };
    if (method === 'PATCH') {
      if ((body as { status: string }).status === 'IN_REVIEW')
        return { status: 'IN_REVIEW', nextStatuses: ['APPROVED', 'REJECTED'] };
      return { status: 'APPROVED', nextStatuses: [] };
    }
    return {
      items: [{ ...job, availability: 'CLOSED' }],
      total: 1,
      totalPages: 1,
    };
  });
  render(<JobsDashboard expired={vi.fn()} />);
  await user.click(
    await screen.findByRole('button', {
      name: 'Ver candidaturas para Aprendiz',
    }),
  );
  await user.click(
    await screen.findByRole('button', { name: 'Ver currículo de Ana Silva' }),
  );
  expect(await screen.findByText('Excel')).toBeTruthy();
  expect(screen.queryByRole('option', { name: 'Aprovada' })).toBeNull();

  await user.selectOptions(
    screen.getByLabelText('Próximo status'),
    'IN_REVIEW',
  );
  await user.click(screen.getByRole('button', { name: 'Atualizar status' }));
  expect(await screen.findByRole('option', { name: 'Aprovada' })).toBeTruthy();
  expect(api).toHaveBeenLastCalledWith(`${path}/candidate/status`, 'PATCH', {
    status: 'IN_REVIEW',
  });

  await user.selectOptions(screen.getByLabelText('Próximo status'), 'APPROVED');
  await user.click(screen.getByRole('button', { name: 'Atualizar status' }));
  expect(await screen.findByText('Aprovada')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Atualizar status' })).toBeNull();
  await user.click(
    screen.getByRole('button', { name: 'Voltar às candidaturas' }),
  );
  expect(
    await screen.findByRole('button', { name: 'Ver currículo de Ana Silva' }),
  ).toBeTruthy();
});
