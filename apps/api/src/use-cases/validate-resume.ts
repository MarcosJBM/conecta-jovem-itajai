import type {
  EducationData,
  ExperienceData,
  ResumeData,
} from '../domain/entities/resume.js';
import { ValidationError } from './errors/validation-error.js';

function text(value: string, field: string, maxLength: number) {
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength)
    throw new ValidationError(`${field}: informe até ${maxLength} caracteres.`);
  return normalized;
}

function period(startMonth: string, endMonth: string | null, ongoing: boolean) {
  const isMonth = (value: string) =>
    /^(?!0000)\d{4}-(0[1-9]|1[0-2])$/.test(value);

  if (!isMonth(startMonth))
    throw new ValidationError(
      'Início: informe um mês válido no formato YYYY-MM.',
    );
  if (ongoing) {
    if (endMonth !== null)
      throw new ValidationError('Atividade em andamento não deve ter término.');
  } else if (endMonth === null || !isMonth(endMonth) || endMonth < startMonth) {
    throw new ValidationError(
      'Término: informe um mês válido a partir do início.',
    );
  }

  return { startMonth, endMonth };
}

function education(data: EducationData): EducationData {
  return {
    institution: text(data.institution, 'Instituição', 200),
    course: text(data.course, 'Curso', 200),
    level: text(data.level, 'Nível de formação', 100),
    ...period(data.startMonth, data.endMonth, data.inProgress),
    inProgress: data.inProgress,
  };
}

function experience(data: ExperienceData): ExperienceData {
  return {
    title: text(data.title, 'Cargo', 150),
    organization: text(data.organization, 'Organização', 200),
    ...period(data.startMonth, data.endMonth, data.isCurrent),
    isCurrent: data.isCurrent,
    description: data.description?.trim()
      ? text(data.description, 'Descrição', 2000)
      : null,
  };
}

// Empty collections are valid drafts; completeness is a separate rule.
export function normalizeResume(data: ResumeData): ResumeData {
  const skills = data.skills.map((skill) => text(skill, 'Habilidade', 100));
  const names = skills.map((skill) => skill.toLocaleLowerCase('pt-BR'));
  if (new Set(names).size !== names.length)
    throw new ValidationError('Não repita a mesma habilidade.');

  return {
    skills,
    educations: data.educations.map(education),
    experiences: data.experiences.map(experience),
  };
}
