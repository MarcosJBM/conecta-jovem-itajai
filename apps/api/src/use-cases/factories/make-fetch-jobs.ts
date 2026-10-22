import { PrismaJobsRepository } from '../../repositories/prisma/prisma-jobs-repository.js';
import { FetchJobsUseCase } from '../fetch-jobs.js';
export const makeFetchJobsUseCase = () =>
  new FetchJobsUseCase(new PrismaJobsRepository());
