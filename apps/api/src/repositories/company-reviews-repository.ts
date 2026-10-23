import type {
  CompanyReview,
  ReviewDecision,
} from '../domain/company-review.js';
import type { Pagination } from '../domain/types/pagination.js';
export interface CompanyReviewsRepository {
  findPending(
    pagination: Pagination,
  ): Promise<{ items: CompanyReview[]; total: number }>;
  findById(id: string): Promise<CompanyReview | null>;
  decide(
    id: string,
    reviewerId: string,
    decision: ReviewDecision,
  ): Promise<CompanyReview | null>;
}
