import type { ResumeData } from '../../domain/entities/resume.js';
import type { ResumeRecord, ResumesRepository } from '../resumes-repository.js';
import { getDatabaseClient } from '../../libs/prisma.js';
import { env } from '../../env.js';

const include = {
  resume: { include: { skills: true, educations: true, experiences: true } },
} as const;
function loadProfile(
  prisma: Pick<ReturnType<typeof getDatabaseClient>, 'youthProfile'>,
  userId: string,
) {
  return prisma.youthProfile.findUnique({ where: { userId }, include });
}

function record(
  profile: NonNullable<Awaited<ReturnType<typeof loadProfile>>>,
): ResumeRecord {
  const { resume, ...personal } = profile;
  return {
    profile: personal,
    resume: resume
      ? { ...resume, skills: resume.skills.map((skill) => skill.name) }
      : null,
  };
}
export async function findResumeByUser(
  prisma: Pick<ReturnType<typeof getDatabaseClient>, 'youthProfile'>,
  userId: string,
) {
  const profile = await loadProfile(prisma, userId);
  return profile ? record(profile) : null;
}

export class PrismaResumesRepository implements ResumesRepository {
  constructor(private prisma = getDatabaseClient()) {}

  findByUser(userId: string) {
    return findResumeByUser(this.prisma, userId);
  }
  async save(userId: string, data: ResumeData) {
    return this.prisma.$transaction(async (tx) => {
      // Serialize replacement of all collections, including the first save.
      const schema = (
        new URL(env.databaseUrl).searchParams.get('schema') ?? 'public'
      ).replaceAll('"', '""');
      const profiles = await tx.$queryRawUnsafe<{ id: string }[]>(
        `SELECT id FROM "${schema}"."youth_profiles" WHERE user_id = $1::uuid FOR UPDATE`,
        userId,
      );
      const profile = profiles[0];
      if (!profile) return null;
      const collections = {
        skills: { create: data.skills.map((name) => ({ name })) },
        educations: { create: data.educations },
        experiences: { create: data.experiences },
      };
      await tx.resume.upsert({
        where: { youthProfileId: profile.id },
        create: { youthProfileId: profile.id, ...collections },
        update: {
          skills: { deleteMany: {}, ...collections.skills },
          educations: { deleteMany: {}, ...collections.educations },
          experiences: { deleteMany: {}, ...collections.experiences },
          updatedAt: new Date(),
        },
      });
      const saved = await tx.youthProfile.findUniqueOrThrow({
        where: { id: profile.id },
        include,
      });
      return record(saved);
    });
  }
}
