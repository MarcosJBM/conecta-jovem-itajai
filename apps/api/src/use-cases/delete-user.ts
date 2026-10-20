import type { UsersRepository } from '../repositories/users-repository.js';
import { ResourceNotFoundError } from './errors/resource-not-found.js';

export class DeleteUserUseCase {
  constructor(private users: UsersRepository) {}

  async execute({ id }: { id: string }) {
    if (!(await this.users.findById(id)) || !(await this.users.delete(id))) {
      throw new ResourceNotFoundError();
    }
  }
}
