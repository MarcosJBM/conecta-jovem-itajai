import { Router } from 'express';
import { z } from 'zod';
import { paginationSchema } from '../users/schemas.js';
import { makeCompanyApplicationsUseCase } from '../../../use-cases/factories/make-company-applications.js';

const jobParams = z.object({ jobId: z.uuid() });
const applicationParams = jobParams.extend({ applicationId: z.uuid() });

export const companyApplicationsRoutes = Router({ mergeParams: true });

companyApplicationsRoutes.get('/', async (request, response) => {
  const { jobId } = jobParams.parse(request.params);
  response.json(
    await makeCompanyApplicationsUseCase().list(
      request.auth!,
      jobId,
      paginationSchema.parse(request.query),
    ),
  );
});

companyApplicationsRoutes.get('/:applicationId', async (request, response) => {
  const { jobId, applicationId } = applicationParams.parse(request.params);
  response.json(
    await makeCompanyApplicationsUseCase().get(
      request.auth!,
      jobId,
      applicationId,
    ),
  );
});
