export type JobValues = {
  title: string;
  description: string;
  requirements: string;
  city: string;
  state: string;
  area: string;
  contract: string;
  regime: string;
  deadline: string;
};
export type Job = JobValues & {
  id: string;
  status: 'OPEN' | 'CLOSED';
  availability: 'OPEN' | 'EXPIRED' | 'CLOSED';
};
export type JobOptions = {
  contracts: { value: string; label: string }[];
  regimes: { value: string; label: string }[];
  areas: { value: string; label: string }[];
  today: string;
};
export const emptyJob: JobValues = {
  title: '',
  description: '',
  requirements: '',
  city: '',
  state: '',
  area: '',
  contract: '',
  regime: '',
  deadline: '',
};
export function jobValues(job: Job): JobValues {
  return Object.fromEntries(
    Object.keys(emptyJob).map((key) => [key, job[key as keyof JobValues]]),
  ) as JobValues;
}
