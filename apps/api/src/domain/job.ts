export const jobContracts = [
  'APPRENTICESHIP',
  'INTERNSHIP',
  'FORMAL_EMPLOYMENT',
] as const;
export const workRegimes = ['ONSITE', 'HYBRID', 'REMOTE'] as const;
export const jobAreas = [
  'ADMINISTRATION',
  'SALES',
  'TECHNOLOGY',
  'LOGISTICS',
  'INDUSTRY',
  'HEALTH',
  'EDUCATION',
  'OTHER',
] as const;
export interface JobData {
  title: string;
  description: string;
  requirements: string;
  city: string;
  state: string;
  area: (typeof jobAreas)[number];
  contract: (typeof jobContracts)[number];
  regime: (typeof workRegimes)[number];
  deadline: Date;
}
export interface Job extends JobData {
  id: string;
  companyId: string;
  status: 'OPEN' | 'CLOSED';
  createdAt: Date;
  updatedAt: Date;
}
export const jobOptions = {
  contracts: jobContracts.map((value, index) => ({
    value,
    label: ['Aprendizagem', 'Estágio', 'Emprego formal'][index]!,
  })),
  regimes: workRegimes.map((value, index) => ({
    value,
    label: ['Presencial', 'Híbrido', 'Remoto'][index]!,
  })),
  areas: jobAreas.map((value, index) => ({
    value,
    label: [
      'Administração',
      'Atendimento e vendas',
      'Tecnologia',
      'Logística',
      'Indústria',
      'Saúde',
      'Educação',
      'Outros',
    ][index]!,
  })),
};
export function brazilianDate(now: Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .formatToParts(now)
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}
export function jobAvailability(
  job: Pick<Job, 'status' | 'deadline'>,
  now = new Date(),
): 'OPEN' | 'CLOSED' | 'EXPIRED' {
  if (job.status === 'CLOSED') return 'CLOSED';
  return job.deadline.toISOString().slice(0, 10) < brazilianDate(now)
    ? 'EXPIRED'
    : 'OPEN';
}
export function presentJob(job: Job, now = new Date()) {
  return {
    ...job,
    deadline: job.deadline.toISOString().slice(0, 10),
    availability: jobAvailability(job, now),
  };
}
