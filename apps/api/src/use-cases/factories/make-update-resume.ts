import { PrismaResumesRepository } from '../../repositories/prisma/prisma-resumes-repository.js';
import { UpdateResumeUseCase } from '../update-resume.js';
export const makeUpdateResumeUseCase = () =>
  new UpdateResumeUseCase(new PrismaResumesRepository());
