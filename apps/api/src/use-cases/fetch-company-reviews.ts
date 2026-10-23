import type { CompanyReviewsRepository } from '../repositories/company-reviews-repository.js';
import type { AuthUser } from '../domain/types/auth.js';
import type { Pagination } from '../domain/types/pagination.js';
import { ForbiddenError } from './errors/forbidden-error.js';
import { validatePagination } from './validate-pagination.js';
export class FetchCompanyReviewsUseCase {
  constructor(private reviews: CompanyReviewsRepository) {}
  async execute(user: AuthUser, pagination: Pagination) {
    if (user.role !== 'ADMIN') throw new ForbiddenError();
    validatePagination(pagination);
    const result = await this.reviews.findPending(pagination);
    return {
      ...result,
      ...pagination,
      totalPages: Math.ceil(result.total / pagination.pageSize),
    };
  }
}
