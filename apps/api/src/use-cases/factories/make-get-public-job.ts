import { PrismaJobApplicationsRepository } from '../../repositories/prisma/prisma-job-applications-repository.js';
import { PrismaJobsRepository } from '../../repositories/prisma/prisma-jobs-repository.js';
import { GetPublicJobUseCase } from '../get-public-job.js';

export const makeGetPublicJobUseCase = () =>
  new GetPublicJobUseCase(
    new PrismaJobsRepository(),
    new PrismaJobApplicationsRepository(),
  );
