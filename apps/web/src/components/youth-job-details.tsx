import { useEffect, useRef, useState } from 'react';
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
  const [job, setJob] = useState<PublicJob | null>(null);
  const [error, setError] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    heading.current?.focus();
  }, []);

  useEffect(() => {
    let active = true;
    api(`/jobs/${id}`)
      .then(({ job }: { job: PublicJob }) => {
        if (active) setJob(job);
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
    <section className="mt-10 space-y-5" aria-labelledby="job-details-heading">
      <h2
        ref={heading}
        tabIndex={-1}
        id="job-details-heading"
        className="text-2xl font-bold"
      >
        {job?.title ?? 'Detalhes da vaga'}
      </h2>
      <Button type="button" variant="outline" onClick={back}>
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
        </Card>
      )}
    </section>
  );
}
