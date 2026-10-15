import type {
  UsersRepository,
  UpdateUserData,
} from '../repositories/users-repository.js';
import type { PasswordHasher } from '../domain/types/password-hasher.js';
import { toPublicUser } from '../domain/entities/user.js';
import { ResourceNotFoundError } from './errors/resource-not-found.js';
import { ConflictError } from './errors/conflict-error.js';
import { ValidationError } from './errors/validation-error.js';
import { normalizeEmail, validatePassword } from './validate-user.js';

export class UpdateUserUseCase {
  constructor(
    private users: UsersRepository,
    private hasher: PasswordHasher,
  ) {}

  async execute({
    id,
    email,
    password,
  }: {
    id: string;
    email?: string;
    password?: string;
  }) {
    if (email === undefined && password === undefined) {
      throw new ValidationError('Informe ao menos um campo.');
    }

    const data: UpdateUserData = {};

    if (email !== undefined) data.email = normalizeEmail(email);

    if (password !== undefined) validatePassword(password);

    if (!(await this.users.findById(id))) throw new ResourceNotFoundError();

    if (data.email !== undefined) {
      const existing = await this.users.findByEmail(data.email);

      if (existing && existing.id !== id) throw new ConflictError();
    }

    if (password !== undefined) {
      data.passwordHash = await this.hasher.hash(password);
    }

    const user = await this.users.update(id, data);

    if (!user) throw new ResourceNotFoundError();

    return { user: toPublicUser(user) };
  }
}
