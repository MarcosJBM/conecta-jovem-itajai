import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { JobsDashboard } from './jobs-dashboard'
import { api, ApiError } from '../api'
vi.mock('../api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api')>()),
  api: vi.fn(),
}))
afterEach(() => {
  cleanup()
  vi.resetAllMocks()
})
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
}
const job = { ...values, id: 'job', status: 'OPEN', availability: 'OPEN' }
const catalog = {
  today: '2026-10-21',
  options: {
    areas: [{ value: 'ADMINISTRATION', label: 'Administração' }],
    contracts: [{ value: 'APPRENTICESHIP', label: 'Aprendizagem' }],
    regimes: [{ value: 'ONSITE', label: 'Presencial' }],
  },
}
it('creates and publishes directly from a single form without a draft step', async () => {
  const user = userEvent.setup()
  let created = false
  vi.mocked(api).mockImplementation(async (path, method) => {
    if (path.endsWith('/options')) return catalog
    if (method === 'POST') {
      created = true
      return { job }
    }
    return {
      items: created ? [job] : [],
      total: created ? 1 : 0,
      totalPages: created ? 1 : 0,
    }
  })
  render(<JobsDashboard expired={vi.fn()} />)
  const create = await screen.findByRole('button', { name: 'Criar vaga' })
  await user.click(create)
  await user.type(await screen.findByLabelText('Título da vaga'), values.title)
  await user.type(
    screen.getByLabelText('Descrição da vaga'),
    values.description,
  )
  await user.type(screen.getByLabelText('Requisitos'), values.requirements)
  await user.type(screen.getByLabelText('Cidade'), values.city)
  await user.selectOptions(screen.getByLabelText('UF'), 'SC')
  await user.selectOptions(
    screen.getByLabelText('Área profissional'),
    values.area,
  )
  await user.selectOptions(
    screen.getByLabelText('Tipo de contratação'),
    values.contract,
  )
  await user.selectOptions(
    screen.getByLabelText('Regime de trabalho'),
    values.regime,
  )
  await user.type(
    screen.getByLabelText('Prazo de candidatura'),
    values.deadline,
  )
  await user.click(
    screen.getByRole('button', { name: 'Criar e publicar vaga' }),
  )
  await screen.findByText('Vaga criada e publicada.')
  expect(api).toHaveBeenCalledWith('/companies/me/jobs', 'POST', values)
  expect(await screen.findByText('Aprendiz')).toBeTruthy()
})
it('preserves values when editing fails and can close an open job', async () => {
  const user = userEvent.setup()
  let closed = false
  vi.mocked(api).mockImplementation(async (path, method) => {
    if (path.endsWith('/options')) return catalog
    if (method === 'PUT') throw new ApiError('Falha ao atualizar.', 500)
    if (path.endsWith('/close')) {
      closed = true
      return { job: { ...job, availability: 'CLOSED' } }
    }
    if (path.endsWith('/job')) return { job }
    return {
      items: [{ ...job, availability: closed ? 'CLOSED' : 'OPEN' }],
      total: 1,
      totalPages: 1,
    }
  })
  render(<JobsDashboard expired={vi.fn()} />)
  await user.click(await screen.findByRole('button', { name: 'Editar vaga' }))
  await user.clear(await screen.findByLabelText('Título da vaga'))
  await user.type(screen.getByLabelText('Título da vaga'), 'Vaga alterada')
  await user.click(screen.getByRole('button', { name: 'Salvar alterações' }))
  await screen.findByText('Falha ao atualizar.')
  expect(
    (screen.getByLabelText('Título da vaga') as HTMLInputElement).value,
  ).toBe('Vaga alterada')
  await user.click(screen.getByRole('button', { name: 'Fechar' }))
  await user.click(screen.getByRole('button', { name: 'Encerrar vaga' }))
  await screen.findByText('Vaga encerrada.')
  expect(api).toHaveBeenCalledWith('/companies/me/jobs/job/close', 'POST', {})
})
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
  )
  render(<JobsDashboard expired={vi.fn()} />)
  await screen.findByText('Prazo encerrado · Prazo: 31/12/2099')
  expect(screen.queryByRole('button', { name: 'Editar vaga' })).toBeNull()
  expect(screen.queryByRole('button', { name: 'Encerrar vaga' })).toBeNull()
  expect(screen.queryByRole('button', { name: /Reabrir/ })).toBeNull()
})
