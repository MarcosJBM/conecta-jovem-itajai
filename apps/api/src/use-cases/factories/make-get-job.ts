import { PrismaJobsRepository } from '../../repositories/prisma/prisma-jobs-repository.js';
import { GetJobUseCase } from '../get-job.js';
export const makeGetJobUseCase = () =>
  new GetJobUseCase(new PrismaJobsRepository());
