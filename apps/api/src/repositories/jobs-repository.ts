import type { Job, JobData, PublicJob } from '../domain/job.js';
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
  findPublicMany(
    filters: JobSearchFilters,
    pagination: Pagination,
    now: Date,
  ): Promise<{ items: PublicJob[]; total: number }>;
  findPublicById(id: string): Promise<PublicJob | null>;
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

export interface JobSearchFilters {
  keyword?: string;
  city?: string;
  area?: Job['area'];
  contract?: Job['contract'];
  regime?: Job['regime'];
}
