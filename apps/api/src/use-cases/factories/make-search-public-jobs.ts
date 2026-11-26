import { PrismaJobsRepository } from '../../repositories/prisma/prisma-jobs-repository.js';
import { SearchPublicJobsUseCase } from '../search-public-jobs.js';
export const makeSearchPublicJobsUseCase = () =>
  new SearchPublicJobsUseCase(new PrismaJobsRepository());
