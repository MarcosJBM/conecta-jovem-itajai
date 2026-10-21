import { Router } from 'express';
import { z } from 'zod';
import {
  requireSession,
  requireSameOriginWrite,
} from '../../middlewares/auth.js';
import { idSchema, paginationSchema } from '../users/schemas.js';
import { jobSchema } from './schemas.js';
import { makeCreateJobUseCase } from '../../../use-cases/factories/make-create-job.js';
import { makeGetJobUseCase } from '../../../use-cases/factories/make-get-job.js';
import { makeFetchJobsUseCase } from '../../../use-cases/factories/make-fetch-jobs.js';
import { makeUpdateJobUseCase } from '../../../use-cases/factories/make-update-job.js';
import { makeCloseJobUseCase } from '../../../use-cases/factories/make-close-job.js';
import { makeFetchJobOptionsUseCase } from '../../../use-cases/factories/make-fetch-job-options.js';
export const jobsRoutes = Router();
jobsRoutes.use(requireSession);
jobsRoutes.get('/options', async (request, response) =>
  response.json(await makeFetchJobOptionsUseCase().execute(request.auth!)),
);
jobsRoutes.get('/', async (request, response) =>
  response.json(
    await makeFetchJobsUseCase().execute(
      request.auth!,
      paginationSchema.parse(request.query),
    ),
  ),
);
jobsRoutes.get('/:id', async (request, response) =>
  response.json(
    await makeGetJobUseCase().execute(
      request.auth!,
      idSchema.parse(request.params).id,
    ),
  ),
);
jobsRoutes.post('/', requireSameOriginWrite, async (request, response) =>
  response
    .status(201)
    .json(
      await makeCreateJobUseCase().execute(
        request.auth!,
        jobSchema.parse(request.body),
      ),
    ),
);
jobsRoutes.put('/:id', requireSameOriginWrite, async (request, response) =>
  response.json(
    await makeUpdateJobUseCase().execute(
      request.auth!,
      idSchema.parse(request.params).id,
      jobSchema.parse(request.body),
    ),
  ),
);
jobsRoutes.post(
  '/:id/close',
  requireSameOriginWrite,
  async (request, response) => {
    z.strictObject({}).parse(request.body ?? {});
    response.json(
      await makeCloseJobUseCase().execute(
        request.auth!,
        idSchema.parse(request.params).id,
      ),
    );
  },
);
