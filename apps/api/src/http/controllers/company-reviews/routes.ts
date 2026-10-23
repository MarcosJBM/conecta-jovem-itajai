import { Router } from 'express';
import { z } from 'zod';
import {
  requireSession,
  requireAdmin,
  requireSameOriginWrite,
} from '../../middlewares/auth.js';
import { paginationSchema, idSchema } from '../users/schemas.js';
import { makeFetchCompanyReviewsUseCase } from '../../../use-cases/factories/make-fetch-company-reviews.js';
import { makeGetCompanyReviewUseCase } from '../../../use-cases/factories/make-get-company-review.js';
import { makeDecideCompanyReviewUseCase } from '../../../use-cases/factories/make-decide-company-review.js';
const decisionSchema = z.discriminatedUnion('status', [
  z.strictObject({ status: z.literal('APPROVED') }),
  z.strictObject({
    status: z.literal('REJECTED'),
    reason: z.string().trim().min(1, 'Informe a justificativa.').max(2000),
  }),
]);
export const companyReviewRoutes = Router();
companyReviewRoutes.use(requireSession, requireAdmin);
companyReviewRoutes.get('/', async (request, response) => {
  response.json(
    await makeFetchCompanyReviewsUseCase().execute(
      request.auth!,
      paginationSchema.parse(request.query),
    ),
  );
});
companyReviewRoutes.get('/:id', async (request, response) => {
  response.json(
    await makeGetCompanyReviewUseCase().execute(
      request.auth!,
      idSchema.parse(request.params).id,
    ),
  );
});
companyReviewRoutes.post(
  '/:id/decision',
  requireSameOriginWrite,
  async (request, response) => {
    response.json(
      await makeDecideCompanyReviewUseCase().execute(
        request.auth!,
        idSchema.parse(request.params).id,
        decisionSchema.parse(request.body),
      ),
    );
  },
);
