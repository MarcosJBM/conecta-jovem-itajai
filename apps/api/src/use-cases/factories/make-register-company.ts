import { hash } from 'bcryptjs'
import { PrismaCompaniesRepository } from '../../repositories/prisma/prisma-companies-repository.js'
import { RegisterCompanyUseCase } from '../register-company.js'

export function makeRegisterCompanyUseCase() {
  return new RegisterCompanyUseCase(new PrismaCompaniesRepository(), {
    hash: (password) => hash(password, 12),
  })
}
