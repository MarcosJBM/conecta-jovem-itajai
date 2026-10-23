import { hash } from 'bcryptjs';
import request from 'supertest';
import type { Express } from 'express';
import type { AuthUser } from '../../domain/types/auth.js';
import { getDatabaseClient } from '../../libs/prisma.js';
import { normalizeYouth } from '../../use-cases/validate-youth.js';
import { testCpf, userInput } from './user-fixture.js';

export async function account(role: AuthUser['role'], seed = 1) {
  const password = 'abcdef';
  const user = await getDatabaseClient().user.create({
    data: {
      email: `${role.toLowerCase()}-${seed}@example.com`,
      passwordHash: await hash(password, 4),
      role,
      ...(role === 'YOUTH'
        ? {
            youthProfile: {
              create: normalizeYouth(
                { ...userInput.youthProfile, cpf: testCpf(seed) },
                true,
              ),
            },
          }
        : {}),
      ...(role === 'COMPANY'
        ? {
            companyProfile: {
              create: {
                legalName: `Empresa ${seed}`,
                cnpj: String(seed).padStart(14, '0'),
                city: 'Itajaí',
                state: 'SC',
                contactName: 'Ana',
                contactRole: 'RH',
                phone: '47999991234',
                validation: { create: {} },
              },
            },
          }
        : {}),
    },
    include: { youthProfile: true, companyProfile: true },
  });
  return { ...user, password };
}
export async function session(
  app: Express,
  user: { email: string; password: string },
) {
  const agent = request.agent(app);
  const result = await agent
    .post('/auth/login')
    .set('X-Requested-With', 'Conecta')
    .send({ email: user.email, password: user.password });
  if (result.status !== 200)
    throw new Error(`Fixture login failed: ${result.status}`);
  return agent;
}
