import { PrismaJobsRepository } from '../../repositories/prisma/prisma-jobs-repository.js';
import { CreateJobUseCase } from '../create-job.js';
export const makeCreateJobUseCase = () =>
  new CreateJobUseCase(new PrismaJobsRepository());
