import { afterEach, beforeAll, afterAll, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResumeDashboard } from './resume-dashboard';
import { api, ApiError } from '../api';

vi.mock('../api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api')>();
  return { ...actual, api: vi.fn() };
});
beforeAll(() =>
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  ),
);
afterAll(() => vi.unstubAllGlobals());
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
it('removes a repeated field with the keyboard and preserves the remaining skill', async () => {
  const user = userEvent.setup();
  vi.mocked(api).mockResolvedValueOnce(result).mockResolvedValueOnce(result);
  render(<ResumeDashboard expired={vi.fn()} />);
  const add = await screen.findByRole('button', {
    name: 'Adicionar habilidade',
  });
  await user.click(add);
  await user.type(screen.getByLabelText('Habilidade 1'), 'Primeira');
  await user.click(add);
  await user.type(screen.getByLabelText('Habilidade 2'), 'Segunda');
  screen.getByRole('button', { name: 'Remover habilidade 1' }).focus();
  await user.keyboard('{Enter}');
  expect(
    (screen.getByLabelText('Habilidade 1') as HTMLInputElement).value,
  ).toBe('Segunda');
  await user.click(screen.getByRole('button', { name: 'Salvar currículo' }));
  await waitFor(() =>
    expect(api).toHaveBeenLastCalledWith('/resumes/me', 'PUT', {
      skills: ['Segunda'],
      educations: [],
      experiences: [],
    }),
  );
});
const result = {
  resume: {
    personalDetails: {
      firstName: 'Ana',
      lastName: 'Silva',
      city: 'Itajaí',
      state: 'SC',
      phone: '47999991234',
    },
    skills: [],
    educations: [],
    experiences: [],
  },
  completeness: { complete: false, missingFields: ['skills'] },
  updatedAt: null,
};
it('adds/removes entries, saves skills without education/experience and displays the saved resume', async () => {
  const user = userEvent.setup();
  vi.mocked(api)
    .mockResolvedValueOnce(result)
    .mockResolvedValueOnce({
      ...result,
      resume: { ...result.resume, skills: ['Comunicação'] },
      completeness: { complete: true, missingFields: [] },
    });
  render(<ResumeDashboard expired={vi.fn()} />);
  await user.click(
    await screen.findByRole('button', { name: 'Adicionar habilidade' }),
  );
  await user.type(screen.getByLabelText('Habilidade 1'), 'Comunicação');
  await user.click(screen.getByRole('button', { name: 'Adicionar formação' }));
  await user.click(screen.getByRole('button', { name: 'Remover formação 1' }));
  await user.click(
    screen.getByRole('button', { name: 'Adicionar experiência' }),
  );
  await user.click(
    screen.getByRole('button', { name: 'Remover experiência 1' }),
  );
  await user.click(screen.getByRole('button', { name: 'Salvar currículo' }));
  await screen.findByText('Currículo salvo com sucesso.');
  expect(api).toHaveBeenLastCalledWith('/resumes/me', 'PUT', {
    skills: ['Comunicação'],
    educations: [],
    experiences: [],
  });
  expect(screen.getByText('Currículo completo')).toBeTruthy();
  expect(screen.getByText('Ana Silva')).toBeTruthy();
});
it('keeps typed values on server errors and blocks blank skills', async () => {
  const user = userEvent.setup();
  vi.mocked(api)
    .mockResolvedValueOnce(result)
    .mockRejectedValueOnce(new ApiError('Falha ao salvar.', 500));
  render(<ResumeDashboard expired={vi.fn()} />);
  await user.click(
    await screen.findByRole('button', { name: 'Adicionar habilidade' }),
  );
  await user.click(screen.getByRole('button', { name: 'Salvar currículo' }));
  expect(api).toHaveBeenCalledTimes(1);
  await user.type(screen.getByLabelText('Habilidade 1'), 'Organização');
  await user.click(screen.getByRole('button', { name: 'Salvar currículo' }));
  await screen.findByText('Falha ao salvar.');
  expect(
    (screen.getByLabelText('Habilidade 1') as HTMLInputElement).value,
  ).toBe('Organização');
});
it('disables submission while saving and handles session expiration', async () => {
  const user = userEvent.setup();
  const expired = vi.fn();
  let rejectSave: (error: unknown) => void = () => {};
  vi.mocked(api)
    .mockResolvedValueOnce(result)
    .mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          rejectSave = reject;
        }),
    );
  render(<ResumeDashboard expired={expired} />);
  const save = await screen.findByRole('button', { name: 'Salvar currículo' });
  await user.dblClick(save);
  expect(api).toHaveBeenCalledTimes(2);
  rejectSave(new ApiError('Sessão expirada.', 401));
  await waitFor(() => expect(expired).toHaveBeenCalledOnce());
});
