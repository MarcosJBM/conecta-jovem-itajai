import type { Request, Response } from 'express';
import { makeGetResumeUseCase } from '../../../use-cases/factories/make-get-resume.js';
export async function getResume(request: Request, response: Response) {
  response.json(await makeGetResumeUseCase().execute(request.auth!));
}
