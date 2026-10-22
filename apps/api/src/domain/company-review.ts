export type ReviewDecision = {
  status: 'APPROVED' | 'REJECTED';
  reason?: string;
};
export interface CompanyReview {
  id: string;
  companyId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason: string | null;
  reviewedById: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  company: {
    id: string;
    cnpj: string | null;
    legalName: string | null;
    tradeName: string | null;
    city: string | null;
    state: string | null;
    contactName: string | null;
    contactRole: string | null;
    phone: string | null;
    email: string;
  };
}
