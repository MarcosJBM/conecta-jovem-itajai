import { z } from 'zod';
import {
  applicationTransitions,
  type ApplicationStatus,
} from '../domain/job-application.js';
import { ConflictError } from './errors/conflict-error.js';
import type { AuthUser } from '../domain/types/auth.js';
import type { Pagination } from '../domain/types/pagination.js';
import type { JobsRepository } from '../repositories/jobs-repository.js';
import type { CompanyApplicationsRepository } from '../repositories/job-applications-repository.js';
import { ResourceNotFoundError } from './errors/resource-not-found.js';
import { requireCompanyAccess } from './require-company-access.js';
import { validatePagination } from './validate-pagination.js';

const snapshotName = z.object({
  personalDetails: z.object({ firstName: z.string(), lastName: z.string() }),
});

export class CompanyApplicationsUseCase {
  constructor(
    private jobs: JobsRepository,
    private applications: CompanyApplicationsRepository,
  ) {}

  async list(user: AuthUser, jobId: string, pagination: Pagination) {
    const company = await requireCompanyAccess(this.jobs, user);
    validatePagination(pagination);
    if (!(await this.jobs.findById(company.id, jobId)))
      throw new ResourceNotFoundError('Vaga não encontrada.');
    const { items, total } = await this.applications.findCompanyApplications(
      company.id,
      jobId,
      pagination,
    );
    return {
      items: items.map(({ resumeSnapshot, ...receipt }) => {
        const name =
          snapshotName.safeParse(resumeSnapshot).data?.personalDetails;
        return {
          ...receipt,
          candidateName: name
            ? `${name.firstName} ${name.lastName}`
            : 'Candidato',
        };
      }),
      total,
      ...pagination,
      totalPages: Math.ceil(total / pagination.pageSize),
    };
  }

  async get(user: AuthUser, jobId: string, id: string) {
    const company = await requireCompanyAccess(this.jobs, user);
    const application = await this.applications.findCompanyApplication(
      company.id,
      jobId,
      id,
    );
    if (!application)
      throw new ResourceNotFoundError('Candidatura não encontrada.');
    return {
      application: {
        ...application,
        nextStatuses: applicationTransitions[application.status],
      },
    };
  }

  async changeStatus(
    user: AuthUser,
    jobId: string,
    id: string,
    status: ApplicationStatus,
  ) {
    const company = await requireCompanyAccess(this.jobs, user);
    const application = await this.applications.findCompanyApplication(
      company.id,
      jobId,
      id,
    );
    if (!application)
      throw new ResourceNotFoundError('Candidatura não encontrada.');

    if (
      !applicationTransitions[application.status].includes(status) ||
      !(await this.applications.changeStatus(
        company.id,
        jobId,
        id,
        application.status,
        status,
      ))
    )
      throw new ConflictError('A mudança de status não é permitida.');
    return { status, nextStatuses: applicationTransitions[status] };
  }
}
