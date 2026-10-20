import type { CompanyData } from '../company.js';
export interface CompanyStatus extends Partial<CompanyData> {
  id: string;
  validation: {
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    rejectionReason: string | null;
  } | null;
}
