import type { JobsRepository } from '../repositories/jobs-repository.js';
import type { AuthUser } from '../domain/types/auth.js';
import { presentJob } from '../domain/job.js';
import { normalizeJob, type JobInput } from './validate-job.js';
import { requireCompanyAccess } from './require-company-access.js';
import { ConflictError } from './errors/conflict-error.js';
export class CreateJobUseCase {
  constructor(
    private jobs: JobsRepository,
    private clock = () => new Date(),
  ) {}
  async execute(user: AuthUser, data: JobInput) {
    const company = await requireCompanyAccess(this.jobs, user, true);
    const now = this.clock();
    const job = await this.jobs.create(company.id, normalizeJob(data, now));
    if (!job)
      throw new ConflictError(
        'A situação da empresa mudou. Atualize o cadastro.',
      );
    return { job: presentJob(job, now) };
  }
}
