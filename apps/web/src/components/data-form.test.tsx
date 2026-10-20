import { afterEach, beforeAll, afterAll, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DataForm } from './data-form'
import { ApiError } from '../api'
import { companyFields, credentials, youthFields } from '../forms'
// jsdom has no layout observer; Radix Checkbox uses it only for sizing its hidden input.
beforeAll(() =>
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  ),
)
afterAll(() => vi.unstubAllGlobals())
afterEach(cleanup)

it('formats typed/pasted Brazilian data, supports deletion, validates and submits through React Hook Form', async () => {
  const user = userEvent.setup()
  const submit = vi.fn(async () => {})
  const fields = youthFields.filter((field) =>
    ['cpf', 'phone', 'postalCode', 'state'].includes(field.name),
  )
  render(
    <DataForm
      title="Teste"
      fields={fields}
      action="Enviar"
      onSubmit={submit}
      terms
    />,
  )
  const cpf = screen.getByLabelText('CPF') as HTMLInputElement
  await user.type(cpf, '52998224725')
  expect(cpf.value).toBe('529.982.247-25')
  await user.type(cpf, '{Backspace}')
  expect(cpf.value).toBe('529.982.247-2')
  await user.type(cpf, '5')
  expect(cpf.value).toBe('529.982.247-25')
  const phone = screen.getByLabelText('Celular com DDD') as HTMLInputElement
  await user.click(phone)
  await user.paste('+55 (47) 99999-1234')
  expect(phone.value).toBe('(47) 99999-1234')
  const cep = screen.getByLabelText('CEP') as HTMLInputElement
  await user.type(cep, '01001000')
  expect(cep.value).toBe('01001-000')
  await user.selectOptions(screen.getByLabelText('Estado (UF)'), 'SC')
  await user.click(screen.getByRole('button', { name: 'Enviar' }))
  expect(submit).not.toHaveBeenCalled()
  expect(
    await screen.findByText('O aceite dos termos é obrigatório.'),
  ).toBeTruthy()
  await user.click(
    screen.getByRole('checkbox', { name: 'Li e aceito os termos de uso.' }),
  )
  await user.click(screen.getByRole('button', { name: 'Enviar' }))
  await waitFor(() =>
    expect(submit).toHaveBeenCalledWith({
      cpf: '529.982.247-25',
      phone: '(47) 99999-1234',
      postalCode: '01001-000',
      state: 'SC',
      acceptedTerms: 'on',
    }),
  )
})
it('blocks invalid documents and shows server field errors without losing entered data', async () => {
  const user = userEvent.setup()
  const submit = vi.fn(async () => {
    throw new ApiError('CPF já cadastrado.', 409, { cpf: 'CPF já cadastrado.' })
  })
  render(
    <DataForm
      title="Teste"
      fields={youthFields.filter((field) => field.name === 'cpf')}
      action="Enviar"
      onSubmit={submit}
    />,
  )
  const cpf = screen.getByLabelText('CPF') as HTMLInputElement
  await user.type(cpf, '11111111111')
  await user.click(screen.getByRole('button', { name: 'Enviar' }))
  expect(submit).not.toHaveBeenCalled()
  expect(await screen.findByText('Informe um CPF válido.')).toBeTruthy()
  await user.clear(cpf)
  await user.type(cpf, '52998224725')
  await user.click(screen.getByRole('button', { name: 'Enviar' }))
  await waitFor(() =>
    expect(screen.getAllByText('CPF já cadastrado.')).toHaveLength(2),
  )
  expect(cpf.value).toBe('529.982.247-25')
  expect(cpf.getAttribute('aria-invalid')).toBe('true')
})
it('formats prefilled company values, preserves alphanumeric CNPJ and prevents duplicate requests while saving', async () => {
  const user = userEvent.setup()
  let finish!: () => void
  const submit = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve
      }),
  )
  render(
    <DataForm
      title="Correção"
      fields={companyFields.filter((field) =>
        ['cnpj', 'phone'].includes(field.name),
      )}
      initial={{ cnpj: '12ABC34501DE35', phone: '47999991234' }}
      action="Salvar"
      onSubmit={submit}
    />,
  )
  expect((screen.getByLabelText('CNPJ') as HTMLInputElement).value).toBe(
    '12.ABC.345/01DE-35',
  )
  expect(
    (screen.getByLabelText('Telefone com DDD') as HTMLInputElement).value,
  ).toBe('(47) 99999-1234')
  await user.dblClick(screen.getByRole('button', { name: 'Salvar' }))
  await waitFor(() => expect(submit).toHaveBeenCalledTimes(1))
  expect(
    screen.getByRole('button', { name: 'Aguarde…' }).hasAttribute('disabled'),
  ).toBe(true)
  finish()
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Salvar' }).hasAttribute('disabled'),
    ).toBe(false),
  )
})
it('keeps the agreed six-character password policy and treats a login as an existing credential', async () => {
  const user = userEvent.setup(),
    submit = vi.fn(async () => {})
  render(
    <DataForm
      title="Conta"
      fields={credentials}
      action="Criar"
      onSubmit={submit}
    />,
  )
  await user.type(
    screen.getByLabelText('E-mail de acesso'),
    'teste@example.com',
  )
  await user.type(screen.getByLabelText('Senha'), 'abcde')
  await user.click(screen.getByRole('button', { name: 'Criar' }))
  expect(submit).not.toHaveBeenCalled()
  expect(
    await screen.findByText('Use pelo menos 6 caracteres.', {
      selector: 'p[role="alert"]',
    }),
  ).toBeTruthy()
  await user.type(screen.getByLabelText('Senha'), 'f')
  await user.click(screen.getByRole('button', { name: 'Criar' }))
  await waitFor(() =>
    expect(submit).toHaveBeenCalledWith({
      email: 'teste@example.com',
      password: 'abcdef',
    }),
  )
})
