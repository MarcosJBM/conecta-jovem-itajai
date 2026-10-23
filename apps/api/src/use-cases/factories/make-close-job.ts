import { PrismaJobsRepository } from '../../repositories/prisma/prisma-jobs-repository.js';
import { CloseJobUseCase } from '../close-job.js';
export const makeCloseJobUseCase = () =>
  new CloseJobUseCase(new PrismaJobsRepository());
