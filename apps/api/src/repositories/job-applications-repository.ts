import type { ApplicationStatus } from '../domain/job-application.js';
import type { Pagination } from '../domain/types/pagination.js';

export interface ApplicationReceipt {
  id: string;
  submittedAt: Date;
}

export type SubmitApplicationResult =
  | { outcome: 'submitted'; application: ApplicationReceipt }
  | {
      outcome:
        'job-not-found' | 'job-unavailable' | 'resume-incomplete' | 'duplicate';
    };

export interface JobApplicationsRepository {
  findByJobAndUser(
    jobId: string,
    userId: string,
  ): Promise<ApplicationReceipt | null>;
  submit(
    jobId: string,
    userId: string,
    clock: () => Date,
  ): Promise<SubmitApplicationResult>;
}

type SubmittedResume = ApplicationReceipt & { resumeSnapshot: unknown };

export interface CompanyApplicationsRepository {
  findCompanyApplications(
    companyId: string,
    jobId: string,
    pagination: Pagination,
  ): Promise<{ items: SubmittedResume[]; total: number }>;
  findCompanyApplication(
    companyId: string,
    jobId: string,
    id: string,
  ): Promise<(SubmittedResume & { status: ApplicationStatus }) | null>;
  changeStatus(
    companyId: string,
    jobId: string,
    id: string,
    previousStatus: ApplicationStatus,
    newStatus: ApplicationStatus,
  ): Promise<boolean>;
}
