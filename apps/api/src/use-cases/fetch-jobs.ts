import type { JobsRepository } from '../repositories/jobs-repository.js';
import type { AuthUser } from '../domain/types/auth.js';
import type { Pagination } from '../domain/types/pagination.js';
import { presentJob } from '../domain/job.js';
import { requireCompanyAccess } from './require-company-access.js';
import { validatePagination } from './validate-pagination.js';
export class FetchJobsUseCase {
  constructor(
    private jobs: JobsRepository,
    private clock = () => new Date(),
  ) {}
  async execute(user: AuthUser, pagination: Pagination) {
    const company = await requireCompanyAccess(this.jobs, user);
    validatePagination(pagination);
    const result = await this.jobs.findMany(company.id, pagination);
    const now = this.clock();
    return {
      items: result.items.map((job) => presentJob(job, now)),
      total: result.total,
      ...pagination,
      totalPages: Math.ceil(result.total / pagination.pageSize),
    };
  }
}
