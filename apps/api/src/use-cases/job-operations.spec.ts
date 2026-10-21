import { expect, it } from 'vitest';
import { InMemoryJobsRepository } from '../repositories/in-memory/in-memory-jobs-repository.js';
import { CreateJobUseCase } from './create-job.js';
import { GetJobUseCase } from './get-job.js';
import { UpdateJobUseCase } from './update-job.js';
import { CloseJobUseCase } from './close-job.js';
import { FetchJobsUseCase } from './fetch-jobs.js';
const input = {
  title: 'Aprendiz',
  description: 'Apoio administrativo',
  requirements: 'Organização',
  city: 'Itajaí',
  state: 'SC',
  area: 'ADMINISTRATION' as const,
  contract: 'APPRENTICESHIP' as const,
  regime: 'ONSITE' as const,
  deadline: '2026-10-21',
};
it('isolates jobs, blocks unapproved companies and prevents editing/reopening closed or expired jobs', async () => {
  const jobs = new InMemoryJobsRepository([
    { id: 'company', userId: 'owner', approved: true },
    { id: 'other-company', userId: 'other', approved: true },
    { id: 'pending-company', userId: 'pending', approved: false },
  ]);
  let now = new Date('2026-10-21T12:00:00Z');
  const clock = () => now;
  const create = new CreateJobUseCase(jobs, clock);
  const get = new GetJobUseCase(jobs, clock);
  const update = new UpdateJobUseCase(jobs, clock);
  const close = new CloseJobUseCase(jobs, clock);
  const list = new FetchJobsUseCase(jobs, clock);
  const owner = {
    id: 'owner',
    role: 'COMPANY' as const,
    email: 'owner@example.com',
  };
  await expect(
    create.execute({ ...owner, role: 'YOUTH' }, input),
  ).rejects.toThrow('permitida');
  await expect(
    create.execute({ ...owner, id: 'pending' }, input),
  ).rejects.toThrow('aprovadas');
  const { job } = await create.execute(owner, input);
  expect(job.availability).toBe('OPEN');
  await expect(get.execute({ ...owner, id: 'other' }, job.id)).rejects.toThrow(
    'encontrado',
  );
  expect(
    (await list.execute({ ...owner, id: 'other' }, { page: 1, pageSize: 1 }))
      .total,
  ).toBe(0);
  await update.execute(owner, job.id, { ...input, title: 'Atualizada' });
  expect((await jobs.findById('company', job.id))?.title).toBe('Atualizada');
  await expect(
    update.execute(owner, job.id, { ...input, title: ' ' }),
  ).rejects.toThrow();
  await close.execute(owner, job.id);
  await expect(close.execute(owner, job.id)).rejects.toThrow('aberta');
  await expect(update.execute(owner, job.id, input)).rejects.toThrow('edição');
  const expiring = (await create.execute(owner, input)).job;
  now = new Date('2026-10-22T03:00:00Z');
  expect((await get.execute(owner, expiring.id)).job.availability).toBe(
    'EXPIRED',
  );
  await expect(
    update.execute(owner, expiring.id, { ...input, deadline: '2099-01-01' }),
  ).rejects.toThrow('edição');
  const copy = await jobs.findById('company', expiring.id);
  copy!.title = 'Mutation';
  expect((await jobs.findById('company', expiring.id))?.title).toBe('Aprendiz');
});
