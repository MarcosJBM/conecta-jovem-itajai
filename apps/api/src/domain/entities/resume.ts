import type { YouthProfile } from './user.js';

// Monthly periods avoid inventing a day or shifting dates between time zones.
export interface EducationData {
  institution: string;
  course: string;
  level: string;
  startMonth: string;
  endMonth: string | null;
  inProgress: boolean;
}

export interface ExperienceData {
  title: string;
  organization: string;
  startMonth: string;
  endMonth: string | null;
  isCurrent: boolean;
  description: string | null;
}

export interface ResumeData {
  skills: string[];
  educations: EducationData[];
  experiences: ExperienceData[];
}

export interface Resume extends ResumeData {
  id: string;
  youthProfileId: string;
  createdAt: Date;
  updatedAt: Date;
}

export function toResumeView(profile: YouthProfile, resume: ResumeData) {
  // Explicit projection: never spread the registration/profile into a resume.
  return {
    personalDetails: {
      firstName: profile.firstName,
      lastName: profile.lastName,
      city: profile.city,
      state: profile.state,
      phone: profile.phone,
    },
    skills: [...resume.skills],
    educations: resume.educations.map(
      ({ institution, course, level, startMonth, endMonth, inProgress }) => ({
        institution,
        course,
        level,
        startMonth,
        endMonth,
        inProgress,
      }),
    ),
    experiences: resume.experiences.map(
      ({
        title,
        organization,
        startMonth,
        endMonth,
        isCurrent,
        description,
      }) => ({
        title,
        organization,
        startMonth,
        endMonth,
        isCurrent,
        description,
      }),
    ),
  };
}
