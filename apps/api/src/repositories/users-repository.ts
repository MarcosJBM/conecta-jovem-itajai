import type { User } from '../domain/entities/user.js';
import type { Pagination } from '../domain/types/pagination.js';
export type CreateUserData = Pick<User, 'email' | 'passwordHash' | 'role'>;
export type UpdateUserData = Partial<Pick<User, 'email' | 'passwordHash'>>;

export interface UsersRepository {
  create(data: CreateUserData): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findMany(pagination: Pagination): Promise<{ users: User[]; total: number }>;
  update(id: string, data: UpdateUserData): Promise<User | null>;
  delete(id: string): Promise<boolean>;
}
