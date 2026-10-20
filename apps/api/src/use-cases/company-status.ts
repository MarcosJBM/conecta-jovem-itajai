import type { AuthUser } from '../domain/types/auth.js';
import type { CompanyData } from '../domain/company.js';
import type { CompanyStatusRepository } from '../repositories/company-status-repository.js';
import { ForbiddenError } from './errors/forbidden-error.js';
import { ResourceNotFoundError } from './errors/resource-not-found.js';
import { ConflictError } from './errors/conflict-error.js';

export class CompanyStatusUseCase {
  constructor(private companies: CompanyStatusRepository) {}

  async get(user: AuthUser) {
    if (user.role !== 'COMPANY') throw new ForbiddenError();

    const company = await this.companies.findByUser(user.id);

    if (!company) throw new ResourceNotFoundError();

    return { company };
  }

  async resubmit(user: AuthUser, data: CompanyData) {
    const { company } = await this.get(user);

    if (company.validation?.status !== 'REJECTED') {
      throw new ConflictError(
        'Apenas cadastros rejeitados podem ser reenviados.',
      );
    }

    if (!(await this.companies.resubmit(user.id, data))) {
      throw new ConflictError(
        'Apenas cadastros rejeitados podem ser reenviados.',
      );
    }

    return this.get(user);
  }
}
