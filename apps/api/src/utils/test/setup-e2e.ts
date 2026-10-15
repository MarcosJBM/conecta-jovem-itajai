import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { beforeAll, afterAll, beforeEach } from 'vitest';
import { closeDatabaseConnection, getPrismaClient } from '@conecta/database';

config({
  path: fileURLToPath(new URL('../../../../../.env', import.meta.url)),
  quiet: true,
});

if (!process.env.TEST_DATABASE_URL)
  throw new Error(
    'Defina TEST_DATABASE_URL para executar E2E. Um schema exclusivo será criado e removido nesse banco.',
  );

const url = new URL(process.env.TEST_DATABASE_URL);

if (!['postgres:', 'postgresql:'].includes(url.protocol))
  throw new Error('TEST_DATABASE_URL deve apontar para PostgreSQL.');

const schema = `test_${randomUUID().replaceAll('-', '')}`;

url.searchParams.set('schema', schema);

process.env.DATABASE_URL = url.toString();
process.env.NODE_ENV = 'test';

async function cleanup() {
  const prisma = getPrismaClient(url.toString());
  try {
    await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  } finally {
    await closeDatabaseConnection();
  }
}

beforeAll(async () => {
  try {
    execFileSync(
      'pnpm',
      ['--filter', '@conecta/database', 'db:migrate:deploy'],
      {
        cwd: fileURLToPath(new URL('../../../../../', import.meta.url)),
        env: process.env,
        stdio: 'pipe',
        timeout: 45000,
      },
    );

    await getPrismaClient(url.toString()).$queryRaw`SELECT 1`;
  } catch (error) {
    await cleanup();
    throw error;
  }
});

beforeEach(async () => {
  await getPrismaClient(url.toString()).user.deleteMany();
});

afterAll(cleanup);
