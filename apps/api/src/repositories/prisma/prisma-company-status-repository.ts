import { getDatabaseClient } from '../../libs/prisma.js';
import type { CompanyData } from '../../domain/company.js';
import type { CompanyStatusRepository } from '../company-status-repository.js';
import { ConflictError } from '../../use-cases/errors/conflict-error.js';
export class PrismaCompanyStatusRepository implements CompanyStatusRepository {
  constructor(private prisma = getDatabaseClient()) {}
  async findByUser(userId: string) {
    const company = await this.prisma.companyProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        cnpj: true,
        legalName: true,
        tradeName: true,
        city: true,
        state: true,
        contactName: true,
        contactRole: true,
        phone: true,
        validation: { select: { status: true, rejectionReason: true } },
      },
    });
    if (!company) return null;
    return {
      ...company,
      cnpj: company.cnpj ?? undefined,
      legalName: company.legalName ?? undefined,
      tradeName: company.tradeName ?? undefined,
      city: company.city ?? undefined,
      state: company.state ?? undefined,
      contactName: company.contactName ?? undefined,
      contactRole: company.contactRole ?? undefined,
      phone: company.phone ?? undefined,
    };
  }
  async resubmit(userId: string, data: CompanyData) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        // Compare-and-set prevents concurrent resubmissions or overwriting an administrative decision.
        const pending = await tx.companyValidation.updateMany({
          where: { status: 'REJECTED', company: { userId } },
          data: {
            status: 'PENDING',
            rejectionReason: null,
            reviewedAt: null,
            reviewedById: null,
          },
        });
        if (!pending.count) return false;
        await tx.companyProfile.update({
          where: { userId },
          data: { ...data, tradeName: data.tradeName ?? null },
        });
        return true;
      });
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2002'
      )
        throw new ConflictError('CNPJ já cadastrado.', 'cnpj');
      throw error;
    }
  }
}
