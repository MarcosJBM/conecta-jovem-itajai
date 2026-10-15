import { PrismaUsersRepository } from '../../repositories/prisma/prisma-users-repository.js';
import { CreateUserUseCase } from '../create-user.js';
import { ScryptPasswordHasher } from '../../libs/password-hasher.js';

export function makeCreateUserUseCase() {
  return new CreateUserUseCase(
    new PrismaUsersRepository(),
    new ScryptPasswordHasher(),
  );
}
