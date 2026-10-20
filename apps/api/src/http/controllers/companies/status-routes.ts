import { Router } from 'express';
import {
  requireSession,
  requireSameOriginWrite,
} from '../../middlewares/auth.js';
import { makeCompanyStatusUseCase } from '../../../use-cases/factories/make-company-status.js';
import { companyDataSchema } from './schema.js';
export const companyStatusRoutes = Router();
companyStatusRoutes.use(requireSession);
companyStatusRoutes.get('/me', async (request, response) =>
  response.json(await makeCompanyStatusUseCase().get(request.auth!)),
);
companyStatusRoutes.post(
  '/me/resubmit',
  requireSameOriginWrite,
  async (request, response) => {
    const data = companyDataSchema.parse(request.body);
    response.json(
      await makeCompanyStatusUseCase().resubmit(request.auth!, data),
    );
  },
);
