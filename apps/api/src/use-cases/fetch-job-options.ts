import type { JobsRepository } from '../repositories/jobs-repository.js';
import type { AuthUser } from '../domain/types/auth.js';
import { jobOptions, brazilianDate } from '../domain/job.js';
import { requireCompanyAccess } from './require-company-access.js';
export class FetchJobOptionsUseCase {
  constructor(private jobs: JobsRepository) {}
  async execute(user: AuthUser) {
    await requireCompanyAccess(this.jobs, user);
    return { options: jobOptions, today: brazilianDate(new Date()) };
  }
}
