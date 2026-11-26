import { PrismaJobApplicationsRepository } from '../../repositories/prisma/prisma-job-applications-repository.js';
import { SubmitJobApplicationUseCase } from '../submit-job-application.js';

export const makeSubmitJobApplicationUseCase = () =>
  new SubmitJobApplicationUseCase(new PrismaJobApplicationsRepository());
