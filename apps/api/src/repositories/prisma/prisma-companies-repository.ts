import { getDatabaseClient } from '../../libs/prisma.js';
import type {
  CompaniesRepository,
  CreateCompanyData,
} from '../companies-repository.js';
import { ConflictError } from '../../use-cases/errors/conflict-error.js';

export class PrismaCompaniesRepository implements CompaniesRepository {
  constructor(private prisma = getDatabaseClient()) {}

  async findConflict(email: string, cnpj: string) {
    if (
      await this.prisma.user.findUnique({
        where: { email },
        select: { id: true },
      })
    )
      return 'email' as const;
    if (
      await this.prisma.companyProfile.findUnique({
        where: { cnpj },
        select: { id: true },
      })
    )
      return 'cnpj' as const;
    return null;
  }

  async create(data: CreateCompanyData) {
    const { email, passwordHash, ...company } = data;
    try {
      // Prisma nested writes are atomic: account, profile and validation succeed together.
      const user = await this.prisma.user.create({
        data: {
          email,
          passwordHash,
          role: 'COMPANY',
          companyProfile: {
            create: { ...company, validation: { create: {} } },
          },
        },
        select: {
          id: true,
          companyProfile: {
            select: {
              id: true,
              validation: { select: { id: true, status: true } },
            },
          },
        },
      });
      const profile = user.companyProfile!;
      return {
        id: profile.id,
        userId: user.id,
        validation: {
          id: profile.validation!.id,
          status: 'PENDING' as const,
        },
      };
    } catch (error) {
      // Unique constraints also handle simultaneous requests that pass the precheck.
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        const conflict = await this.findConflict(email, company.cnpj);
        if (conflict)
          throw new ConflictError(
            conflict === 'email'
              ? 'E-mail já cadastrado.'
              : 'CNPJ já cadastrado.',
            conflict,
          );
      }
      throw error;
    }
  }
}
