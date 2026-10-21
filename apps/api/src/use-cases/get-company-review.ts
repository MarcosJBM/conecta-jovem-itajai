import type { CompanyReviewsRepository } from '../repositories/company-reviews-repository.js';
import type { AuthUser } from '../domain/types/auth.js';
import { ForbiddenError } from './errors/forbidden-error.js';
import { ResourceNotFoundError } from './errors/resource-not-found.js';
export class GetCompanyReviewUseCase {
  constructor(private reviews: CompanyReviewsRepository) {}
  async execute(user: AuthUser, id: string) {
    if (user.role !== 'ADMIN') throw new ForbiddenError();
    const review = await this.reviews.findById(id);
    if (!review) throw new ResourceNotFoundError();
    return { review };
  }
}
