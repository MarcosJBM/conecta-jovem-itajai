import type { CompanyReviewsRepository } from '../company-reviews-repository.js';
import type {
  CompanyReview,
  ReviewDecision,
} from '../../domain/company-review.js';
import type { Pagination } from '../../domain/types/pagination.js';
export class InMemoryCompanyReviewsRepository implements CompanyReviewsRepository {
  private items: CompanyReview[];
  constructor(items: CompanyReview[] = []) {
    this.items = structuredClone(items);
  }
  async findById(id: string) {
    return structuredClone(this.items.find((item) => item.id === id) ?? null);
  }
  async findPending({ page, pageSize }: Pagination) {
    const items = this.items
      .filter((item) => item.status === 'PENDING')
      .sort(
        (a, b) =>
          a.createdAt.getTime() - b.createdAt.getTime() ||
          a.id.localeCompare(b.id),
      );
    return {
      items: structuredClone(
        items.slice((page - 1) * pageSize, page * pageSize),
      ),
      total: items.length,
    };
  }
  async decide(id: string, reviewerId: string, decision: ReviewDecision) {
    const item = this.items.find(
      (item) => item.id === id && item.status === 'PENDING',
    );
    if (!item) return null;
    Object.assign(item, {
      status: decision.status,
      rejectionReason: decision.status === 'REJECTED' ? decision.reason! : null,
      reviewedById: reviewerId,
      reviewedAt: new Date(),
    });
    return structuredClone(item);
  }
}
