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
