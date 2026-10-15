import type { RegisterCompanyInput } from '../domain/company.js';
import type { CompaniesRepository } from '../repositories/companies-repository.js';
import { ConflictError } from './errors/conflict-error.js';

import type { PasswordHasher } from '../domain/types/password-hasher.js';

export class RegisterCompanyUseCase {
  constructor(
    private repository: CompaniesRepository,
    private hasher: PasswordHasher,
  ) {}

  async execute(input: RegisterCompanyInput) {
    const conflict = await this.repository.findConflict(
      input.email,
      input.cnpj,
    );
    if (conflict)
      throw new ConflictError(
        conflict === 'email' ? 'E-mail já cadastrado.' : 'CNPJ já cadastrado.',
        conflict,
      );
    const { password, ...data } = input;
    return this.repository.create({
      ...data,
      passwordHash: await this.hasher.hash(password),
    });
  }
}
