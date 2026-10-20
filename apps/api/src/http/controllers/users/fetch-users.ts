import type { Request, Response } from 'express';
import { makeFetchUsersUseCase } from '../../../use-cases/factories/make-fetch-users-use-case.js';
import { paginationSchema } from './schemas.js';
export async function fetchUsers(request: Request, response: Response) {
  const data = paginationSchema.parse(request.query);
  const result = await makeFetchUsersUseCase().execute(data);
  response.status(200).json(result);
}
