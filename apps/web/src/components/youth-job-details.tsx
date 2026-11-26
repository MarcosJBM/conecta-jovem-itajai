import { Link } from 'react-router';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { api, ApiError } from '../api';
import type { PublicJob } from '../lib/job';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { Card } from './ui/card';

const availabilityLabels = {
  OPEN: 'Aberta para candidaturas',
  CLOSED: 'Vaga encerrada',
  EXPIRED: 'Prazo de candidatura encerrado',
};

type JobDetails = {
  job: PublicJob;
  application: { id: string; submittedAt: string } | null;
};

export function YouthJobDetails({
  id,
  labels,
  expired,
  back,
}: {
  id: string;
  labels: ReadonlyMap<string, string>;
  expired: () => void;
  back: () => void;
}) {
  const [details, setDetails] = useState<JobDetails | null>(null);
  const {
    handleSubmit,
    setError: setFormError,
    formState: { errors, isSubmitting },
  } = useForm();
  const submitting = useRef(false);
  const job = details?.job;
  const application = details?.application;
  const [error, setError] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    heading.current?.focus();
  }, []);

  async function apply() {
    if (!details || submitting.current || details.application) return;
    submitting.current = true;
    try {
      const { application } = await api(`/jobs/${id}/applications`, 'POST');
      setDetails({ ...details, application });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) expired();
      else
        setFormError('root.server', {
          type:
            error instanceof ApiError && error.status === 400
              ? 'incomplete'
              : 'server',
          message:
            error instanceof Error
              ? error.message
              : 'Não foi possível enviar a candidatura.',
        });
    } finally {
      submitting.current = false;
    }
  }

  useEffect(() => {
    let active = true;
    api(`/jobs/${id}`)
      .then((details: JobDetails) => {
        if (active) setDetails(details);
      })
      .catch((error: unknown) => {
        if (!active) return;
        if (error instanceof ApiError && error.status === 401) expired();
        else
          setError(
            error instanceof Error
              ? error.message
              : 'Não foi possível carregar a vaga.',
          );
      });
    return () => {
      active = false;
    };
  }, [id, expired]);

  return (
    <section className="space-y-5" aria-labelledby="job-details-heading">
      <h2
        ref={heading}
        tabIndex={-1}
        id="job-details-heading"
        className="text-2xl font-bold"
      >
        {job?.title ?? 'Detalhes da vaga'}
      </h2>
      <Button
        type="button"
        variant="outline"
        onClick={back}
        disabled={isSubmitting}
      >
        Voltar às vagas
      </Button>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {!job && !error && <p role="status">Carregando vaga…</p>}
      {job && (
        <Card className="gap-4 p-5">
          <p className="font-medium">{availabilityLabels[job.availability]}</p>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="font-semibold">Empresa</dt>
              <dd>{job.companyName}</dd>
            </div>
            <div>
              <dt className="font-semibold">Local</dt>
              <dd>
                {job.city}/{job.state}
              </dd>
            </div>
            <div>
              <dt className="font-semibold">Área</dt>
              <dd>{labels.get(job.area)}</dd>
            </div>
            <div>
              <dt className="font-semibold">Tipo de contratação</dt>
              <dd>{labels.get(job.contract)}</dd>
            </div>
            <div>
              <dt className="font-semibold">Regime de trabalho</dt>
              <dd>{labels.get(job.regime)}</dd>
            </div>
            <div>
              <dt className="font-semibold">Prazo final</dt>
              <dd>
                <time dateTime={job.deadline}>
                  {job.deadline.split('-').reverse().join('/')}
                </time>
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="font-semibold">Descrição</dt>
              <dd className="whitespace-pre-wrap break-words">
                {job.description}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="font-semibold">Requisitos</dt>
              <dd className="whitespace-pre-wrap break-words">
                {job.requirements}
              </dd>
            </div>
          </dl>
          {application ? (
            <p role="status" className="font-semibold">
              Candidatura enviada.
            </p>
          ) : (
            job.availability === 'OPEN' && (
              <form
                onSubmit={handleSubmit(apply)}
                className="space-y-3 border-t pt-4"
              >
                <p className="text-sm text-muted-foreground">
                  Ao se candidatar, você envia uma cópia do currículo salvo no
                  seu perfil.
                </p>
                {errors.root?.server && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      <p>{errors.root.server.message}</p>
                      {errors.root.server.type === 'incomplete' && (
                        <Link className="underline" to="/perfil">
                          Ir para Meu currículo
                        </Link>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Enviando…' : 'Enviar candidatura'}
                </Button>
              </form>
            )
          )}
        </Card>
      )}
    </section>
  );
}
