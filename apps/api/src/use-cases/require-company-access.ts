import type { JobsRepository } from '../repositories/jobs-repository.js';
import type { AuthUser } from '../domain/types/auth.js';
import { ForbiddenError } from './errors/forbidden-error.js';
import { ResourceNotFoundError } from './errors/resource-not-found.js';
export async function requireCompanyAccess(
  repository: JobsRepository,
  user: AuthUser,
  approved = false,
) {
  if (user.role !== 'COMPANY') throw new ForbiddenError();
  const company = await repository.findCompany(user.id);
  if (!company) throw new ResourceNotFoundError();
  if (approved && !company.approved)
    throw new ForbiddenError(
      'Somente empresas aprovadas podem gerenciar vagas.',
    );
  return company;
}
