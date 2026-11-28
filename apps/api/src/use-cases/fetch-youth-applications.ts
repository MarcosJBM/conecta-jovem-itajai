import type { AuthUser } from '../domain/types/auth.js';
import type { Pagination } from '../domain/types/pagination.js';
import type { PrismaJobApplicationsRepository } from '../repositories/prisma/prisma-job-applications-repository.js';
import { ForbiddenError } from './errors/forbidden-error.js';
import { validatePagination } from './validate-pagination.js';

export class FetchYouthApplicationsUseCase {
  constructor(
    private applications: Pick<
      PrismaJobApplicationsRepository,
      'findYouthApplications'
    >,
  ) {}

  async execute(user: AuthUser, pagination: Pagination) {
    if (user.role !== 'YOUTH') throw new ForbiddenError();
    validatePagination(pagination);
    const result = await this.applications.findYouthApplications(
      user.id,
      pagination,
    );
    return {
      ...result,
      ...pagination,
      totalPages: Math.ceil(result.total / pagination.pageSize),
    };
  }
}
