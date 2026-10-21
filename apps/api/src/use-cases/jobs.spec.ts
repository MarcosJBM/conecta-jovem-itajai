import { expect, it } from 'vitest';
import { brazilianDate, jobAvailability } from '../domain/job.js';
import { normalizeJob } from './validate-job.js';
export const validJobInput = {
  title: ' Aprendiz administrativo ',
  description: 'Apoio à equipe',
  requirements: 'Organização',
  city: 'Itajaí',
  state: 'sc',
  area: 'ADMINISTRATION' as const,
  contract: 'APPRENTICESHIP' as const,
  regime: 'ONSITE' as const,
  deadline: '2026-10-21',
};
it('validates formal job data and keeps contracting separate from work regime', () => {
  const now = new Date('2026-10-21T12:00:00Z');
  const job = normalizeJob(validJobInput, now);
  expect(job.title).toBe('Aprendiz administrativo');
  expect(job.state).toBe('SC');
  expect(job.contract).toBe('APPRENTICESHIP');
  expect(job.regime).toBe('ONSITE');
  for (const changes of [
    { deadline: '2026-02-30' },
    { deadline: '2026-10-20' },
    { state: 'XX' },
    { title: ' ' },
  ])
    expect(() => normalizeJob({ ...validJobInput, ...changes }, now)).toThrow();
});
it('expires at the end of the stated date in São Paulo without a scheduled job', () => {
  const job = {
    status: 'OPEN' as const,
    deadline: new Date('2026-10-21T00:00:00Z'),
  };
  const before = new Date('2026-10-22T02:59:59.999Z');
  const after = new Date('2026-10-22T03:00:00Z');
  expect(brazilianDate(before)).toBe('2026-10-21');
  expect(jobAvailability(job, before)).toBe('OPEN');
  expect(jobAvailability(job, after)).toBe('EXPIRED');
  expect(jobAvailability({ ...job, status: 'CLOSED' }, before)).toBe('CLOSED');
});
