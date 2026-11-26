import { Router } from 'express';
import { z } from 'zod';
import { requireSession } from '../../middlewares/auth.js';
import { idSchema, paginationSchema } from '../users/schemas.js';
import { jobAreas, jobContracts, workRegimes } from '../../../domain/job.js';
import { makeSearchPublicJobsUseCase } from '../../../use-cases/factories/make-search-public-jobs.js';
import { makeGetPublicJobUseCase } from '../../../use-cases/factories/make-get-public-job.js';

const searchSchema = paginationSchema.extend({
  keyword: z.string().trim().max(100).optional(),
  city: z.string().trim().max(100).optional(),
  area: z.enum(jobAreas).optional(),
  contract: z.enum(jobContracts).optional(),
  regime: z.enum(workRegimes).optional(),
});

export const publicJobsRoutes = Router();
publicJobsRoutes.use(requireSession);
publicJobsRoutes.get('/', async (request, response) => {
  const { page, pageSize, ...filters } = searchSchema.parse(request.query);
  response.json(
    await makeSearchPublicJobsUseCase().execute(request.auth!, filters, {
      page,
      pageSize,
    }),
  );
});

publicJobsRoutes.get('/:id', async (request, response) => {
  const { id } = idSchema.parse(request.params);
  response.json(await makeGetPublicJobUseCase().execute(request.auth!, id));
});
