import { PrismaJobApplicationsRepository } from '../../repositories/prisma/prisma-job-applications-repository.js';
import { PrismaJobsRepository } from '../../repositories/prisma/prisma-jobs-repository.js';
import { CompanyApplicationsUseCase } from '../company-applications.js';

export function makeCompanyApplicationsUseCase() {
  return new CompanyApplicationsUseCase(
    new PrismaJobsRepository(),
    new PrismaJobApplicationsRepository(),
  );
}
