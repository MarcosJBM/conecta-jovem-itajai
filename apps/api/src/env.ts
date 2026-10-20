import { config } from 'dotenv';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

config({
  path: resolve(fileURLToPath(new URL('.', import.meta.url)), '../../../.env'),
  quiet: true,
});

export const environmentSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(3333),
  DATABASE_URL: z
    .url()
    .refine(
      (value) => ['postgres:', 'postgresql:'].includes(new URL(value).protocol),
      'DATABASE_URL deve apontar para PostgreSQL.',
    ),
});

const result = environmentSchema.safeParse(process.env);

if (!result.success)
  throw new Error(
    `Variáveis de ambiente inválidas: ${result.error.issues.map((issue) => issue.path.join('.') + ': ' + issue.message).join('; ')}`,
  );

export const env = {
  port: result.data.API_PORT,
  trustProxyHops: result.data.TRUST_PROXY_HOPS,
  nodeEnv: result.data.NODE_ENV,
  databaseUrl: result.data.DATABASE_URL,
};
