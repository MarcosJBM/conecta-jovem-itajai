import type { UsersRepository } from '../repositories/users-repository.js';
import type { Pagination, Page } from '../domain/types/pagination.js';
import { toPublicUser, type PublicUser } from '../domain/entities/user.js';
import { ValidationError } from './errors/validation-error.js';

export class FetchUsersUseCase {
  constructor(private users: UsersRepository) {}

  async execute({ page, pageSize }: Pagination): Promise<Page<PublicUser>> {
    if (
      !Number.isSafeInteger(page) ||
      page < 1 ||
      !Number.isInteger(pageSize) ||
      pageSize < 1 ||
      pageSize > 100 ||
      !Number.isSafeInteger((page - 1) * pageSize)
    ) {
      throw new ValidationError('Paginação inválida.');
    }

    const result = await this.users.findMany({ page, pageSize });

    return {
      items: result.users.map(toPublicUser),
      total: result.total,
      page,
      pageSize,
      totalPages: Math.ceil(result.total / pageSize),
    };
  }
}
