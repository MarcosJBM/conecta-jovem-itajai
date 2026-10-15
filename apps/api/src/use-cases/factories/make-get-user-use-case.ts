import { PrismaUsersRepository } from '../../repositories/prisma/prisma-users-repository.js';
import { GetUserUseCase } from '../get-user.js';

export function makeGetUserUseCase() {
  return new GetUserUseCase(new PrismaUsersRepository());
}
