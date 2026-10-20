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

import { normalizeYouth, type YouthInput } from './validate-youth.js';

export class CreateUserUseCase {
  constructor(
    private users: UsersRepository,
    private hasher: PasswordHasher,
  ) {}

  async execute(data: {
    email: string;
    password: string;
    role: UserRole;
    youthProfile?: YouthInput;
    acceptedTerms?: boolean;
  }) {
    const email = normalizeEmail(data.email);

    validatePassword(data.password);
    validateRegistrationRole(data.role);

    const youthProfile =
      data.role === 'YOUTH'
        ? normalizeYouth(data.youthProfile, data.acceptedTerms)
        : undefined;

    if (await this.users.findByEmail(email)) throw new ConflictError();

    if (youthProfile && (await this.users.findByCpf(youthProfile.cpf)))
      throw new ConflictError('CPF já cadastrado.');

    const user = await this.users.create({
      email,
      youthProfile,
      role: data.role,
      passwordHash: await this.hasher.hash(data.password),
    });

    return { user: toPublicUser(user) };
  }
}
