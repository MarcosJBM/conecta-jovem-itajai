import { PrismaUsersRepository } from '../../repositories/prisma/prisma-users-repository.js';
import { PrismaSessionsRepository } from '../../repositories/prisma/prisma-sessions-repository.js';
import { BcryptPasswordHasher } from '../../libs/password-hasher.js';
import { LoginUseCase } from '../login.js';
import { SessionUseCase } from '../session.js';

export function makeSessionUseCase() {
  return new SessionUseCase(
    new PrismaSessionsRepository(),
    new PrismaUsersRepository(),
  );
}

export function makeLoginUseCase() {
  return new LoginUseCase(
    new PrismaUsersRepository(),
    makeSessionUseCase(),
    new BcryptPasswordHasher(),
  );
}
