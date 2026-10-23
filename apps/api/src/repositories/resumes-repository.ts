import type { Resume, ResumeData } from '../domain/entities/resume.js';
import type { YouthProfile } from '../domain/entities/user.js';

export interface ResumeRecord {
  profile: YouthProfile;
  resume: Resume | null;
}
export interface ResumesRepository {
  findByUser(userId: string): Promise<ResumeRecord | null>;
  save(userId: string, data: ResumeData): Promise<ResumeRecord | null>;
}
