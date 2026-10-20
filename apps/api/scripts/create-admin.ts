import '../src/env.js';
import { getDatabaseClient } from '../src/libs/prisma.js';
import { closeDatabaseConnection } from '@conecta/database';
import { BcryptPasswordHasher } from '../src/libs/password-hasher.js';
import {
  validatePassword,
  normalizeEmail,
} from '../src/use-cases/validate-user.js';

try {
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD)
    throw new Error(
      'Defina ADMIN_EMAIL e ADMIN_PASSWORD no ambiente para criar o administrador.',
    );
  const email = normalizeEmail(process.env.ADMIN_EMAIL);
  validatePassword(process.env.ADMIN_PASSWORD);
  const prisma = getDatabaseClient();
  if (await prisma.user.findUnique({ where: { email } }))
    throw new Error('E-mail já cadastrado. Nenhuma conta foi alterada.');
  await prisma.user.create({
    data: {
      email,
      passwordHash: await new BcryptPasswordHasher().hash(
        process.env.ADMIN_PASSWORD,
      ),
      role: 'ADMIN',
    },
  });
  console.log('Administrador criado.');
} catch (error) {
  console.error(
    error instanceof Error ? error.message : 'Falha ao criar administrador.',
  );
  process.exitCode = 1;
} finally {
  delete process.env.ADMIN_PASSWORD;
  await closeDatabaseConnection();
}
