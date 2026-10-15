import { PrismaUsersRepository } from '../../repositories/prisma/prisma-users-repository.js';
import { DeleteUserUseCase } from '../delete-user.js';

export function makeDeleteUserUseCase() {
  return new DeleteUserUseCase(new PrismaUsersRepository());
}
