import { randomUUID } from 'node:crypto';
import type { JobsRepository, CompanyAccess } from '../jobs-repository.js';
import type { Job, JobData } from '../../domain/job.js';
import { jobAvailability } from '../../domain/job.js';
import type { Pagination } from '../../domain/types/pagination.js';
export class InMemoryJobsRepository implements JobsRepository {
  private jobs: Job[] = [];
  private companies: Map<string, CompanyAccess>;
  constructor(companies: { userId: string; id: string; approved: boolean }[]) {
    this.companies = new Map(
      companies.map((company) => [
        company.userId,
        { id: company.id, approved: company.approved },
      ]),
    );
  }
  private approved(companyId: string) {
    return [...this.companies.values()].some(
      (company) => company.id === companyId && company.approved,
    );
  }
  async findCompany(userId: string) {
    return structuredClone(this.companies.get(userId) ?? null);
  }
  async findById(companyId: string, id: string) {
    return structuredClone(
      this.jobs.find((job) => job.companyId === companyId && job.id === id) ??
        null,
    );
  }
  async findMany(companyId: string, { page, pageSize }: Pagination) {
    const items = this.jobs
      .filter((job) => job.companyId === companyId)
      .sort(
        (a, b) =>
          b.createdAt.getTime() - a.createdAt.getTime() ||
          a.id.localeCompare(b.id),
      );
    return {
      items: structuredClone(
        items.slice((page - 1) * pageSize, page * pageSize),
      ),
      total: items.length,
    };
  }
  async create(companyId: string, data: JobData) {
    if (!this.approved(companyId)) return null;
    const job: Job = {
      ...structuredClone(data),
      id: randomUUID(),
      companyId,
      status: 'OPEN',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.jobs.push(job);
    return structuredClone(job);
  }
  async update(companyId: string, id: string, data: JobData, now: Date) {
    const job = this.jobs.find(
      (job) => job.companyId === companyId && job.id === id,
    );
    if (
      !job ||
      !this.approved(companyId) ||
      jobAvailability(job, now) !== 'OPEN'
    )
      return null;
    Object.assign(job, structuredClone(data), { updatedAt: new Date() });
    return structuredClone(job);
  }
  async close(companyId: string, id: string, now: Date) {
    const job = this.jobs.find(
      (job) => job.companyId === companyId && job.id === id,
    );
    if (
      !job ||
      !this.approved(companyId) ||
      jobAvailability(job, now) !== 'OPEN'
    )
      return null;
    job.status = 'CLOSED';
    job.updatedAt = new Date();
    return structuredClone(job);
  }
}
