import { PrismaUsersRepository } from '../../repositories/prisma/prisma-users-repository.js';
import { UpdateUserUseCase } from '../update-user.js';
import { BcryptPasswordHasher } from '../../libs/password-hasher.js';

export function makeUpdateUserUseCase() {
  return new UpdateUserUseCase(
    new PrismaUsersRepository(),
    new BcryptPasswordHasher(),
  );
}
