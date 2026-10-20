import { useCallback, useEffect, useState } from 'react'
import { api, ApiError } from './api'
import type { AuthUser } from './api'
import { DataForm } from './components/data-form'
import { CompanyDashboard } from './components/company-dashboard'
import { credentials, companyFields, youthFields } from './forms'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

function App() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessionError, setSessionError] = useState('')
  const [page, setPage] = useState(window.location.hash.slice(1) || '/login')
  const [notice, setNotice] = useState('')
  const [loggingOut, setLoggingOut] = useState(false)
  const [retry, setRetry] = useState(0)
  function navigate(path: string) {
    window.location.hash = path
    setPage(path)
  }
  const expired = useCallback(() => {
    setUser(null)
    setNotice('Sua sessão expirou. Entre novamente.')
    window.location.hash = '/login'
    setPage('/login')
  }, [])
  useEffect(() => {
    const update = () => setPage(window.location.hash.slice(1) || '/login')
    window.addEventListener('hashchange', update)
    return () => window.removeEventListener('hashchange', update)
  }, [])
  useEffect(() => {
    let active = true
    api('/auth/me')
      .then((data) => {
        if (active) {
          setUser(data.user)
          setSessionError('')
        }
      })
      .catch((error) => {
        if (!active) return
        if (error instanceof ApiError && error.status === 401) {
          setUser(null)
          setSessionError('')
        } else
          setSessionError(
            'Não foi possível verificar sua sessão. Confira sua conexão.',
          )
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [retry])
  async function registerCompany(data: Record<string, string>) {
    await api('/companies', 'POST', data)
    setNotice(
      'Conta criada! O cadastro da empresa está em validação. Entre para acompanhar a situação.',
    )
    navigate('/login')
  }
  async function registerYouth(data: Record<string, string>) {
    const { email, password, acceptedTerms, ...profile } = data
    try {
      await api('/users', 'POST', {
        email,
        password,
        role: 'YOUTH',
        acceptedTerms: acceptedTerms === 'on',
        youthProfile: profile,
      })
    } catch (error) {
      if (error instanceof ApiError)
        error.fields = Object.fromEntries(
          Object.entries(error.fields).map(([key, value]) => [
            key.replace(/^youthProfile\./, ''),
            value,
          ]),
        )
      throw error
    }
    setNotice('Conta criada com sucesso. Entre para acessar a plataforma.')
    navigate('/login')
  }
  async function logout() {
    setLoggingOut(true)
    try {
      await api('/auth/logout', 'POST')
      setUser(null)
      setNotice('Você saiu da sua conta.')
      navigate('/login')
    } catch {
      setNotice('Não foi possível sair. Tente novamente.')
    } finally {
      setLoggingOut(false)
    }
  }
  return (
    <main className="mx-auto max-w-[920px] px-6 py-9">
      <a
        className="inline-block text-2xl font-bold tracking-tight [&_span]:text-primary [&_small]:ml-2 [&_small]:text-[10px] [&_small]:tracking-[2px]"
        href={user ? '#/inicio' : '#/login'}
      >
        conecta<span>jovem</span> <small>ITAJAÍ</small>
      </a>
      <header className="max-w-[650px] pt-9 pb-7 sm:pt-14 [&_h1]:my-4 [&_h1]:text-3xl [&_h1]:leading-tight [&_h1]:font-bold [&_h1]:tracking-tight sm:[&_h1]:text-5xl [&_p:last-child]:max-w-[550px] [&_p:last-child]:leading-7 [&_p:last-child]:text-muted-foreground">
        <p className="text-xs font-bold tracking-[2px] text-primary">
          CONECTA JOVEM ITAJAÍ
        </p>
        <h1>
          {user ? 'Bem-vindo à plataforma.' : 'Seu próximo passo começa aqui.'}
        </h1>
        <p>Conectando jovens e empresas a novas oportunidades.</p>
      </header>
      {notice && (
        <Alert role="status" className="mb-6 bg-secondary">
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      )}
      {loading ? (
        <Card className="p-6" role="status">
          Verificando sessão…
        </Card>
      ) : sessionError ? (
        <Card className="p-6" role="alert">
          <p>{sessionError}</p>
          <Button
            onClick={() => {
              setLoading(true)
              setRetry(retry + 1)
            }}
          >
            Tentar novamente
          </Button>
        </Card>
      ) : user ? (
        <>
          <nav
            className="mb-6 flex items-start justify-between gap-4 sm:items-center [&_p]:mt-1 [&_p]:break-all"
            aria-label="Conta"
          >
            <div>
              <strong>
                {user.role === 'ADMIN'
                  ? 'Administrador'
                  : user.role === 'COMPANY'
                    ? 'Empresa'
                    : 'Jovem'}
              </strong>
              <p>{user.email}</p>
            </div>
            <Button
              variant="outline"
              className="h-11"
              disabled={loggingOut}
              onClick={logout}
            >
              {loggingOut ? 'Saindo…' : 'Sair'}
            </Button>
          </nav>
          {user.role === 'COMPANY' ? (
            <CompanyDashboard expired={expired} />
          ) : (
            <Card className="p-6">
              <h2>
                {user.role === 'ADMIN'
                  ? 'Área do administrador'
                  : 'Sua conta está pronta'}
              </h2>
              <p>
                {user.role === 'ADMIN'
                  ? 'Você está conectado como administrador. As ferramentas de gestão serão disponibilizadas em uma próxima etapa.'
                  : 'Você está conectado. A listagem de vagas estará disponível em uma próxima etapa.'}
              </p>
            </Card>
          )}
        </>
      ) : page === '/cadastro' ? (
        <Card className="p-6">
          <h2>Como você quer participar?</h2>
          <div className="my-7 grid grid-cols-1 gap-5 sm:grid-cols-2 [&_a]:rounded-xl [&_a]:border [&_a]:p-6 [&_a]:text-xl [&_a]:font-bold [&_a]:transition-colors [&_a:hover]:bg-accent [&_span]:mt-3 [&_span]:block [&_span]:text-sm [&_span]:font-normal">
            <a href="#/cadastro/jovem">
              Sou jovem <span>Encontre novas oportunidades →</span>
            </a>
            <a href="#/cadastro/empresa">
              Sou empresa <span>Conecte-se a novos talentos →</span>
            </a>
          </div>
          <p>
            Já tem conta? <a href="#/login">Entrar</a>
          </p>
        </Card>
      ) : page === '/cadastro/jovem' ? (
        <>
          <DataForm
            key="youth"
            title="Cadastro do jovem"
            fields={[...youthFields, ...credentials]}
            terms
            action="Criar conta"
            onSubmit={registerYouth}
          />
          <p className="p-3 text-center [&_a]:underline [&_a]:underline-offset-4">
            <a href="#/cadastro">Voltar à escolha do tipo de conta</a>
          </p>
        </>
      ) : page === '/cadastro/empresa' ? (
        <>
          <DataForm
            key="company"
            title="Cadastro da empresa"
            fields={[...companyFields, ...credentials]}
            action="Criar conta da empresa"
            onSubmit={registerCompany}
          />
          <p className="p-3 text-center [&_a]:underline [&_a]:underline-offset-4">
            <a href="#/cadastro">Voltar à escolha do tipo de conta</a>
          </p>
        </>
      ) : (
        <>
          <DataForm
            key="login"
            title="Entrar na plataforma"
            fields={credentials}
            login
            action="Entrar"
            onSubmit={async (data) => {
              const result = await api('/auth/login', 'POST', data)
              setUser(result.user)
              setNotice('')
              navigate('/inicio')
            }}
          />
          <p className="p-3 text-center [&_a]:underline [&_a]:underline-offset-4">
            Ainda não tem conta? <a href="#/cadastro">Criar conta</a>
          </p>
        </>
      )}
      <footer className="pt-8 pb-2 text-center text-xs text-muted-foreground">
        Conecta Jovem Itajaí · Aproximando empresas e oportunidades
      </footer>
    </main>
  )
}
export default App
