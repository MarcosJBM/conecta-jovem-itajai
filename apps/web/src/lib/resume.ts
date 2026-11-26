export type Education = {
  institution: string;
  course: string;
  level: string;
  startMonth: string;
  endMonth: string | null;
  inProgress: boolean;
};
export type Experience = {
  title: string;
  organization: string;
  startMonth: string;
  endMonth: string | null;
  isCurrent: boolean;
  description: string | null;
};
export type ResumeResult = {
  resume: {
    personalDetails: {
      firstName: string | null;
      lastName: string | null;
      city: string | null;
      state: string | null;
      phone: string | null;
    };
    skills: string[];
    educations: Education[];
    experiences: Experience[];
  };
  completeness: { complete: boolean; missingFields: string[] };
  updatedAt: string | null;
};
