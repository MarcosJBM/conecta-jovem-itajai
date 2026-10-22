import { toResumeView } from '../domain/entities/resume.js';
import type { ResumeRecord } from '../repositories/resumes-repository.js';
import { getResumeCompleteness } from './get-resume-completeness.js';

export function presentResume({ profile, resume }: ResumeRecord) {
  return {
    resume: toResumeView(
      profile,
      resume ?? { skills: [], educations: [], experiences: [] },
    ),
    completeness: getResumeCompleteness(profile, resume),
    updatedAt: resume?.updatedAt ?? null,
  };
}
