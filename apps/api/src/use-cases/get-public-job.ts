import { jobAvailability, presentPublicJob } from '../domain/job.js';
import type { AuthUser } from '../domain/types/auth.js';
import type { JobApplicationsRepository } from '../repositories/job-applications-repository.js';
import type { JobsRepository } from '../repositories/jobs-repository.js';
import { ForbiddenError } from './errors/forbidden-error.js';
import { ResourceNotFoundError } from './errors/resource-not-found.js';

export class GetPublicJobUseCase {
  constructor(
    private jobs: JobsRepository,
    private applications: Pick<JobApplicationsRepository, 'findByJobAndUser'>,
    private clock = () => new Date(),
  ) {}

  async execute(user: AuthUser, id: string) {
    if (user.role !== 'YOUTH') throw new ForbiddenError();
    const job = await this.jobs.findPublicById(id);
    if (!job) throw new ResourceNotFoundError('Vaga não encontrada.');

    return {
      application: await this.applications.findByJobAndUser(id, user.id),
      job: {
        ...presentPublicJob(job),
        requirements: job.requirements,
        availability: jobAvailability(job, this.clock()),
      },
    };
  }
}
