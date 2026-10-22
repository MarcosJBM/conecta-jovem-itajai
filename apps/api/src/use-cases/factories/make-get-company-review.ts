import { PrismaCompanyReviewsRepository } from '../../repositories/prisma/prisma-company-reviews-repository.js';
import { GetCompanyReviewUseCase } from '../get-company-review.js';
export const makeGetCompanyReviewUseCase = () =>
  new GetCompanyReviewUseCase(new PrismaCompanyReviewsRepository());
