import { useEffect, useState } from 'react';
import { api, ApiError } from '../api';
import { Pagination } from './pagination';
import { Alert, AlertDescription } from './ui/alert';
import { Card } from './ui/card';

const statusLabels = {
  RECEIVED: 'Recebida',
  IN_REVIEW: 'Em análise',
  APPROVED: 'Aprovada',
  REJECTED: 'Reprovada',
};
type Status = keyof typeof statusLabels;
type Change = {
  id: string;
  changedAt: string;
  previousStatus: Status;
  newStatus: Status;
};
type ApplicationsPage = {
  page: number;
  totalPages: number;
  items: {
    id: string;
    jobTitle: string;
    companyName: string;
    submittedAt: string;
    status: Status;
    statusHistory: Change[];
  }[];
  notifications: (Change & { jobTitle: string })[];
};
const dateFormat = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Sao_Paulo',
});

function EventTime({ value }: { value: string }) {
  return <time dateTime={value}>{dateFormat.format(new Date(value))}</time>;
}

export function YouthApplications({ expired }: { expired: () => void }) {
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<ApplicationsPage | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api(`/applications/me?page=${page}&pageSize=10`)
      .then((data: ApplicationsPage) => {
        if (active) setResult(data);
      })
      .catch((error: unknown) => {
        if (!active) return;
        if (error instanceof ApiError && error.status === 401) expired();
        else
          setError(
            error instanceof Error
              ? error.message
              : 'Não foi possível consultar as candidaturas.',
          );
      });
    return () => {
      active = false;
    };
  }, [expired, page]);

  return (
    <section className="space-y-5" aria-labelledby="applications-heading">
      <h1 id="applications-heading" className="text-2xl font-bold">
        Minhas candidaturas
      </h1>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : result ? (
        <>
          <Card className="gap-3 p-5">
            <h2 className="text-lg font-semibold">Notificações recentes</h2>
            {result.notifications.length ? (
              <ul className="space-y-3">
                {result.notifications.map((event) => (
                  <li key={event.id} className="min-w-0 break-words">
                    <p>
                      {event.jobTitle} · {statusLabels[event.newStatus]}
                    </p>
                    <span className="text-sm text-muted-foreground">
                      <EventTime value={event.changedAt} />
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>Nenhuma atualização de status até o momento.</p>
            )}
          </Card>
          {result.page !== page ? (
            <p role="status">Carregando candidaturas…</p>
          ) : (
            <>
              {!result.items.length && (
                <p>
                  {page === 1
                    ? 'Você ainda não enviou candidaturas.'
                    : 'Nenhuma candidatura nesta página.'}
                </p>
              )}
              {result.items.map((application) => (
                <Card key={application.id} className="gap-3 p-5 break-words">
                  <h2 className="text-lg font-semibold">
                    {application.jobTitle}
                  </h2>
                  <p>
                    {application.companyName} ·{' '}
                    {statusLabels[application.status]}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Enviada em <EventTime value={application.submittedAt} />
                  </p>
                  <details className="space-y-3">
                    <summary
                      className="cursor-pointer font-medium"
                      aria-label={`Histórico de status de ${application.jobTitle}`}
                    >
                      Histórico de status
                    </summary>
                    {application.statusHistory.length ? (
                      <ol className="space-y-2">
                        {application.statusHistory.map((event) => (
                          <li key={event.id}>
                            <p>
                              De {statusLabels[event.previousStatus]} para{' '}
                              {statusLabels[event.newStatus]}
                            </p>
                            <EventTime value={event.changedAt} />
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p>Nenhuma mudança de status.</p>
                    )}
                  </details>
                </Card>
              ))}
              {(page > 1 || result.totalPages > 1) && (
                <Pagination
                  page={page}
                  totalPages={result.totalPages}
                  loading={false}
                  change={setPage}
                />
              )}
            </>
          )}
        </>
      ) : (
        <p role="status">Carregando candidaturas…</p>
      )}
    </section>
  );
}
