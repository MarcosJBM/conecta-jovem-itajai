import type { ResumeData } from './entities/resume.js';
import type { YouthProfile } from './entities/user.js';
import { requiredYouthFields } from './entities/user.js';

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
