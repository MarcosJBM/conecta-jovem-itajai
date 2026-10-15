import type { UsersRepository } from '#app/repositories/users-repository';
import type { PasswordHasher } from '../domain/types/password-hasher.js';
import type { UserRole } from '../domain/enums/user-role.js';
import { toPublicUser } from '#app/domain/entities/user';
import { ConflictError } from './errors/conflict-error.js';
import {
  normalizeEmail,
  validatePassword,
  validateRegistrationRole,
} from './validate-user.js';

export class CreateUserUseCase {
  constructor(
    private users: UsersRepository,
    private hasher: PasswordHasher,
  ) {}

  async execute(data: { email: string; password: string; role: UserRole }) {
    const email = normalizeEmail(data.email);

    validatePassword(data.password);
    validateRegistrationRole(data.role);

    if (await this.users.findByEmail(email)) throw new ConflictError();

    const user = await this.users.create({
      email,
      role: data.role,
      passwordHash: await this.hasher.hash(data.password),
    });

    return { user: toPublicUser(user) };
  }
}
