import { useEffect, useRef, useState } from 'react'
import { FormProvider, useForm, useWatch } from 'react-hook-form'
import { api, ApiError } from '../api'
import { formatBrazilianField } from '../lib/brazilian-data'
import { FormInput } from './form-input'
import { FormSelect } from './form-select'
import { Pagination } from './pagination'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { Alert, AlertDescription } from './ui/alert'

type Review = {
  id: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  rejectionReason: string | null
  company: {
    id: string
    cnpj: string | null
    legalName: string | null
    tradeName: string | null
    city: string | null
    state: string | null
    contactName: string | null
    contactRole: string | null
    phone: string | null
    email: string
  }
}
export function AdminDashboard({ expired }: { expired: () => void }) {
  const form = useForm({ defaultValues: { status: '', reason: '' } })
  const status = useWatch({ control: form.control, name: 'status' })
  const {
    setError,
    clearErrors,
    reset,
    formState: { errors, isSubmitting },
  } = form
  const [list, setList] = useState<{
    items: Review[]
    total: number
    totalPages: number
  }>({ items: [], total: 0, totalPages: 0 })
  const [selected, setSelected] = useState<string | null>(null)
  const [detail, setDetail] = useState<Review | null>(null)
  const [page, setPage] = useState(1)
  const [version, setVersion] = useState(0)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')
  const lock = useRef(false)
  useEffect(() => {
    let active = true
    setLoading(true)
    api(`/admin/company-validations?page=${page}&pageSize=10`)
      .then((data) => {
        if (active) setList(data)
      })
      .catch((error) => {
        if (!active) return
        if (error instanceof ApiError && error.status === 401) expired()
        else
          setError('root.server', {
            message:
              error instanceof Error
                ? error.message
                : 'Falha ao listar solicitações.',
          })
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [page, version, expired, setError])
  useEffect(() => {
    let active = true
    setDetail(null)
    reset({ status: '', reason: '' })
    if (selected)
      api(`/admin/company-validations/${selected}`)
        .then((data) => {
          if (active) setDetail(data.review)
        })
        .catch((error) => {
          if (!active) return
          if (error instanceof ApiError && error.status === 401) expired()
          else
            setError('root.server', {
              message:
                error instanceof Error
                  ? error.message
                  : 'Falha ao carregar dados.',
            })
        })
    return () => {
      active = false
    }
  }, [selected, version, expired, reset, setError])
  async function decide(values: { status: string; reason: string }) {
    if (lock.current || !selected) return
    lock.current = true
    clearErrors()
    setNotice('')
    try {
      await api(`/admin/company-validations/${selected}/decision`, 'POST', {
        status: values.status,
        ...(values.status === 'REJECTED' ? { reason: values.reason } : {}),
      })
      setNotice(
        values.status === 'APPROVED'
          ? 'Empresa aprovada.'
          : 'Empresa rejeitada. O motivo está disponível para a empresa.',
      )
      setSelected(null)
      setPage(1)
      setVersion((v) => v + 1)
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) expired()
      setError('root.server', {
        message:
          error instanceof Error
            ? error.message
            : 'Falha ao registrar decisão.',
      })
      if (error instanceof ApiError && error.fields.reason)
        setError(
          'reason',
          { message: error.fields.reason },
          { shouldFocus: true },
        )
    } finally {
      lock.current = false
    }
  }
  return (
    <div className="space-y-6">
      <Card className="gap-4 p-6">
        <h2 className="text-2xl font-semibold">Análise de empresas</h2>
        <p>
          Confira o cadastro e consulte o CNPJ manualmente antes de decidir.
        </p>
        <Button
          variant="outline"
          disabled={isSubmitting}
          onClick={() => {
            clearErrors()
            setVersion((v) => v + 1)
          }}
        >
          Atualizar lista
        </Button>
      </Card>
      {notice && (
        <Alert role="status">
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      )}
      {errors.root?.server && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{errors.root.server.message}</AlertDescription>
        </Alert>
      )}
      {loading ? (
        <p role="status">Carregando solicitações…</p>
      ) : (
        <Card className="gap-4 p-6">
          <h3 className="text-xl font-semibold">
            Solicitações pendentes ({list.total})
          </h3>
          {list.items.length === 0 && (
            <p>Nenhuma solicitação pendente nesta página.</p>
          )}
          {list.items.map((review) => (
            <div
              key={review.id}
              className="flex flex-wrap items-center justify-between gap-3 border-b pb-4"
            >
              <div className="min-w-0 break-words">
                <strong>
                  {review.company.legalName ?? 'Empresa sem razão social'}
                </strong>
                <p>{formatBrazilianField('cnpj', review.company.cnpj ?? '')}</p>
              </div>
              <Button
                disabled={isSubmitting}
                onClick={() => {
                  clearErrors()
                  setSelected(review.id)
                }}
              >
                Analisar {review.company.legalName ?? 'empresa'}
              </Button>
            </div>
          ))}
          <Pagination
            page={page}
            totalPages={list.totalPages}
            loading={loading || isSubmitting}
            change={setPage}
          />
        </Card>
      )}
      {selected && (
        <Card className="gap-4 p-6">
          {!detail ? (
            <p role="status">Carregando cadastro…</p>
          ) : (
            <>
              <h3 className="text-xl font-semibold">Dados da empresa</h3>
              <dl className="grid min-w-0 gap-4 break-words sm:grid-cols-2">
                {[
                  ['Razão social', detail.company.legalName],
                  ['Nome fantasia', detail.company.tradeName],
                  [
                    'CNPJ',
                    formatBrazilianField('cnpj', detail.company.cnpj ?? ''),
                  ],
                  [
                    'Localização',
                    `${detail.company.city ?? ''} / ${detail.company.state ?? ''}`,
                  ],
                  ['Responsável', detail.company.contactName],
                  ['Cargo ou vínculo', detail.company.contactRole],
                  [
                    'Telefone',
                    formatBrazilianField('phone', detail.company.phone ?? ''),
                  ],
                  ['E-mail', detail.company.email],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-sm text-muted-foreground">{label}</dt>
                    <dd>{value || 'Não informado'}</dd>
                  </div>
                ))}
              </dl>
              <a
                className="text-sm underline underline-offset-4"
                href="https://www.gov.br/receitafederal/pt-br"
                target="_blank"
                rel="noreferrer"
              >
                Abrir site da Receita Federal
              </a>
              {detail.status !== 'PENDING' ? (
                <p>Esta solicitação já foi analisada. Atualize a lista.</p>
              ) : (
                <FormProvider {...form}>
                  <form
                    noValidate
                    onSubmit={form.handleSubmit(decide)}
                    aria-busy={isSubmitting}
                  >
                    <fieldset
                      disabled={isSubmitting}
                      className="min-w-0 space-y-4"
                    >
                      <legend className="sr-only">
                        Decisão administrativa
                      </legend>
                      <FormSelect
                        name="status"
                        label="Decisão"
                        options={[
                          { value: 'APPROVED', label: 'Aprovar' },
                          { value: 'REJECTED', label: 'Rejeitar' },
                        ]}
                      />
                      {status === 'REJECTED' && (
                        <FormInput
                          name="reason"
                          label="Justificativa da rejeição"
                          maxLength={2000}
                        />
                      )}
                      <p className="text-sm text-muted-foreground">
                        Confira os dados antes de confirmar. A decisão será
                        registrada com sua identificação e data.
                      </p>
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Registrando…' : 'Confirmar decisão'}
                      </Button>
                    </fieldset>
                  </form>
                </FormProvider>
              )}
            </>
          )}
        </Card>
      )}
    </div>
  )
}
