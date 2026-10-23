import type { JobsRepository } from '../jobs-repository.js';
import type { JobData } from '../../domain/job.js';
import { brazilianDate } from '../../domain/job.js';
import type { Pagination } from '../../domain/types/pagination.js';
import { getDatabaseClient } from '../../libs/prisma.js';
export class PrismaJobsRepository implements JobsRepository {
  constructor(private prisma = getDatabaseClient()) {}
  async findCompany(userId: string) {
    const company = await this.prisma.companyProfile.findUnique({
      where: { userId },
      select: { id: true, validation: { select: { status: true } } },
    });
    return company
      ? { id: company.id, approved: company.validation?.status === 'APPROVED' }
      : null;
  }
  async findById(companyId: string, id: string) {
    return this.prisma.job.findFirst({ where: { id, companyId } });
  }
  async findMany(companyId: string, { page, pageSize }: Pagination) {
    const [items, total] = await this.prisma.$transaction(
      [
        this.prisma.job.findMany({
          where: { companyId },
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        }),
        this.prisma.job.count({ where: { companyId } }),
      ],
      { isolationLevel: 'RepeatableRead' },
    );
    return { items, total };
  }
  async create(companyId: string, data: JobData) {
    return this.prisma.$transaction(async (tx) => {
      // An unchanged status update locks the validation until the job write commits.
      const approved = await tx.companyValidation.updateMany({
        where: { companyId, status: 'APPROVED' },
        data: { status: 'APPROVED' },
      });
      return approved.count
        ? tx.job.create({ data: { ...data, companyId } })
        : null;
    });
  }
  async update(companyId: string, id: string, data: JobData, now: Date) {
    return this.prisma.$transaction(async (tx) => {
      const approved = await tx.companyValidation.updateMany({
        where: { companyId, status: 'APPROVED' },
        data: { status: 'APPROVED' },
      });
      if (!approved.count) return null;
      const changed = await tx.job.updateMany({
        where: {
          id,
          companyId,
          status: 'OPEN',
          deadline: { gte: new Date(`${brazilianDate(now)}T00:00:00Z`) },
        },
        data,
      });
      return changed.count ? tx.job.findUniqueOrThrow({ where: { id } }) : null;
    });
  }
  async close(companyId: string, id: string, now: Date) {
    return this.prisma.$transaction(async (tx) => {
      const approved = await tx.companyValidation.updateMany({
        where: { companyId, status: 'APPROVED' },
        data: { status: 'APPROVED' },
      });
      if (!approved.count) return null;
      const changed = await tx.job.updateMany({
        where: {
          id,
          companyId,
          status: 'OPEN',
          deadline: { gte: new Date(`${brazilianDate(now)}T00:00:00Z`) },
        },
        data: { status: 'CLOSED' },
      });
      return changed.count ? tx.job.findUniqueOrThrow({ where: { id } }) : null;
    });
  }
}
