import { YouthApplications } from './components/youth-applications';
import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, Route, Routes, useNavigate } from 'react-router';
import { YouthLayout } from './components/youth-layout';
import { api, ApiError } from './api';
import type { AuthUser } from './api';
import { DataForm } from './components/data-form';
import { CompanyDashboard } from './components/company-dashboard';
import { ResumeDashboard } from './components/resume-dashboard';
import { YouthJobsSearch } from './components/youth-jobs-search';
import { AdminDashboard } from './components/admin-dashboard';
import { credentials, companyFields, youthFields } from './forms';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState('');
  const navigate = useNavigate();
  const [notice, setNotice] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);
  const [retry, setRetry] = useState(0);
  const expired = useCallback(() => {
    setUser(null);
    setNotice('Sua sessão expirou. Entre novamente.');
  }, []);
  useEffect(() => {
    let active = true;
    api('/auth/me')
      .then((data) => {
        if (active) {
          setUser(data.user);
          setSessionError('');
        }
      })
      .catch((error) => {
        if (!active) return;
        if (error instanceof ApiError && error.status === 401) {
          setUser(null);
          setSessionError('');
        } else
          setSessionError(
            'Não foi possível verificar sua sessão. Confira sua conexão.',
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [retry]);
  async function registerCompany(data: Record<string, string>) {
    await api('/companies', 'POST', data);
    setNotice(
      'Conta criada! O cadastro da empresa está em validação. Entre para acompanhar a situação.',
    );
    navigate('/login');
  }
  async function registerYouth(data: Record<string, string>) {
    const { email, password, acceptedTerms, ...profile } = data;
    try {
      await api('/users', 'POST', {
        email,
        password,
        role: 'YOUTH',
        acceptedTerms: acceptedTerms === 'on',
        youthProfile: profile,
      });
    } catch (error) {
      if (error instanceof ApiError)
        error.fields = Object.fromEntries(
          Object.entries(error.fields).map(([key, value]) => [
            key.replace(/^youthProfile\./, ''),
            value,
          ]),
        );
      throw error;
    }
    setNotice('Conta criada com sucesso. Entre para acessar a plataforma.');
    navigate('/login');
  }
  async function logout() {
    setLoggingOut(true);
    try {
      await api('/auth/logout', 'POST');
      setUser(null);
      setNotice('Você saiu da sua conta.');
      navigate('/login', { replace: true });
    } catch {
      setNotice('Não foi possível sair. Tente novamente.');
    } finally {
      setLoggingOut(false);
    }
  }
  const noticeBanner = notice && (
    <Alert role="status" className="mb-6 bg-secondary">
      <AlertDescription>{notice}</AlertDescription>
    </Alert>
  );

  if (!loading && !sessionError && user?.role === 'YOUTH') {
    return (
      <Routes>
        <Route
          element={
            <YouthLayout
              email={user.email}
              logout={logout}
              loggingOut={loggingOut}
              notice={noticeBanner}
            />
          }
        >
          <Route
            path="/perfil"
            element={<ResumeDashboard expired={expired} />}
          />
          <Route
            path="/candidaturas"
            element={<YouthApplications expired={expired} />}
          />
          <Route path="/vagas" element={<YouthJobsSearch expired={expired} />}>
            <Route path=":jobId" element={null} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/perfil" replace />} />
      </Routes>
    );
  }

  return (
    <main className="mx-auto max-w-[920px] px-6 py-9">
      <Link
        className="inline-block text-2xl font-bold tracking-tight [&_span]:text-primary [&_small]:ml-2 [&_small]:text-[10px] [&_small]:tracking-[2px]"
        to={user ? '/inicio' : '/login'}
      >
        conecta<span>jovem</span> <small>ITAJAÍ</small>
      </Link>
      <header className="max-w-[650px] pt-9 pb-7 sm:pt-14 [&_h1]:my-4 [&_h1]:text-3xl [&_h1]:leading-tight [&_h1]:font-bold [&_h1]:tracking-tight sm:[&_h1]:text-5xl [&_p:last-child]:max-w-[550px] [&_p:last-child]:leading-7 [&_p:last-child]:text-muted-foreground">
        <p className="text-xs font-bold tracking-[2px] text-primary">
          CONECTA JOVEM ITAJAÍ
        </p>
        <h1>
          {user ? 'Bem-vindo à plataforma.' : 'Seu próximo passo começa aqui.'}
        </h1>
        <p>Conectando jovens e empresas a novas oportunidades.</p>
      </header>
      {noticeBanner}
      {loading ? (
        <Card className="p-6" role="status">
          Verificando sessão…
        </Card>
      ) : sessionError ? (
        <Card className="p-6" role="alert">
          <p>{sessionError}</p>
          <Button
            onClick={() => {
              setLoading(true);
              setRetry(retry + 1);
            }}
          >
            Tentar novamente
          </Button>
        </Card>
      ) : user ? (
        <>
          <Routes>
            <Route path="/inicio" element={null} />
            <Route path="*" element={<Navigate to="/inicio" replace />} />
          </Routes>
          <nav
            className="mb-6 flex items-start justify-between gap-4 sm:items-center [&_p]:mt-1 [&_p]:break-all"
            aria-label="Conta"
          >
            <div>
              <strong>
                {user.role === 'ADMIN' ? 'Administrador' : 'Empresa'}
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
            <AdminDashboard expired={expired} />
          )}
        </>
      ) : (
        <Routes>
          <Route
            path="/cadastro"
            element={
              <Card className="p-6">
                <h2>Como você quer participar?</h2>
                <div className="my-7 grid grid-cols-1 gap-5 sm:grid-cols-2 [&_a]:rounded-xl [&_a]:border [&_a]:p-6 [&_a]:text-xl [&_a]:font-bold [&_a]:transition-colors [&_a:hover]:bg-accent [&_span]:mt-3 [&_span]:block [&_span]:text-sm [&_span]:font-normal">
                  <Link to="/cadastro/jovem">
                    Sou jovem <span>Encontre novas oportunidades →</span>
                  </Link>
                  <Link to="/cadastro/empresa">
                    Sou empresa <span>Conecte-se a novos talentos →</span>
                  </Link>
                </div>
                <p>
                  Já tem conta? <Link to="/login">Entrar</Link>
                </p>
              </Card>
            }
          />
          <Route
            path="/cadastro/jovem"
            element={
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
                  <Link to="/cadastro">Voltar à escolha do tipo de conta</Link>
                </p>
              </>
            }
          />
          <Route
            path="/cadastro/empresa"
            element={
              <>
                <DataForm
                  key="company"
                  title="Cadastro da empresa"
                  fields={[...companyFields, ...credentials]}
                  action="Criar conta da empresa"
                  onSubmit={registerCompany}
                />
                <p className="p-3 text-center [&_a]:underline [&_a]:underline-offset-4">
                  <Link to="/cadastro">Voltar à escolha do tipo de conta</Link>
                </p>
              </>
            }
          />
          <Route
            path="/login"
            element={
              <>
                <DataForm
                  key="login"
                  title="Entrar na plataforma"
                  fields={credentials}
                  login
                  action="Entrar"
                  onSubmit={async (data) => {
                    const result = await api('/auth/login', 'POST', data);
                    setUser(result.user);
                    setNotice('');
                    navigate(
                      result.user.role === 'YOUTH' ? '/perfil' : '/inicio',
                      { replace: true },
                    );
                  }}
                />
                <p className="p-3 text-center [&_a]:underline [&_a]:underline-offset-4">
                  Ainda não tem conta? <Link to="/cadastro">Criar conta</Link>
                </p>
              </>
            }
          />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      )}

      <footer className="pt-8 pb-2 text-center text-xs text-muted-foreground">
        Conecta Jovem Itajaí · Aproximando empresas e oportunidades
      </footer>
    </main>
  );
}
export default App;
