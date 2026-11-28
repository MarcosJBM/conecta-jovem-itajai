import { Router } from 'express';
import { requireSession } from '../../middlewares/auth.js';
import { PrismaJobApplicationsRepository } from '../../../repositories/prisma/prisma-job-applications-repository.js';
import { FetchYouthApplicationsUseCase } from '../../../use-cases/fetch-youth-applications.js';
import { paginationSchema } from '../users/schemas.js';

export const youthApplicationsRoutes = Router();
youthApplicationsRoutes.use(requireSession);
youthApplicationsRoutes.get('/', async (request, response) => {
  const useCase = new FetchYouthApplicationsUseCase(
    new PrismaJobApplicationsRepository(),
  );
  response.json(
    await useCase.execute(request.auth!, paginationSchema.parse(request.query)),
  );
});
