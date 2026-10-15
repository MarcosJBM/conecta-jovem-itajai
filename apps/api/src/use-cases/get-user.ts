import type { UsersRepository } from '../repositories/users-repository.js';
import { toPublicUser } from '../domain/entities/user.js';
import { ResourceNotFoundError } from './errors/resource-not-found.js';

export class GetUserUseCase {
  constructor(private users: UsersRepository) {}

  async execute({ id }: { id: string }) {
    const user = await this.users.findById(id);

    if (!user) throw new ResourceNotFoundError();

    return { user: toPublicUser(user) };
  }
}
