import type { CompanyData, RegisteredCompany } from '../domain/company.js';

export interface CreateCompanyData extends CompanyData {
  email: string;
  passwordHash: string;
}

export interface CompaniesRepository {
  findConflict(email: string, cnpj: string): Promise<'email' | 'cnpj' | null>;
  create(data: CreateCompanyData): Promise<RegisteredCompany>;
}
