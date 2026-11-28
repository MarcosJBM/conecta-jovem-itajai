import type { ApplicationStatus } from '../../domain/job-application.js';
import type { Pagination } from '../../domain/types/pagination.js';
import { toResumeView } from '../../domain/entities/resume.js';
import { jobAvailability, type Job } from '../../domain/job.js';
import { getResumeCompleteness } from '../../domain/resume-completeness.js';
import { env } from '../../env.js';
import { getDatabaseClient } from '../../libs/prisma.js';
import type {
  CompanyApplicationsRepository,
  JobApplicationsRepository,
  SubmitApplicationResult,
} from '../job-applications-repository.js';
import { findResumeByUser } from './prisma-resumes-repository.js';

const receipt = { id: true, submittedAt: true } as const;

export class PrismaJobApplicationsRepository
  implements JobApplicationsRepository, CompanyApplicationsRepository
{
  constructor(private prisma = getDatabaseClient()) {}

  async findByJobAndUser(jobId: string, userId: string) {
    return this.prisma.jobApplication.findFirst({
      where: { jobId, youthProfile: { userId } },
      select: receipt,
    });
  }

  async findYouthApplications(userId: string, { page, pageSize }: Pagination) {
    const where = { youthProfile: { userId } };
    const event = {
      id: true,
      changedAt: true,
      previousStatus: true,
      newStatus: true,
    } as const;
    const orderBy = [{ changedAt: 'desc' }, { id: 'asc' }] as const;
    const [items, total, notifications] = await this.prisma.$transaction(
      [
        this.prisma.jobApplication.findMany({
          where,
          select: {
            ...receipt,
            status: true,
            job: {
              select: {
                title: true,
                company: { select: { tradeName: true, legalName: true } },
              },
            },
            statusHistory: { select: event, orderBy: [...orderBy] },
          },
          orderBy: [{ submittedAt: 'desc' }, { id: 'asc' }],
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        this.prisma.jobApplication.count({ where }),
        this.prisma.jobApplicationStatusChange.findMany({
          where: { application: where },
          select: {
            ...event,
            application: { select: { job: { select: { title: true } } } },
          },
          orderBy: [...orderBy],
          take: 10,
        }),
      ],
      { isolationLevel: 'RepeatableRead' },
    );
    return {
      items: items.map(({ job, ...application }) => ({
        ...application,
        jobTitle: job.title,
        companyName:
          job.company.tradeName || job.company.legalName || 'Empresa',
      })),
      total,
      notifications: notifications.map(({ application, ...event }) => ({
        ...event,
        jobTitle: application.job.title,
      })),
    };
  }

  async findCompanyApplications(
    companyId: string,
    jobId: string,
    { page, pageSize }: Pagination,
  ) {
    const where = { jobId, job: { companyId } };
    const [items, total] = await this.prisma.$transaction(
      [
        this.prisma.jobApplication.findMany({
          where,
          select: { ...receipt, resumeSnapshot: true },
          orderBy: [{ submittedAt: 'desc' }, { id: 'asc' }],
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        this.prisma.jobApplication.count({ where }),
      ],
      { isolationLevel: 'RepeatableRead' },
    );
    return { items, total };
  }

  findCompanyApplication(companyId: string, jobId: string, id: string) {
    return this.prisma.jobApplication.findFirst({
      where: { id, jobId, job: { companyId } },
      select: { ...receipt, resumeSnapshot: true, status: true },
    });
  }

  async changeStatus(
    companyId: string,
    jobId: string,
    id: string,
    previousStatus: ApplicationStatus,
    newStatus: ApplicationStatus,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.jobApplication.updateMany({
        where: { id, jobId, job: { companyId }, status: previousStatus },
        data: { status: newStatus },
      });
      if (!updated.count) return false;
      await tx.jobApplicationStatusChange.create({
        data: { applicationId: id, companyId, previousStatus, newStatus },
      });
      return true;
    });
  }

  async submit(
    jobId: string,
    userId: string,
    clock: () => Date,
  ): Promise<SubmitApplicationResult> {
    const schema = (
      new URL(env.databaseUrl).searchParams.get('schema') ?? 'public'
    ).replaceAll('"', '""');
    return this.prisma.$transaction(async (tx) => {
      // Share locks permit parallel submissions while excluding changes to
      // the job and the resume replacement that locks the youth profile.
      const [job] = await tx.$queryRawUnsafe<
        Pick<Job, 'status' | 'deadline'>[]
      >(
        `SELECT status, deadline FROM "${schema}"."jobs" WHERE id = $1::uuid FOR SHARE`,
        jobId,
      );
      if (!job) return { outcome: 'job-not-found' };

      const [profile] = await tx.$queryRawUnsafe<{ id: string }[]>(
        `SELECT id FROM "${schema}"."youth_profiles" WHERE user_id = $1::uuid FOR SHARE`,
        userId,
      );
      const record = profile ? await findResumeByUser(tx, userId) : null;
      const submittedAt = clock();
      if (jobAvailability(job, submittedAt) !== 'OPEN')
        return { outcome: 'job-unavailable' };
      if (
        !profile ||
        !record?.resume ||
        !getResumeCompleteness(record.profile, record.resume).complete
      )
        return { outcome: 'resume-incomplete' };

      const [application] = await tx.jobApplication.createManyAndReturn({
        data: {
          jobId,
          youthProfileId: profile.id,
          submittedAt,
          resumeSnapshot: toResumeView(record.profile, record.resume),
        },
        skipDuplicates: true,
        select: receipt,
      });
      return application
        ? { outcome: 'submitted', application }
        : { outcome: 'duplicate' };
    });
  }
}
