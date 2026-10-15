import { PrismaUsersRepository } from '../../repositories/prisma/prisma-users-repository.js';
import { FetchUsersUseCase } from '../fetch-users.js';

export function makeFetchUsersUseCase() {
  return new FetchUsersUseCase(new PrismaUsersRepository());
}
