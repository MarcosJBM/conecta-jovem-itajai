import type { CompanyReviewsRepository } from '../repositories/company-reviews-repository.js';
import type { ReviewDecision } from '../domain/company-review.js';
import type { AuthUser } from '../domain/types/auth.js';
import { ForbiddenError } from './errors/forbidden-error.js';
import { ResourceNotFoundError } from './errors/resource-not-found.js';
import { ConflictError } from './errors/conflict-error.js';
import { ValidationError } from './errors/validation-error.js';
export class DecideCompanyReviewUseCase {
  constructor(private reviews: CompanyReviewsRepository) {}
  async execute(user: AuthUser, id: string, decision: ReviewDecision) {
    if (user.role !== 'ADMIN') throw new ForbiddenError();
    if (!['APPROVED', 'REJECTED'].includes(decision.status))
      throw new ValidationError();
    const reason = decision.reason?.trim();
    if (decision.status === 'REJECTED' && (!reason || reason.length > 2000))
      throw new ValidationError(
        'Informe a justificativa da rejeição (até 2000 caracteres).',
      );
    if (!(await this.reviews.findById(id))) throw new ResourceNotFoundError();
    const review = await this.reviews.decide(id, user.id, {
      status: decision.status,
      ...(decision.status === 'REJECTED' ? { reason } : {}),
    });
    if (!review)
      throw new ConflictError(
        'Esta solicitação já foi analisada. Atualize a lista.',
      );
    return { review };
  }
}
