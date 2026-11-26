import {
  Link,
  useLocation,
  useMatch,
  useNavigate,
  useSearchParams,
} from 'react-router';
import { useEffect, useMemo, useRef, useState } from 'react';
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
const filterNames = Object.keys(emptyFilters) as (keyof Filters)[];

function readFilters(params: URLSearchParams): Filters {
  const filters = { ...emptyFilters };
  for (const name of filterNames) filters[name] = params.get(name) ?? '';
  return filters;
}

function searchQuery(page: number, filters: Filters) {
  const params = new URLSearchParams();
  if (page > 1) params.set('page', String(page));
  for (const name of filterNames) {
    const value = filters[name]?.trim();
    if (value) params.set(name, value);
  }
  return params;
}
type SearchResult = {
  items: PublicJobSummary[];
  options: Omit<JobOptions, 'today'>;
  total: number;
  totalPages: number;
};

export function YouthJobsSearch({ expired }: { expired: () => void }) {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const selectedJob = useMatch('/vagas/:jobId')?.params.jobId;
  const filters = useMemo(() => readFilters(params), [params]);
  const inputPage = Number(params.get('page'));
  const page = Number.isSafeInteger(inputPage) && inputPage > 0 ? inputPage : 1;
  const query = new URLSearchParams({ page: String(page), pageSize: '10' });
  searchQuery(1, filters).forEach((value, name) => query.set(name, value));
  const requestUrl = `/jobs?${query}`;

  const {
    register,
    reset,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<Filters>({ defaultValues: filters });
  const [result, setResult] = useState<SearchResult | null>(null);
  const detailsTrigger = useRef<HTMLAnchorElement>(null);
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  function updateSearch(next: URLSearchParams) {
    if (next.toString() === params.toString()) {
      setLoadedUrl(null);
      setRetry((count) => count + 1);
    } else {
      setParams(next);
    }
  }

  useEffect(() => {
    reset(filters);
  }, [filters, reset]);

  useEffect(() => {
    let active = true;
    clearErrors('root.server');
    api(requestUrl)
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
        if (active) setLoadedUrl(requestUrl);
      });
    return () => {
      active = false;
    };
  }, [clearErrors, expired, requestUrl, retry, setError]);

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
  const loading = loadedUrl !== requestUrl;
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
          back={() => {
            if (location.state?.fromSearch) void navigate(-1);
            else
              void navigate(
                { pathname: '/vagas', search: location.search },
                { replace: true },
              );
          }}
        />
      )}
      <section
        hidden={Boolean(selectedJob)}
        className="space-y-5"
        aria-labelledby="jobs-heading"
      >
        <h2 id="jobs-heading" className="text-2xl font-bold">
          Vagas abertas
        </h2>
        <Card className="p-5">
          <form
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={handleSubmit((filters) =>
              updateSearch(searchQuery(1, filters)),
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
                  reset(emptyFilters);
                  updateSearch(new URLSearchParams());
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
                <Button asChild variant="outline" className="self-start">
                  <Link
                    to={{
                      pathname: `/vagas/${job.id}`,
                      search: location.search,
                    }}
                    state={{ fromSearch: true }}
                    aria-label={`Ver detalhes de ${job.title}`}
                    onClick={(event) => {
                      detailsTrigger.current = event.currentTarget;
                    }}
                  >
                    Ver detalhes
                  </Link>
                </Button>
              </Card>
            ))}
            {(result.totalPages > 1 || page > 1) && (
              <Pagination
                page={page}
                totalPages={Math.max(page, result.totalPages)}
                loading={loading}
                change={(nextPage) => setParams(searchQuery(nextPage, filters))}
              />
            )}
          </>
        )}
      </section>
    </>
  );
}
