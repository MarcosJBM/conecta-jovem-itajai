export interface CompanyData {
  cnpj: string;
  legalName: string;
  tradeName?: string;
  city: string;
  state: string;
  contactName: string;
  contactRole: string;
  phone: string;
}

export interface RegisterCompanyInput extends CompanyData {
  email: string;
  password: string;
}

export interface RegisteredCompany {
  id: string;
  userId: string;
  validation: { id: string; status: 'PENDING' };
}
