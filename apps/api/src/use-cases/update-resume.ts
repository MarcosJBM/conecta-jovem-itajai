import type { ResumeData } from '../domain/entities/resume.js';
import type { AuthUser } from '../domain/types/auth.js';
import type { ResumesRepository } from '../repositories/resumes-repository.js';
import { ForbiddenError } from './errors/forbidden-error.js';
import { ResourceNotFoundError } from './errors/resource-not-found.js';
import { normalizeResume } from './validate-resume.js';
import { presentResume } from './present-resume.js';

export class UpdateResumeUseCase {
  constructor(private resumes: ResumesRepository) {}
  async execute(user: AuthUser, data: ResumeData) {
    if (user.role !== 'YOUTH') throw new ForbiddenError();
    const normalized = normalizeResume(data);
    const record = await this.resumes.save(user.id, normalized);
    if (!record) throw new ResourceNotFoundError();
    return presentResume(record);
  }
}
