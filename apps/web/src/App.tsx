import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'

const states = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
]
const fields = [
  {
    name: 'legalName',
    label: 'Razão social',
    maxLength: 200,
    autoComplete: 'organization',
  },
  { name: 'tradeName', label: 'Nome fantasia', maxLength: 200, optional: true },
  {
    name: 'cnpj',
    label: 'CNPJ',
    maxLength: 18,
    placeholder: '12.ABC.345/01DE-35',
  },
  {
    name: 'city',
    label: 'Cidade',
    maxLength: 100,
    autoComplete: 'address-level2',
  },
  {
    name: 'contactName',
    label: 'Nome do responsável',
    maxLength: 150,
    autoComplete: 'name',
  },
  {
    name: 'contactRole',
    label: 'Cargo ou vínculo',
    maxLength: 100,
    autoComplete: 'organization-title',
  },
  {
    name: 'phone',
    label: 'Telefone com DDD',
    maxLength: 20,
    type: 'tel',
    autoComplete: 'tel-national',
  },
  {
    name: 'email',
    label: 'E-mail de acesso',
    maxLength: 254,
    type: 'email',
    autoComplete: 'email',
  },
  {
    name: 'password',
    label: 'Senha',
    type: 'password',
    autoComplete: 'new-password',
  },
]

function App() {
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState('')
  const [completed, setCompleted] = useState(false)
  const sending = useRef(false)
  const feedback = useRef<HTMLDivElement>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (sending.current) return
    const form = event.currentTarget
    const data = Object.fromEntries(new FormData(form))
    if (new TextEncoder().encode(String(data.password)).length > 72) {
      setErrors({
        password:
          'Use no máximo 72 bytes na senha (acentos podem ocupar mais de um byte).',
      })
      return
    }
    sending.current = true
    setSubmitting(true)
    setErrors({})
    setMessage('')
    try {
      const response = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const result = await response.json()
      if (!response.ok) {
        setErrors(result.fields ?? {})
        setMessage(
          result.message ??
            'Não foi possível concluir o cadastro. Tente novamente.',
        )
        requestAnimationFrame(() => feedback.current?.focus())
        return
      }
      form.reset()
      setCompleted(true)
    } catch {
      setMessage(
        'Não foi possível conectar ao servidor. Tente novamente em instantes.',
      )
      requestAnimationFrame(() => feedback.current?.focus())
    } finally {
      sending.current = false
      setSubmitting(false)
    }
  }

  return (
    <main className="registration">
      <a className="brand" href="/" aria-label="Conecta Jovem Itajaí, início">
        conecta<span>jovem</span> <small>ITAJAÍ</small>
      </a>
      <header>
        <p className="eyebrow">PARA EMPRESAS</p>
        <h1>
          Conecte sua empresa
          <br />a novos talentos.
        </h1>
        <p>
          Crie a conta da sua empresa. Nossa equipe vai conferir os dados antes
          de aprovar o cadastro.
        </p>
      </header>
      {completed ? (
        <section className="card success" aria-labelledby="success-title">
          <span className="badge">AGUARDANDO VALIDAÇÃO</span>
          <h2 id="success-title">Cadastro enviado!</h2>
          <p>
            Sua conta foi criada e a empresa está aguardando análise pelo
            administrador.
          </p>
        </section>
      ) : (
        <form className="card" onSubmit={submit} aria-busy={submitting}>
          <h2>Cadastre sua empresa</h2>
          <p className="form-note">
            Todos os campos são obrigatórios, exceto nome fantasia.
          </p>
          <div ref={feedback} tabIndex={-1} role="alert">
            {message && <p className="error-banner">{message}</p>}
          </div>
          <fieldset disabled={submitting}>
            <legend className="sr-only">Dados da empresa e da conta</legend>
            <div className="fields">
              {fields.map((field) => (
                <div className="field" key={field.name}>
                  <label htmlFor={field.name}>
                    {field.label}
                    {field.optional && <span> (opcional)</span>}
                  </label>
                  <input
                    id={field.name}
                    name={field.name}
                    type={field.type ?? 'text'}
                    required={!field.optional}
                    maxLength={field.maxLength}
                    minLength={field.name === 'password' ? 8 : undefined}
                    autoComplete={field.autoComplete}
                    placeholder={field.placeholder}
                    aria-invalid={Boolean(errors[field.name])}
                    aria-describedby={
                      errors[field.name]
                        ? `${field.name}-error`
                        : field.name === 'password'
                          ? 'password-help'
                          : undefined
                    }
                  />
                  {field.name === 'password' && (
                    <small id="password-help">
                      Pelo menos 8 caracteres; máximo de 72 bytes.
                    </small>
                  )}
                  {errors[field.name] && (
                    <small className="field-error" id={`${field.name}-error`}>
                      {errors[field.name]}
                    </small>
                  )}
                </div>
              ))}
              <div className="field">
                <label htmlFor="state">Estado (UF)</label>
                <select
                  id="state"
                  name="state"
                  required
                  defaultValue=""
                  autoComplete="address-level1"
                  aria-invalid={Boolean(errors.state)}
                  aria-describedby={errors.state ? 'state-error' : undefined}
                >
                  <option value="" disabled>
                    Selecione o estado
                  </option>
                  {states.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
                {errors.state && (
                  <small className="field-error" id="state-error">
                    {errors.state}
                  </small>
                )}
              </div>
            </div>
            <div className="form-footer">
              <p>Após o envio, o cadastro ficará pendente de validação.</p>
              <button type="submit">
                {submitting ? 'Enviando cadastro…' : 'Criar conta da empresa →'}
              </button>
            </div>
          </fieldset>
        </form>
      )}
      <footer>
        Conecta Jovem Itajaí · Aproximando empresas e oportunidades
      </footer>
    </main>
  )
}
export default App
