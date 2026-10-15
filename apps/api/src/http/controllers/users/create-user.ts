import type { Request, Response } from 'express';
import { makeCreateUserUseCase } from '../../../use-cases/factories/make-create-user-use-case.js';
import { createSchema } from './schemas.js';

export async function createUser(request: Request, response: Response) {
  const data = createSchema.parse(request.body);

  const result = await makeCreateUserUseCase().execute(data);

  response.status(201).json(result);
}
