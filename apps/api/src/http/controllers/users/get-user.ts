import type { Request, Response } from 'express';
import { makeGetUserUseCase } from '../../../use-cases/factories/make-get-user-use-case.js';
import { idSchema } from './schemas.js';
export async function getUser(request: Request, response: Response) {
  const data = idSchema.parse(request.params);
  const result = await makeGetUserUseCase().execute(data);
  response.status(200).json(result);
}
