import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { api, ApiError } from '../api';
import type { JobOptions, PublicJobSummary } from '../lib/job';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { NativeSelect, NativeSelectOption } from './ui/native-select';
import { Pagination } from './pagination';
import { YouthJobDetails } from './youth-job-details';

const emptyFilters = {
  keyword: '',
  city: '',
  area: '',
  contract: '',
  regime: '',
};
type Filters = typeof emptyFilters;
type SearchResult = {
  items: PublicJobSummary[];
  options: Omit<JobOptions, 'today'>;
  total: number;
  totalPages: number;
};

export function YouthJobsSearch({ expired }: { expired: () => void }) {
  const {
    register,
    reset,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<Filters>({ defaultValues: emptyFilters });
  const [search, setSearch] = useState({ page: 1, filters: emptyFilters });
  const [result, setResult] = useState<SearchResult | null>(null);
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const detailsTrigger = useRef<HTMLButtonElement>(null);
  const [loadedSearch, setLoadedSearch] = useState<typeof search | null>(null);

  useEffect(() => {
    let active = true;
    clearErrors('root.server');
    const query = new URLSearchParams({
      page: String(search.page),
      pageSize: '10',
    });
    for (const [key, value] of Object.entries(search.filters)) {
      if (value?.trim()) query.set(key, value.trim());
    }
    api(`/jobs?${query}`)
      .then((data: SearchResult) => {
        if (active) setResult(data);
      })
      .catch((error: unknown) => {
        if (!active) return;
        if (error instanceof ApiError && error.status === 401) expired();
        else
          setError('root.server', {
            message:
              error instanceof Error
                ? error.message
                : 'Não foi possível carregar as vagas.',
          });
      })
      .finally(() => {
        if (active) setLoadedSearch(search);
      });
    return () => {
      active = false;
    };
  }, [clearErrors, expired, search, setError]);

  useEffect(() => {
    if (!selectedJob) detailsTrigger.current?.focus();
  }, [selectedJob]);

  const selectFields = [
    { name: 'area', label: 'Área', options: result?.options.areas },
    {
      name: 'contract',
      label: 'Tipo de contratação',
      options: result?.options.contracts,
    },
    {
      name: 'regime',
      label: 'Regime de trabalho',
      options: result?.options.regimes,
    },
  ] as const;
  const loading = loadedSearch !== search;
  const labels = new Map(
    selectFields.flatMap(({ options }) =>
      (options ?? []).map(({ value, label }) => [value, label] as const),
    ),
  );

  return (
    <>
      {selectedJob && (
        <YouthJobDetails
          key={selectedJob}
          id={selectedJob}
          labels={labels}
          expired={expired}
          back={() => setSelectedJob(null)}
        />
      )}
      <section
        hidden={Boolean(selectedJob)}
        className="mt-10 space-y-5"
        aria-labelledby="jobs-heading"
      >
        <h2 id="jobs-heading" className="text-2xl font-bold">
          Vagas abertas
        </h2>
        <Card className="p-5">
          <form
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={handleSubmit((filters) =>
              setSearch({ page: 1, filters }),
            )}
          >
            <div className="space-y-2">
              <Label htmlFor="jobs-keyword">Palavra-chave</Label>
              <Input
                id="jobs-keyword"
                type="search"
                maxLength={100}
                {...register('keyword')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="jobs-city">Cidade</Label>
              <Input id="jobs-city" maxLength={100} {...register('city')} />
            </div>
            {selectFields.map(({ name, label, options }) => (
              <div key={name} className="space-y-2">
                <Label htmlFor={`jobs-${name}`}>{label}</Label>
                <NativeSelect
                  id={`jobs-${name}`}
                  disabled={!options}
                  {...register(name)}
                >
                  <NativeSelectOption value="">Todos</NativeSelectOption>
                  {options?.map((option) => (
                    <NativeSelectOption key={option.value} value={option.value}>
                      {option.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
            ))}
            <div className="flex flex-wrap gap-2 self-end">
              <Button type="submit">Buscar vagas</Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  reset();
                  setSearch({ page: 1, filters: emptyFilters });
                }}
              >
                Limpar filtros
              </Button>
            </div>
          </form>
        </Card>
        {loading && <p role="status">Buscando vagas…</p>}
        {!loading && errors.root?.server && (
          <Alert variant="destructive">
            <AlertDescription>{errors.root.server.message}</AlertDescription>
          </Alert>
        )}
        {!loading && !errors.root?.server && result && (
          <>
            <p role="status" className="text-sm text-muted-foreground">
              {result.total === 1
                ? '1 vaga encontrada'
                : `${result.total} vagas encontradas`}
            </p>
            {result.items.map((job) => (
              <Card key={job.id} className="space-y-2 p-5">
                <h3 className="text-lg font-semibold">{job.title}</h3>
                <p>
                  {job.companyName} · {job.city}/{job.state}
                </p>
                <p>
                  {[job.area, job.contract, job.regime]
                    .map((value) => labels.get(value))
                    .join(' · ')}
                </p>
                <p className="text-sm text-muted-foreground">
                  Prazo até{' '}
                  <time dateTime={job.deadline}>
                    {job.deadline.split('-').reverse().join('/')}
                  </time>
                </p>
                <p className="line-clamp-3">{job.description}</p>
                <Button
                  type="button"
                  variant="outline"
                  className="self-start"
                  aria-label={`Ver detalhes de ${job.title}`}
                  onClick={(event) => {
                    detailsTrigger.current = event.currentTarget;
                    setSelectedJob(job.id);
                  }}
                >
                  Ver detalhes
                </Button>
              </Card>
            ))}
            {(result.totalPages > 1 || search.page > 1) && (
              <Pagination
                page={search.page}
                totalPages={Math.max(search.page, result.totalPages)}
                loading={loading}
                change={(page) => setSearch({ ...search, page })}
              />
            )}
          </>
        )}
      </section>
    </>
  );
}
