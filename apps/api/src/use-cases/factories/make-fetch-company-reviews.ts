import { PrismaCompanyReviewsRepository } from '../../repositories/prisma/prisma-company-reviews-repository.js';
import { FetchCompanyReviewsUseCase } from '../fetch-company-reviews.js';
export const makeFetchCompanyReviewsUseCase = () =>
  new FetchCompanyReviewsUseCase(new PrismaCompanyReviewsRepository());
