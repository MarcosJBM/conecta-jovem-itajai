import type { JobsRepository } from '../repositories/jobs-repository.js';
import type { AuthUser } from '../domain/types/auth.js';
import { presentJob } from '../domain/job.js';
import { requireCompanyAccess } from './require-company-access.js';
import { ResourceNotFoundError } from './errors/resource-not-found.js';
export class GetJobUseCase {
  constructor(
    private jobs: JobsRepository,
    private clock = () => new Date(),
  ) {}
  async execute(user: AuthUser, id: string) {
    const company = await requireCompanyAccess(this.jobs, user);
    const job = await this.jobs.findById(company.id, id);
    if (!job) throw new ResourceNotFoundError();
    return { job: presentJob(job, this.clock()) };
  }
}
