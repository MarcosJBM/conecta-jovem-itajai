import { useEffect, useRef, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import type { Path } from 'react-hook-form';
import { api, ApiError } from '../api';
import { states } from '../lib/brazilian-data';
import { emptyJob, jobValues } from '../lib/job';
import type { Job, JobOptions, JobValues } from '../lib/job';
import { FormInput } from './form-input';
import { FormTextarea } from './form-textarea';
import { FormSelect } from './form-select';
import { CloseJobAction } from './close-job-action';
import { Pagination } from './pagination';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';

type Panel = { mode: 'new' | 'view' | 'edit'; id?: string };
export function JobsDashboard({ expired }: { expired: () => void }) {
  const form = useForm<JobValues>({ defaultValues: emptyJob });
  const {
    reset,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = form;
  const [list, setList] = useState<{
    items: Job[];
    total: number;
    totalPages: number;
  }>({ items: [], total: 0, totalPages: 0 });
  const [options, setOptions] = useState<JobOptions | null>(null);
  const [panel, setPanel] = useState<Panel | null>(null);
  const [detail, setDetail] = useState<Job | null>(null);
  const [page, setPage] = useState(1);
  const [version, setVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const lock = useRef(false);
  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      api(`/companies/me/jobs?page=${page}&pageSize=10`),
      api('/companies/me/jobs/options'),
    ])
      .then(([data, catalog]) => {
        if (active) {
          setList(data);
          setOptions({ ...catalog.options, today: catalog.today });
        }
      })
      .catch((error) => {
        if (!active) return;
        if (error instanceof ApiError && error.status === 401) expired();
        else
          setError('root.server', {
            message:
              error instanceof Error
                ? error.message
                : 'Falha ao carregar vagas.',
          });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [page, version, expired, setError]);
  useEffect(() => {
    let active = true;
    setDetail(null);
    if (panel?.mode === 'new') reset(emptyJob);
    else if (panel?.id)
      api(`/companies/me/jobs/${panel.id}`)
        .then((data) => {
          if (active) {
            setDetail(data.job);
            reset(jobValues(data.job));
          }
        })
        .catch((error) => {
          if (!active) return;
          if (error instanceof ApiError && error.status === 401) expired();
          else
            setError('root.server', {
              message:
                error instanceof Error
                  ? error.message
                  : 'Falha ao consultar vaga.',
            });
        });
    return () => {
      active = false;
    };
  }, [panel, reset, setError, expired]);
  async function save(values: JobValues) {
    if (lock.current || !panel) return;
    lock.current = true;
    clearErrors();
    setNotice('');
    try {
      await api(
        panel.mode === 'new'
          ? '/companies/me/jobs'
          : `/companies/me/jobs/${panel.id}`,
        panel.mode === 'new' ? 'POST' : 'PUT',
        values,
      );
      setNotice(
        panel.mode === 'new' ? 'Vaga criada e publicada.' : 'Vaga atualizada.',
      );
      setPanel(null);
      setPage(1);
      setVersion((v) => v + 1);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) expired();
      setError('root.server', {
        message:
          error instanceof Error ? error.message : 'Falha ao salvar vaga.',
      });
      if (error instanceof ApiError)
        for (const [name, message] of Object.entries(error.fields))
          if (name in emptyJob)
            setError(
              name as Path<JobValues>,
              { message },
              { shouldFocus: true },
            );
    } finally {
      lock.current = false;
    }
  }
  const label = (
    items: { value: string; label: string }[] | undefined,
    value: string,
  ) => items?.find((item) => item.value === value)?.label ?? value;
  const availability = {
    OPEN: 'Aberta',
    EXPIRED: 'Prazo encerrado',
    CLOSED: 'Encerrada',
  };
  return (
    <div className="space-y-6">
      <Card className="gap-4 p-6">
        <h2 className="text-2xl font-semibold">Minhas vagas</h2>
        <p>Preencha o formulário para publicar uma oportunidade formal.</p>
        <div className="flex flex-wrap gap-3">
          <Button
            disabled={!options || isSubmitting}
            onClick={() => {
              clearErrors();
              setNotice('');
              setPanel({ mode: 'new' });
            }}
          >
            Criar vaga
          </Button>
          <Button
            variant="outline"
            disabled={isSubmitting}
            onClick={() => {
              clearErrors();
              setVersion((v) => v + 1);
            }}
          >
            Atualizar vagas
          </Button>
        </div>
      </Card>
      {notice && (
        <Alert role="status">
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      )}
      {errors.root?.server && (
        <Alert role="alert" variant="destructive">
          <AlertDescription>{errors.root.server.message}</AlertDescription>
        </Alert>
      )}
      {loading ? (
        <p role="status">Carregando vagas…</p>
      ) : (
        <Card className="gap-4 p-6">
          <h3 className="text-xl font-semibold">
            Vagas da empresa ({list.total})
          </h3>
          {!list.items.length && <p>Nenhuma vaga nesta página.</p>}
          {list.items.map((job) => (
            <section
              key={job.id}
              aria-label={job.title}
              className="min-w-0 space-y-3 border-b pb-4 break-words"
            >
              <h4 className="font-semibold">{job.title}</h4>
              <p>
                {job.city} / {job.state} ·{' '}
                {label(options?.contracts, job.contract)} ·{' '}
                {label(options?.regimes, job.regime)}
              </p>
              <p>
                {availability[job.availability]} · Prazo:{' '}
                {job.deadline.split('-').reverse().join('/')}
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={() => {
                    clearErrors();
                    setPanel({ mode: 'view', id: job.id });
                  }}
                >
                  Ver detalhes
                </Button>
                {job.availability === 'OPEN' && (
                  <>
                    <Button
                      disabled={isSubmitting}
                      variant="outline"
                      onClick={() => {
                        clearErrors();
                        setPanel({ mode: 'edit', id: job.id });
                      }}
                    >
                      Editar vaga
                    </Button>
                    <CloseJobAction
                      id={job.id}
                      expired={expired}
                      completed={() => {
                        clearErrors();
                        setNotice('Vaga encerrada.');
                        setPanel(null);
                        setVersion((v) => v + 1);
                      }}
                    />
                  </>
                )}
              </div>
            </section>
          ))}
          <Pagination
            page={page}
            totalPages={list.totalPages}
            loading={loading}
            change={setPage}
          />
        </Card>
      )}
      {panel && options && (
        <Card className="gap-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-xl font-semibold">
              {panel.mode === 'new'
                ? 'Nova vaga'
                : panel.mode === 'edit'
                  ? 'Editar vaga'
                  : 'Detalhes da vaga'}
            </h3>
            <Button
              variant="outline"
              disabled={isSubmitting}
              onClick={() => setPanel(null)}
            >
              Fechar
            </Button>
          </div>
          {panel.mode !== 'new' && !detail ? (
            <p role="status">Carregando detalhes…</p>
          ) : panel.mode === 'view' && detail ? (
            <div className="space-y-4 break-words">
              <h4 className="font-semibold">{detail.title}</h4>
              <p>
                {availability[detail.availability]} · Prazo:{' '}
                {detail.deadline.split('-').reverse().join('/')}
              </p>
              <p>
                {detail.city} / {detail.state} ·{' '}
                {label(options.areas, detail.area)} ·{' '}
                {label(options.contracts, detail.contract)} ·{' '}
                {label(options.regimes, detail.regime)}
              </p>
              <h4 className="font-semibold">Descrição</h4>
              <p className="whitespace-pre-wrap">{detail.description}</p>
              <h4 className="font-semibold">Requisitos</h4>
              <p className="whitespace-pre-wrap">{detail.requirements}</p>
            </div>
          ) : panel.mode === 'edit' && detail?.availability !== 'OPEN' ? (
            <p>Esta vaga não está aberta para edição. Atualize a lista.</p>
          ) : (
            <FormProvider {...form}>
              <form
                noValidate
                onSubmit={form.handleSubmit(save)}
                aria-busy={isSubmitting}
              >
                <fieldset disabled={isSubmitting} className="min-w-0 space-y-5">
                  <legend className="sr-only">Dados da vaga</legend>
                  <FormInput
                    name="title"
                    label="Título da vaga"
                    maxLength={150}
                  />
                  <FormTextarea
                    name="description"
                    label="Descrição da vaga"
                    maxLength={5000}
                  />
                  <FormTextarea
                    name="requirements"
                    label="Requisitos"
                    maxLength={5000}
                  />
                  <div className="grid gap-5 sm:grid-cols-2">
                    <FormInput name="city" label="Cidade" maxLength={100} />
                    <FormSelect
                      name="state"
                      label="UF"
                      options={states.map((state) => ({
                        value: state.code,
                        label: `${state.code} — ${state.name}`,
                      }))}
                    />
                    <FormSelect
                      name="area"
                      label="Área profissional"
                      options={options.areas}
                    />
                    <FormSelect
                      name="contract"
                      label="Tipo de contratação"
                      options={options.contracts}
                    />
                    <FormSelect
                      name="regime"
                      label="Regime de trabalho"
                      options={options.regimes}
                    />
                    <FormInput
                      name="deadline"
                      label="Prazo de candidatura"
                      type="date"
                      minDate={options.today}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    A vaga será publicada ao salvar. O prazo vale até o fim do
                    dia informado, no horário de Brasília.
                  </p>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting
                      ? 'Salvando…'
                      : panel.mode === 'new'
                        ? 'Criar e publicar vaga'
                        : 'Salvar alterações'}
                  </Button>
                </fieldset>
              </form>
            </FormProvider>
          )}
        </Card>
      )}
    </div>
  );
}
