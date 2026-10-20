import { BcryptPasswordHasher } from '../../libs/password-hasher.js';
import { PrismaCompaniesRepository } from '../../repositories/prisma/prisma-companies-repository.js';
import { RegisterCompanyUseCase } from '../register-company.js';
export function makeRegisterCompanyUseCase() {
  return new RegisterCompanyUseCase(
    new PrismaCompaniesRepository(),
    new BcryptPasswordHasher(),
  );
}
