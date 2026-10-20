import { expect, it } from 'vitest';
import { CompanyStatusUseCase } from './company-status.js';
import type { CompanyStatus } from '../domain/types/company-status.js';
import { ForbiddenError } from './errors/forbidden-error.js';
import { ConflictError } from './errors/conflict-error.js';

it('restricts company status to its owner role and resubmission to rejected profiles', async () => {
  let company: CompanyStatus = {
    id: 'company',
    validation: { status: 'PENDING', rejectionReason: null },
  };
  let writes = 0;
  const useCase = new CompanyStatusUseCase({
    findByUser: async () => structuredClone(company),
    resubmit: async (_id, data) => {
      writes++;
      company = {
        ...company,
        ...data,
        validation: { status: 'PENDING', rejectionReason: null },
      };
      return true;
    },
  });
  const user = {
    id: 'owner',
    email: 'company@example.com',
    role: 'COMPANY' as const,
  };
  const data = {
    cnpj: '12ABC34501DE35',
    legalName: 'Empresa',
    city: 'Itajaí',
    state: 'SC',
    contactName: 'Ana',
    contactRole: 'RH',
    phone: '47999991234',
  };
  await expect(useCase.get({ ...user, role: 'YOUTH' })).rejects.toBeInstanceOf(
    ForbiddenError,
  );
  await expect(useCase.resubmit(user, data)).rejects.toBeInstanceOf(
    ConflictError,
  );
  expect(writes).toBe(0);
  company.validation = {
    status: 'REJECTED',
    rejectionReason: 'Corrigir dados.',
  };
  expect((await useCase.resubmit(user, data)).company.validation?.status).toBe(
    'PENDING',
  );
  expect(writes).toBe(1);
});
