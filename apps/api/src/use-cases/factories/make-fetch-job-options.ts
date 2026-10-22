import { PrismaJobsRepository } from '../../repositories/prisma/prisma-jobs-repository.js';
import { FetchJobOptionsUseCase } from '../fetch-job-options.js';
export const makeFetchJobOptionsUseCase = () =>
  new FetchJobOptionsUseCase(new PrismaJobsRepository());
