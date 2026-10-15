import type {
  UsersRepository,
  CreateUserData,
  UpdateUserData,
} from '../users-repository.js';
import type { Pagination } from '../../domain/types/pagination.js';
import { getDatabaseClient } from '../../libs/prisma.js';
import { ConflictError } from '../../use-cases/errors/conflict-error.js';

const include = { youthProfile: true, companyProfile: true } as const;

function hasCode(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === code
  );
}

export class PrismaUsersRepository implements UsersRepository {
  constructor(private prisma = getDatabaseClient()) {}

  async create(data: CreateUserData) {
    try {
      return await this.prisma.user.create({
        data: {
          email: data.email,
          passwordHash: data.passwordHash,
          role: data.role,
          ...(data.role === 'YOUTH'
            ? { youthProfile: { create: data.youthProfile! } }
            : {}),
          ...(data.role === 'COMPANY'
            ? { companyProfile: { create: {} } }
            : {}),
        },
        include,
      });
    } catch (error) {
      if (hasCode(error, 'P2002')) {
        // Prisma's PostgreSQL adapter can report the constraint without meta.target.
        // The failed nested write has rolled back before these lookups run.
        if (
          data.youthProfile &&
          !(await this.findByEmail(data.email)) &&
          (await this.findByCpf(data.youthProfile.cpf))
        ) {
          throw new ConflictError('CPF já cadastrado.');
        }
        throw new ConflictError();
      }

      throw error;
    }
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id }, include });
  }

  async findByCpf(cpf: string) {
    return this.prisma.user.findFirst({
      where: { youthProfile: { cpf } },
      include,
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email }, include });
  }

  async findMany({ page, pageSize }: Pagination) {
    const [users, total] = await this.prisma.$transaction(
      [
        this.prisma.user.findMany({
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          include,
        }),
        this.prisma.user.count(),
      ],
      { isolationLevel: 'RepeatableRead' },
    );

    return { users, total };
  }

  async update(id: string, data: UpdateUserData) {
    try {
      return await this.prisma.user.update({ where: { id }, data, include });
    } catch (error) {
      if (hasCode(error, 'P2002')) throw new ConflictError();

      if (hasCode(error, 'P2025')) return null;

      throw error;
    }
  }
  async delete(id: string) {
    try {
      await this.prisma.user.delete({ where: { id } });

      return true;
    } catch (error) {
      if (hasCode(error, 'P2025')) return false;

      throw error;
    }
  }
}
