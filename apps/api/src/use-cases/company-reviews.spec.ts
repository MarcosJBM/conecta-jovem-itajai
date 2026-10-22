import { expect, it } from 'vitest';
import type { CompanyReview } from '../domain/company-review.js';
import { InMemoryCompanyReviewsRepository } from '../repositories/in-memory/in-memory-company-reviews-repository.js';
import { FetchCompanyReviewsUseCase } from './fetch-company-reviews.js';
import { GetCompanyReviewUseCase } from './get-company-review.js';
import { DecideCompanyReviewUseCase } from './decide-company-review.js';

it('restricts admin actions, validates rejection and preserves the first decision', async () => {
  const record: CompanyReview = {
    id: 'review',
    companyId: 'company',
    status: 'PENDING',
    rejectionReason: null,
    reviewedById: null,
    reviewedAt: null,
    createdAt: new Date(),
    company: {
      id: 'company',
      cnpj: null,
      legalName: 'Empresa',
      tradeName: null,
      city: 'Itajaí',
      state: 'SC',
      contactName: 'Ana',
      contactRole: 'RH',
      phone: null,
      email: 'company@example.com',
    },
  };
  const repository = new InMemoryCompanyReviewsRepository([record]);
  const admin = {
    id: 'admin',
    email: 'admin@example.com',
    role: 'ADMIN' as const,
  };
  const list = new FetchCompanyReviewsUseCase(repository);
  const get = new GetCompanyReviewUseCase(repository);
  const decide = new DecideCompanyReviewUseCase(repository);
  expect((await list.execute(admin, { page: 1, pageSize: 1 })).total).toBe(1);
  await expect(list.execute(admin, { page: 0, pageSize: 1 })).rejects.toThrow(
    'Paginação',
  );
  await expect(
    decide.execute({ ...admin, role: 'YOUTH' }, record.id, {
      status: 'APPROVED',
    }),
  ).rejects.toThrow('permitida');
  await expect(
    decide.execute(admin, record.id, { status: 'REJECTED', reason: ' ' }),
  ).rejects.toThrow('justificativa');
  await expect(get.execute(admin, 'absent')).rejects.toThrow('encontrado');
  await decide.execute(admin, record.id, {
    status: 'REJECTED',
    reason: ' Corrigir dados. ',
  });
  await expect(
    decide.execute(admin, record.id, { status: 'APPROVED' }),
  ).rejects.toThrow('analisada');
  const saved = (await get.execute(admin, record.id)).review;
  expect(saved.rejectionReason).toBe('Corrigir dados.');
  expect(saved.reviewedById).toBe(admin.id);
  saved.company.legalName = 'Mutation';
  expect((await get.execute(admin, record.id)).review.company.legalName).toBe(
    'Empresa',
  );
  expect((await list.execute(admin, { page: 1, pageSize: 1 })).total).toBe(0);
});
