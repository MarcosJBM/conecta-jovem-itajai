import { randomUUID } from 'node:crypto';
import type { ResumeData } from '../../domain/entities/resume.js';
import type { YouthProfile } from '../../domain/entities/user.js';
import type { ResumeRecord, ResumesRepository } from '../resumes-repository.js';

export class InMemoryResumesRepository implements ResumesRepository {
  private records = new Map<string, ResumeRecord>();
  constructor(profiles: YouthProfile[] = []) {
    for (const profile of profiles)
      this.records.set(
        profile.userId,
        structuredClone({ profile, resume: null }),
      );
  }
  async findByUser(userId: string) {
    return structuredClone(this.records.get(userId) ?? null);
  }
  async save(userId: string, data: ResumeData) {
    const record = this.records.get(userId);
    if (!record) return null;
    const now = new Date();
    record.resume = {
      ...structuredClone(data),
      id: record.resume?.id ?? randomUUID(),
      youthProfileId: record.profile.id,
      createdAt: record.resume?.createdAt ?? now,
      updatedAt: now,
    };
    return structuredClone(record);
  }
}
