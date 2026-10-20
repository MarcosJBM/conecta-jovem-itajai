import type { CompanyData } from '../domain/company.js';
import type { CompanyStatus } from '../domain/types/company-status.js';
export interface CompanyStatusRepository {
  findByUser(userId: string): Promise<CompanyStatus | null>;
  resubmit(userId: string, data: CompanyData): Promise<boolean>;
}
