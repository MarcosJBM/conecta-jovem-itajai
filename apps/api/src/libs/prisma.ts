import { getPrismaClient } from '@conecta/database';
import { env } from '../env.js';

export function getDatabaseClient() {
  return getPrismaClient(env.databaseUrl);
}
