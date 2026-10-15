import { randomUUID } from 'node:crypto';
import type { User, Profile } from '../../domain/entities/user.js';
import type { Pagination } from '../../domain/types/pagination.js';
import type {
  UsersRepository,
  CreateUserData,
  UpdateUserData,
} from '../users-repository.js';
import { ConflictError } from '../../use-cases/errors/conflict-error.js';

export class InMemoryUsersRepository implements UsersRepository {
  private users: User[] = [];

  async create(data: CreateUserData) {
    if (this.users.some((user) => user.email === data.email)) {
      throw new ConflictError();
    }

    if (
      data.youthProfile &&
      this.users.some(
        (user) => user.youthProfile?.cpf === data.youthProfile?.cpf,
      )
    )
      throw new ConflictError('CPF já cadastrado.');
    const id = randomUUID();
    const now = new Date();

    const profile: Profile = {
      id: randomUUID(),
      userId: id,
      createdAt: now,
      updatedAt: now,
    };

    const user: User = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
      youthProfile:
        data.role === 'YOUTH' ? { ...profile, ...data.youthProfile! } : null,
      companyProfile: data.role === 'COMPANY' ? profile : null,
    };

    this.users.push(structuredClone(user));

    return structuredClone(user);
  }

  async findById(id: string) {
    return structuredClone(this.users.find((user) => user.id === id) ?? null);
  }

  async findByCpf(cpf: string) {
    return structuredClone(
      this.users.find((user) => user.youthProfile?.cpf === cpf) ?? null,
    );
  }

  async findByEmail(email: string) {
    return structuredClone(
      this.users.find((user) => user.email === email) ?? null,
    );
  }

  async findMany({ page, pageSize }: Pagination) {
    const users = [...this.users].sort(
      (a, b) =>
        a.createdAt.getTime() - b.createdAt.getTime() ||
        (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
    );

    return {
      users: structuredClone(
        users.slice((page - 1) * pageSize, page * pageSize),
      ),
      total: users.length,
    };
  }

  async update(id: string, data: UpdateUserData) {
    const index = this.users.findIndex((user) => user.id === id);
    const user = this.users[index];

    if (!user) return null;

    if (
      data.email !== undefined &&
      this.users.some((other) => other.id !== id && other.email === data.email)
    ) {
      throw new ConflictError();
    }

    const updated = { ...user, ...data, updatedAt: new Date() };

    this.users[index] = structuredClone(updated);

    return structuredClone(updated);
  }

  async delete(id: string) {
    const index = this.users.findIndex((user) => user.id === id);

    if (index < 0) return false;

    this.users.splice(index, 1);

    return true;
  }
}
