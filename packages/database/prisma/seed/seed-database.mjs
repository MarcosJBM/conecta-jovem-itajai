import { hash } from 'bcryptjs';
import { buildSeedData, seedPassword } from './seed-data.mjs';

export function assertDevelopmentEnvironment(environment = process.env) {
  if (environment.NODE_ENV !== 'development') {
    throw new Error('O seed só pode executar com NODE_ENV=development.');
  }
  if (!environment.DATABASE_URL)
    throw new Error('Defina DATABASE_URL para o banco de desenvolvimento.');
  const url = new URL(environment.DATABASE_URL);
  if (
    !['postgres:', 'postgresql:'].includes(url.protocol) ||
    !['localhost', '127.0.0.1', '[::1]', 'postgres'].includes(url.hostname)
  ) {
    throw new Error('O seed exige um PostgreSQL local de desenvolvimento.');
  }
}

export async function seedDatabase(prisma) {
  const passwordHash = await hash(seedPassword, 12);
  return prisma.$transaction(
    async tx => {
      // Serialize simultaneous seed executions without locking normal application traffic.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(20261030, 1)::text`;
      const admins = await tx.user.findMany({
        where: { role: 'ADMIN' },
        select: { id: true },
      });
      if (admins.length !== 1)
        throw new Error(
          'O seed exige exatamente um ADMIN existente e não cria nem modifica administradores.',
        );
      const { youths, companies, jobs } = buildSeedData(
        passwordHash,
        admins[0].id,
      );
      for (const user of [...youths, ...companies]) {
        const existing = await tx.user.findUnique({
          where: { email: user.email },
        });
        if (
          existing &&
          (existing.id !== user.id || existing.role !== user.role)
        ) {
          throw new Error(
            `O e-mail reservado ${user.email} pertence a uma conta externa ao seed.`,
          );
        }
        await tx.user.upsert({
          where: { email: user.email },
          create: user,
          update: {},
        });
      }
      for (const job of jobs) {
        await tx.job.upsert({ where: { id: job.id }, create: job, update: {} });
      }
      return {
        youths: youths.length,
        companies: companies.length,
        jobs: jobs.length,
      };
    },
    { maxWait: 30_000, timeout: 60_000 },
  );
}
