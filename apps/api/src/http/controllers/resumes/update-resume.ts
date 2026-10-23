import type { Request, Response } from 'express';
import { makeUpdateResumeUseCase } from '../../../use-cases/factories/make-update-resume.js';
import { resumeSchema } from './schemas.js';
export async function updateResume(request: Request, response: Response) {
  response.json(
    await makeUpdateResumeUseCase().execute(
      request.auth!,
      resumeSchema.parse(request.body),
    ),
  );
}
