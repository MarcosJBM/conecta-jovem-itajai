import express from 'express';
import { getDatabaseClient } from './libs/prisma.js';
import { usersRoutes } from './http/controllers/users/routes.js';
import { errorHandler } from './http/errors/error-handler.js';

export const app = express();

app.disable('x-powered-by');

app.use(express.json({ limit: '32kb' }));

app.get('/health', (_request, response) => {
  response.status(200).json({ status: 'ok' });
});
app.get('/health/database', async (_request, response) => {
  try {
    await getDatabaseClient().$queryRaw`SELECT 1`;
    response.status(200).json({ status: 'ok', database: 'connected' });
  } catch (error) {
    console.error('Falha ao conectar ao PostgreSQL:', error);
    response.status(503).json({ status: 'error', database: 'unavailable' });
  }
});

app.use('/users', usersRoutes);

app.use((_request, response) => {
  response.status(404).json({ message: 'Rota não encontrada.' });
});

app.use(errorHandler);
