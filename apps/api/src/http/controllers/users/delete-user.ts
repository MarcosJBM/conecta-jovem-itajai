import type { Request, Response } from 'express';
import { makeDeleteUserUseCase } from '../../../use-cases/factories/make-delete-user-use-case.js';
import { idSchema } from './schemas.js';
export async function deleteUser(request: Request, response: Response) {
  const data = idSchema.parse(request.params);
  await makeDeleteUserUseCase().execute(data);
  response.status(204).send();
}
