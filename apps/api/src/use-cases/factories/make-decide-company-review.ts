import { PrismaCompanyReviewsRepository } from '../../repositories/prisma/prisma-company-reviews-repository.js';
import { DecideCompanyReviewUseCase } from '../decide-company-review.js';
export const makeDecideCompanyReviewUseCase = () =>
  new DecideCompanyReviewUseCase(new PrismaCompanyReviewsRepository());
