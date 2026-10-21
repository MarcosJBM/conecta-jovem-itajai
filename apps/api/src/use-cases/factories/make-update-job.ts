import { PrismaJobsRepository } from '../../repositories/prisma/prisma-jobs-repository.js';
import { UpdateJobUseCase } from '../update-job.js';
export const makeUpdateJobUseCase = () =>
  new UpdateJobUseCase(new PrismaJobsRepository());
