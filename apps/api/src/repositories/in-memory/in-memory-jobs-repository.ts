import { randomUUID } from 'node:crypto';
import type {
  JobsRepository,
  CompanyAccess,
  JobSearchFilters,
} from '../jobs-repository.js';
import type { Job, JobData } from '../../domain/job.js';
import { jobAvailability } from '../../domain/job.js';
import type { Pagination } from '../../domain/types/pagination.js';
export class InMemoryJobsRepository implements JobsRepository {
  private jobs: Job[] = [];
  private companies: Map<string, CompanyAccess & { name?: string }>;
  constructor(
    companies: {
      userId: string;
      id: string;
      approved: boolean;
      name?: string;
    }[],
  ) {
    this.companies = new Map(
      companies.map((company) => [
        company.userId,
        { id: company.id, approved: company.approved, name: company.name },
      ]),
    );
  }
  private approved(companyId: string) {
    return [...this.companies.values()].some(
      (company) => company.id === companyId && company.approved,
    );
  }
  async findCompany(userId: string) {
    const company = this.companies.get(userId);
    return company ? { id: company.id, approved: company.approved } : null;
  }
  async findById(companyId: string, id: string) {
    return structuredClone(
      this.jobs.find((job) => job.companyId === companyId && job.id === id) ??
        null,
    );
  }
  async findPublicById(id: string) {
    const job = this.jobs.find((job) => job.id === id);
    if (!job) return null;
    const company = [...this.companies.values()].find(
      ({ id }) => id === job.companyId,
    );
    return structuredClone({ ...job, companyName: company?.name || 'Empresa' });
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
  async findPublicMany(
    filters: JobSearchFilters,
    { page, pageSize }: Pagination,
    now: Date,
  ) {
    const keyword = filters.keyword?.toLocaleLowerCase('pt-BR');
    const city = filters.city?.toLocaleLowerCase('pt-BR');
    const items = this.jobs
      .filter(
        (job) =>
          jobAvailability(job, now) === 'OPEN' &&
          (!keyword ||
            [job.title, job.description, job.requirements].some((value) =>
              value.toLocaleLowerCase('pt-BR').includes(keyword),
            )) &&
          (!city || job.city.toLocaleLowerCase('pt-BR').includes(city)) &&
          (!filters.area || job.area === filters.area) &&
          (!filters.contract || job.contract === filters.contract) &&
          (!filters.regime || job.regime === filters.regime),
      )
      .sort(
        (a, b) =>
          b.createdAt.getTime() - a.createdAt.getTime() ||
          a.id.localeCompare(b.id),
      );
    const names = new Map(
      [...this.companies.values()].map(({ id, name }) => [id, name]),
    );
    return {
      items: structuredClone(
        items.slice((page - 1) * pageSize, page * pageSize).map((job) => ({
          ...job,
          companyName: names.get(job.companyId) || 'Empresa',
        })),
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
