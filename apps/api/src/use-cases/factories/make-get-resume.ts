import { PrismaResumesRepository } from '../../repositories/prisma/prisma-resumes-repository.js';
import { GetResumeUseCase } from '../get-resume.js';
export const makeGetResumeUseCase = () =>
  new GetResumeUseCase(new PrismaResumesRepository());
