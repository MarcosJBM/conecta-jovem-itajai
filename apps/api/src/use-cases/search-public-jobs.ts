import type {
  JobsRepository,
  JobSearchFilters,
} from '../repositories/jobs-repository.js';
import type { Pagination } from '../domain/types/pagination.js';
import { jobOptions } from '../domain/job.js';
import { validatePagination } from './validate-pagination.js';
import { ForbiddenError } from './errors/forbidden-error.js';
import type { AuthUser } from '../domain/types/auth.js';
export class SearchPublicJobsUseCase {
  constructor(
    private jobs: JobsRepository,
    private clock = () => new Date(),
  ) {}
  async execute(
    user: AuthUser,
    filters: JobSearchFilters,
    pagination: Pagination,
  ) {
    if (user.role !== 'YOUTH') throw new ForbiddenError();
    validatePagination(pagination);
    const now = this.clock();
    const result = await this.jobs.findPublicMany(filters, pagination, now);
    return {
      items: result.items.map(
        ({
          id,
          title,
          description,
          city,
          state,
          area,
          contract,
          regime,
          companyName,
          deadline,
        }) => ({
          id,
          title,
          description,
          city,
          state,
          area,
          contract,
          regime,
          companyName,
          deadline: deadline.toISOString().slice(0, 10),
        }),
      ),
      options: jobOptions,
      total: result.total,
      ...pagination,
      totalPages: Math.ceil(result.total / pagination.pageSize),
    };
  }
}
