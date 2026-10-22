import express from 'express';
import { companyStatusRoutes } from './http/controllers/companies/status-routes.js';
import { authRoutes } from './http/controllers/auth/routes.js';
import { env } from './env.js';
import { getDatabaseClient } from './libs/prisma.js';
import { usersRoutes } from './http/controllers/users/routes.js';
import { errorHandler } from './http/errors/error-handler.js';
import { resumeRoutes } from './http/controllers/resumes/routes.js';
import { companyReviewRoutes } from './http/controllers/company-reviews/routes.js';
import { jobsRoutes } from './http/controllers/jobs/routes.js';

import { registerCompanyController } from './http/controllers/companies/register-company.js';
import { makeRegisterCompanyUseCase } from './use-cases/factories/make-register-company.js';
import type { RegisterCompanyUseCase } from './use-cases/register-company.js';

export function createApp(
  makeRegisterCompany: () => RegisterCompanyUseCase = makeRegisterCompanyUseCase,
) {
  const app = express();

  app.disable('x-powered-by');
  if (env.trustProxyHops) app.set('trust proxy', env.trustProxyHops);
  app.use((request, response, next) => {
    if (env.nodeEnv === 'production' && !request.secure) {
      response.status(426).json({ message: 'HTTPS é obrigatório.' });
      return;
    }
    if (env.nodeEnv === 'production')
      response.set('Strict-Transport-Security', 'max-age=31536000');
    response.set('Cache-Control', 'no-store');
    response.set('X-Content-Type-Options', 'nosniff');
    next();
  });

  app.use(express.json({ limit: '256kb' }));
  app.use('/auth', authRoutes);

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
  app.post('/companies', registerCompanyController(makeRegisterCompany));
  app.use('/companies/me/jobs', jobsRoutes);
  app.use('/companies', companyStatusRoutes);
  app.use('/resumes', resumeRoutes);
  app.use('/admin/company-validations', companyReviewRoutes);

  app.use((_request, response) => {
    response.status(404).json({ message: 'Rota não encontrada.' });
  });

  app.use(errorHandler);

  return app;
}

export const app = createApp();
