import type { AuthUser } from '../domain/types/auth.js';
import type { ResumesRepository } from '../repositories/resumes-repository.js';
import { ForbiddenError } from './errors/forbidden-error.js';
import { ResourceNotFoundError } from './errors/resource-not-found.js';
import { presentResume } from './present-resume.js';

export class GetResumeUseCase {
  constructor(private resumes: ResumesRepository) {}
  async execute(user: AuthUser) {
    if (user.role !== 'YOUTH') throw new ForbiddenError();
    const record = await this.resumes.findByUser(user.id);
    if (!record) throw new ResourceNotFoundError();
    return presentResume(record);
  }
}
