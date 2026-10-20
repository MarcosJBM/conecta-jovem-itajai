import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useEffect, useState } from 'react'
import { api, ApiError } from '../api'
import { DataForm } from './data-form'
import { companyFields } from '../forms'

type Company = {
  id: string
  validation: {
    status: 'PENDING' | 'APPROVED' | 'REJECTED'
    rejectionReason: string | null
  } | null
} & Record<string, unknown>
export function CompanyDashboard({ expired }: { expired: () => void }) {
  const [company, setCompany] = useState<Company | null>(null)
  const [message, setMessage] = useState('')
  const [version, setVersion] = useState(0)
  useEffect(() => {
    let active = true
    api('/companies/me')
      .then((data) => {
        if (active) {
          setCompany(data.company)
          setMessage('')
        }
      })
      .catch((error) => {
        if (!active) return
        if (error instanceof ApiError && error.status === 401) expired()
        else
          setMessage(
            error instanceof Error
              ? error.message
              : 'Falha ao consultar o cadastro.',
          )
      })
    return () => {
      active = false
    }
  }, [version, expired])
  if (!company)
    return (
      <Card className="p-6" role="status">
        <p>{message || 'Consultando cadastro…'}</p>
        {message && (
          <Button onClick={() => setVersion(version + 1)}>
            Tentar novamente
          </Button>
        )}
      </Card>
    )
  const status = company.validation?.status
  return (
    <>
      <Card className="mb-6 gap-4 p-6 leading-7">
        <p className="text-xs font-bold tracking-[2px] text-primary">
          SITUAÇÃO DO CADASTRO
        </p>
        <h2>
          {status === 'APPROVED'
            ? 'Cadastro aprovado'
            : status === 'REJECTED'
              ? 'Cadastro rejeitado'
              : status === 'PENDING'
                ? 'Aguardando validação'
                : 'Cadastro incompleto'}
        </h2>
        {status === 'PENDING' && (
          <p>
            Seu cadastro está em análise pelo administrador. Aguarde a
            validação.
          </p>
        )}
        {status === 'APPROVED' && (
          <p>
            Sua empresa foi aprovada. As demais funcionalidades estarão
            disponíveis em uma próxima etapa.
          </p>
        )}
        {status === 'REJECTED' && (
          <>
            <p>
              Confira o motivo, corrija os dados abaixo e solicite uma nova
              análise.
            </p>
            <Alert variant="destructive">
              <AlertDescription>
                {company.validation?.rejectionReason}
              </AlertDescription>
            </Alert>
          </>
        )}
        {!status && (
          <p>
            Não foi encontrada uma solicitação de validação para esta conta.
            Entre em contato com a equipe.
          </p>
        )}
        {message && (
          <Alert variant="destructive">
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}
        <Button variant="outline" onClick={() => setVersion(version + 1)}>
          Atualizar situação
        </Button>
      </Card>
      {status === 'REJECTED' && (
        <DataForm
          key={version}
          title="Corrigir cadastro"
          fields={companyFields}
          action="Salvar e solicitar nova análise"
          initial={Object.fromEntries(
            companyFields.map((field) => [
              field.name,
              String(company[field.name] ?? ''),
            ]),
          )}
          onSubmit={async (data) => {
            try {
              const result = await api('/companies/me/resubmit', 'POST', data)
              setCompany(result.company)
            } catch (error) {
              if (error instanceof ApiError && error.status === 401) expired()
              throw error
            }
          }}
        />
      )}
    </>
  )
}
