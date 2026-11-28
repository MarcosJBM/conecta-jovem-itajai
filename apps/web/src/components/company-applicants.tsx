import { useEffect, useState } from 'react';
import { api, ApiError } from '../api';
import type { ResumeResult } from '../lib/resume';
import {
  ApplicationStatusForm,
  type ApplicationStatusInfo,
} from './application-status-form';
import { Pagination } from './pagination';
import { ResumePreview } from './resume-preview';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { Card } from './ui/card';

type Candidate = { id: string; candidateName: string; submittedAt: string };
type CandidatePage = { items: Candidate[]; totalPages: number };
type Application = ApplicationStatusInfo & {
  id: string;
  submittedAt: string;
  resumeSnapshot: ResumeResult['resume'];
};

const dateFormat = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
});

export function CompanyApplicants({
  job,
  expired,
  back,
}: {
  job: { id: string; title: string };
  expired: () => void;
  back: () => void;
}) {
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const [list, setList] = useState<CandidatePage | null>(null);
  const [detail, setDetail] = useState<Application | null>(null);
  const [error, setError] = useState('');
  const path = `/companies/me/jobs/${job.id}/applications`;

  useEffect(() => {
    let active = true;
    const url = selected
      ? `${path}/${selected}`
      : `${path}?page=${page}&pageSize=10`;
    api(url)
      .then((data) => {
        if (!active) return;
        if (selected) setDetail(data.application);
        else setList(data);
      })
      .catch((error: unknown) => {
        if (!active) return;
        if (error instanceof ApiError && error.status === 401) expired();
        else
          setError(
            error instanceof Error
              ? error.message
              : 'Não foi possível consultar candidaturas.',
          );
      });
    return () => {
      active = false;
    };
  }, [expired, page, path, selected]);

  return (
    <section aria-labelledby="company-applicants-heading" className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          id="company-applicants-heading"
          className="min-w-0 text-xl font-semibold wrap-anywhere"
        >
          Candidaturas para {job.title}
        </h2>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            if (!selected) {
              back();
              return;
            }
            setSelected(null);
            setDetail(null);
            setError('');
          }}
        >
          {selected ? 'Voltar às candidaturas' : 'Voltar às vagas'}
        </Button>
      </div>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : selected ? (
        detail ? (
          <>
            <p>
              Enviada em{' '}
              <time dateTime={detail.submittedAt}>
                {dateFormat.format(new Date(detail.submittedAt))}
              </time>
            </p>
            <ApplicationStatusForm
              path={`${path}/${detail.id}/status`}
              current={detail}
              expired={expired}
              updated={(status) =>
                setDetail((current) =>
                  current?.id === detail.id
                    ? { ...current, ...status }
                    : current,
                )
              }
            />
            <ResumePreview
              title="Currículo enviado"
              resume={detail.resumeSnapshot}
            />
          </>
        ) : (
          <p role="status">Carregando currículo…</p>
        )
      ) : list ? (
        <Card className="gap-4 p-5">
          {list.items.length === 0 && (
            <p>
              {page === 1
                ? 'Esta vaga ainda não recebeu candidaturas.'
                : 'Nenhuma candidatura nesta página.'}
            </p>
          )}
          {list.items.map((candidate) => (
            <div
              key={candidate.id}
              className="flex flex-wrap items-center justify-between gap-3 border-b pb-3"
            >
              <div>
                <p className="font-semibold break-words">
                  {candidate.candidateName}
                </p>
                <time dateTime={candidate.submittedAt}>
                  {dateFormat.format(new Date(candidate.submittedAt))}
                </time>
              </div>
              <Button
                type="button"
                variant="outline"
                aria-label={`Ver currículo de ${candidate.candidateName}`}
                onClick={() => setSelected(candidate.id)}
              >
                Ver currículo
              </Button>
            </div>
          ))}
          {(list.totalPages > 1 || page > 1) && (
            <Pagination
              page={page}
              totalPages={list.totalPages}
              loading={false}
              change={(nextPage) => {
                setList(null);
                setPage(nextPage);
              }}
            />
          )}
        </Card>
      ) : (
        <p role="status">Carregando candidaturas…</p>
      )}
    </section>
  );
}
