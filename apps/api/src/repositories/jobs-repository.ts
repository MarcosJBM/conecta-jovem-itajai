import type { Job, JobData } from '../domain/job.js';
import type { Pagination } from '../domain/types/pagination.js';
export interface CompanyAccess {
  id: string;
  approved: boolean;
}
export interface JobsRepository {
  findCompany(userId: string): Promise<CompanyAccess | null>;
  findMany(
    companyId: string,
    pagination: Pagination,
  ): Promise<{ items: Job[]; total: number }>;
  findById(companyId: string, id: string): Promise<Job | null>;
  create(companyId: string, data: JobData): Promise<Job | null>;
  update(
    companyId: string,
    id: string,
    data: JobData,
    now: Date,
  ): Promise<Job | null>;
  close(companyId: string, id: string, now: Date): Promise<Job | null>;
}
