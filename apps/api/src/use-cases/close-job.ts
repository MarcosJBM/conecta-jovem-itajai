import type { JobsRepository } from '../repositories/jobs-repository.js';
import type { AuthUser } from '../domain/types/auth.js';
import { presentJob, jobAvailability } from '../domain/job.js';
import { requireCompanyAccess } from './require-company-access.js';
import { ResourceNotFoundError } from './errors/resource-not-found.js';
import { ConflictError } from './errors/conflict-error.js';
export class CloseJobUseCase {
  constructor(
    private jobs: JobsRepository,
    private clock = () => new Date(),
  ) {}
  async execute(user: AuthUser, id: string) {
    const company = await requireCompanyAccess(this.jobs, user, true);
    const now = this.clock();
    const existing = await this.jobs.findById(company.id, id);
    if (!existing) throw new ResourceNotFoundError();
    if (jobAvailability(existing, now) !== 'OPEN')
      throw new ConflictError('Esta vaga não está aberta.');
    const job = await this.jobs.close(company.id, id, now);
    if (!job)
      throw new ConflictError(
        'A situação da vaga ou empresa mudou. Atualize a lista.',
      );
    return { job: presentJob(job, now) };
  }
}
