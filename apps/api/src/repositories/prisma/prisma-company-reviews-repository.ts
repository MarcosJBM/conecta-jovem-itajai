import type { CompanyReviewsRepository } from '../company-reviews-repository.js';
import type { ReviewDecision } from '../../domain/company-review.js';
import type { Pagination } from '../../domain/types/pagination.js';
import { getDatabaseClient } from '../../libs/prisma.js';
const include = {
  company: {
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
      user: { select: { email: true } },
    },
  },
} as const;
function present(
  item: NonNullable<
    Awaited<ReturnType<PrismaCompanyReviewsRepository['load']>>
  >,
) {
  const { user, ...company } = item.company;
  return { ...item, company: { ...company, email: user.email } };
}
export class PrismaCompanyReviewsRepository implements CompanyReviewsRepository {
  constructor(private prisma = getDatabaseClient()) {}
  async load(id: string) {
    return this.prisma.companyValidation.findUnique({ where: { id }, include });
  }
  async findById(id: string) {
    const item = await this.load(id);
    return item ? present(item) : null;
  }
  async findPending({ page, pageSize }: Pagination) {
    const [items, total] = await this.prisma.$transaction(
      [
        this.prisma.companyValidation.findMany({
          where: { status: 'PENDING' },
          include,
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        }),
        this.prisma.companyValidation.count({ where: { status: 'PENDING' } }),
      ],
      { isolationLevel: 'RepeatableRead' },
    );
    return { items: items.map(present), total };
  }
  async decide(id: string, reviewerId: string, decision: ReviewDecision) {
    return this.prisma.$transaction(async (tx) => {
      const changed = await tx.companyValidation.updateMany({
        where: { id, status: 'PENDING' },
        data: {
          status: decision.status,
          rejectionReason:
            decision.status === 'REJECTED' ? decision.reason! : null,
          reviewedAt: new Date(),
          reviewedById: reviewerId,
        },
      });
      if (!changed.count) return null;
      return present(
        await tx.companyValidation.findUniqueOrThrow({
          where: { id },
          include,
        }),
      );
    });
  }
}
