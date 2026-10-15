import type { Request, Response } from 'express';
import { makeUpdateUserUseCase } from '../../../use-cases/factories/make-update-user-use-case.js';
import { idSchema, replaceSchema, updateSchema } from './schemas.js';
export async function updateUser(request: Request, response: Response) {
  const data = {
    ...idSchema.parse(request.params),
    ...(request.method === 'PUT' ? replaceSchema : updateSchema).parse(
      request.body,
    ),
  };
  const result = await makeUpdateUserUseCase().execute(data);
  response.status(200).json(result);
}
