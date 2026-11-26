import type { JobsRepository, JobSearchFilters } from '../jobs-repository.js';
import type { JobData, PublicJob } from '../../domain/job.js';
import { brazilianDate } from '../../domain/job.js';
import type { Pagination } from '../../domain/types/pagination.js';
import { getDatabaseClient } from '../../libs/prisma.js';
const publicCompany = { select: { tradeName: true, legalName: true } } as const;

function withPublicCompanyName({
  company,
  ...job
}: Omit<PublicJob, 'companyName'> & {
  company: { tradeName: string | null; legalName: string | null };
}): PublicJob {
  return {
    ...job,
    companyName: company.tradeName || company.legalName || 'Empresa',
  };
}

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
  async findPublicById(id: string) {
    const job = await this.prisma.job.findUnique({
      where: { id },
      include: { company: publicCompany },
    });
    return job ? withPublicCompanyName(job) : null;
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
  async findPublicMany(
    filters: JobSearchFilters,
    { page, pageSize }: Pagination,
    now: Date,
  ) {
    const contains = (value: string) => ({
      contains: value.replace(/[\\%_]/g, '\\$&'),
      mode: 'insensitive' as const,
    });
    const keyword = filters.keyword ? contains(filters.keyword) : undefined;
    const where = {
      status: 'OPEN' as const,
      deadline: { gte: new Date(`${brazilianDate(now)}T00:00:00Z`) },
      area: filters.area,
      contract: filters.contract,
      regime: filters.regime,
      city: filters.city ? contains(filters.city) : undefined,
      OR: keyword
        ? [
            { title: keyword },
            { description: keyword },
            { requirements: keyword },
          ]
        : undefined,
    };
    const [items, total] = await this.prisma.$transaction(
      [
        this.prisma.job.findMany({
          where,
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
          include: { company: publicCompany },
        }),
        this.prisma.job.count({ where }),
      ],
      { isolationLevel: 'RepeatableRead' },
    );
    return {
      items: items.map(withPublicCompanyName),
      total,
    };
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
