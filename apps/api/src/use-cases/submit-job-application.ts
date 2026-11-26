import type { AuthUser } from '../domain/types/auth.js';
import type { JobApplicationsRepository } from '../repositories/job-applications-repository.js';
import { ConflictError } from './errors/conflict-error.js';
import { ForbiddenError } from './errors/forbidden-error.js';
import { ResourceNotFoundError } from './errors/resource-not-found.js';
import { ValidationError } from './errors/validation-error.js';

export class SubmitJobApplicationUseCase {
  constructor(
    private applications: JobApplicationsRepository,
    private clock = () => new Date(),
  ) {}

  async execute(user: AuthUser, jobId: string) {
    if (user.role !== 'YOUTH') throw new ForbiddenError();
    const result = await this.applications.submit(jobId, user.id, this.clock);
    switch (result.outcome) {
      case 'submitted':
        return { application: result.application };
      case 'job-not-found':
        throw new ResourceNotFoundError('Vaga não encontrada.');
      case 'job-unavailable':
        throw new ConflictError('Esta vaga não está aberta para candidaturas.');
      case 'resume-incomplete':
        throw new ValidationError(
          'Complete os dados obrigatórios do cadastro e salve pelo menos uma habilidade no currículo para se candidatar.',
        );
      case 'duplicate':
        throw new ConflictError('Você já se candidatou a esta vaga.');
    }
  }
}
