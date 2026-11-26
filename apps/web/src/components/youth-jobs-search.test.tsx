import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { api, ApiError } from '../api';
import { YouthJobsSearch } from './youth-jobs-search';

vi.mock('../api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api')>()),
  api: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

const summary = {
  id: 'job-id',
  title: 'Aprendiz',
  companyName: 'Empresa local',
  description: 'Apoio à equipe',
  city: 'Itajaí',
  state: 'SC',
  area: 'ADMINISTRATION',
  contract: 'APPRENTICESHIP',
  regime: 'ONSITE',
  deadline: '2099-12-31',
};
const result = {
  items: [summary],
  options: {
    areas: [{ value: 'ADMINISTRATION', label: 'Administração' }],
    contracts: [{ value: 'APPRENTICESHIP', label: 'Aprendizagem' }],
    regimes: [{ value: 'ONSITE', label: 'Presencial' }],
  },
  total: 1,
  totalPages: 1,
};
const details = {
  job: { ...summary, requirements: 'Organização', availability: 'OPEN' },
  application: null,
};

it('opens details from filtered results, sends the saved resume and restores the search', async () => {
  const user = userEvent.setup();
  const application = {
    id: 'application-id',
    submittedAt: '2026-11-25T12:00:00Z',
  };
  vi.mocked(api)
    .mockResolvedValueOnce(result)
    .mockResolvedValueOnce(result)
    .mockResolvedValueOnce(details)
    .mockRejectedValueOnce(
      new ApiError('Salve uma habilidade no currículo.', 400),
    )
    .mockResolvedValueOnce({ application })
    .mockResolvedValueOnce({ ...details, application });

  render(<YouthJobsSearch expired={vi.fn()} />);
  const keyword = screen.getByRole('searchbox', { name: 'Palavra-chave' });
  await user.type(keyword, 'equipe');
  await user.click(screen.getByRole('button', { name: 'Buscar vagas' }));
  const trigger = await screen.findByRole('button', {
    name: 'Ver detalhes de Aprendiz',
  });
  expect(api).toHaveBeenLastCalledWith(
    '/jobs?page=1&pageSize=10&keyword=equipe',
  );
  await user.click(trigger);
  expect(await screen.findByText('Organização')).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Enviar candidatura' }));
  expect(
    await screen.findByRole('link', { name: 'Ir para Meu currículo' }),
  ).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Enviar candidatura' }));
  expect(await screen.findByText('Candidatura enviada.')).toBeTruthy();
  expect(api).toHaveBeenLastCalledWith('/jobs/job-id/applications', 'POST');

  await user.click(screen.getByRole('button', { name: 'Voltar às vagas' }));
  expect((keyword as HTMLInputElement).value).toBe('equipe');
  expect(document.activeElement).toBe(trigger);
  await user.click(trigger);
  expect(await screen.findByText('Candidatura enviada.')).toBeTruthy();
  expect(
    screen.queryByRole('button', { name: 'Enviar candidatura' }),
  ).toBeNull();
});

it('shows when a vacancy closes before the youth opens its details', async () => {
  const user = userEvent.setup();
  vi.mocked(api)
    .mockResolvedValueOnce(result)
    .mockResolvedValueOnce({
      ...details,
      job: { ...details.job, availability: 'CLOSED' },
    });

  render(<YouthJobsSearch expired={vi.fn()} />);
  await user.click(
    await screen.findByRole('button', { name: 'Ver detalhes de Aprendiz' }),
  );
  expect(await screen.findByText('Vaga encerrada')).toBeTruthy();
  expect(
    screen.queryByRole('button', { name: 'Enviar candidatura' }),
  ).toBeNull();
});
