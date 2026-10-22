import type { ResumeData } from '../domain/entities/resume.js';
import type { YouthProfile } from '../domain/entities/user.js';
import { requiredYouthFields } from '../domain/entities/user.js';

export function getResumeCompleteness(
  profile: YouthProfile | null,
  resume: Pick<ResumeData, 'skills'> | null,
) {
  const missingFields: string[] = requiredYouthFields.filter((key) => {
    const value = profile?.[key];
    return value instanceof Date
      ? Number.isNaN(value.getTime())
      : typeof value !== 'string' || !value.trim();
  });

  if (!resume) missingFields.push('resume');
  if (!resume?.skills.some((skill) => skill.trim()))
    missingFields.push('skills');

  return { complete: missingFields.length === 0, missingFields };
}
