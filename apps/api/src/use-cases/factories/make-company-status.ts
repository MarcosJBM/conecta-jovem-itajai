import { CompanyStatusUseCase } from '../company-status.js';
import { PrismaCompanyStatusRepository } from '../../repositories/prisma/prisma-company-status-repository.js';

export function makeCompanyStatusUseCase() {
  return new CompanyStatusUseCase(new PrismaCompanyStatusRepository());
}
