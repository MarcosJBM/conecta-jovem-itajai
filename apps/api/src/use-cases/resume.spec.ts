import { describe, expect, it } from 'vitest';
import type { ResumeData } from '../domain/entities/resume.js';
import { toResumeView } from '../domain/entities/resume.js';
import type { YouthProfile } from '../domain/entities/user.js';
import { requiredYouthFields } from '../domain/entities/user.js';
import { userInput } from '../utils/test/user-fixture.js';
import { getResumeCompleteness } from './get-resume-completeness.js';
import { normalizeResume } from './validate-resume.js';
import { normalizeYouth } from './validate-youth.js';
import { ValidationError } from './errors/validation-error.js';

function profile(): YouthProfile {
  return {
    ...normalizeYouth(userInput.youthProfile, true),
    id: 'profile-id',
    userId: 'user-id',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function draft(): ResumeData {
  return { skills: [], educations: [], experiences: [] };
}

const education = {
  institution: ' Escola técnica ',
  course: ' Informática ',
  level: ' Técnico ',
  startMonth: '2025-02',
  endMonth: null,
  inProgress: true,
};
const experience = {
  title: ' Aprendiz ',
  organization: ' Empresa ',
  startMonth: '2025-01',
  endMonth: '2025-12',
  isCurrent: false,
  description: ' Apoio à equipe. ',
};

describe('resume completeness', () => {
  it('allows saving an empty draft without declaring it complete', () => {
    const data = normalizeResume(draft());
    expect(data).toEqual(draft());
    expect(getResumeCompleteness(profile(), data)).toEqual({
      complete: false,
      missingFields: ['skills'],
    });
  });

  it('requires one skill but no education or experience', () => {
    const youth = { ...profile(), complement: null };
    expect(
      getResumeCompleteness(youth, { ...draft(), skills: ['Comunicação'] }),
    ).toEqual({ complete: true, missingFields: [] });
    expect(getResumeCompleteness(youth, { skills: [' ', '\t'] }).complete).toBe(
      false,
    );
  });

  it.each(requiredYouthFields)(
    'reports missing registration field %s',
    (key) => {
      const youth = { ...profile(), [key]: null };
      expect(getResumeCompleteness(youth, { skills: ['Comunicação'] })).toEqual(
        {
          complete: false,
          missingFields: [key],
        },
      );
    },
  );

  it('handles legacy/missing profiles, whitespace and invalid dates', () => {
    expect(getResumeCompleteness(null, null)).toEqual({
      complete: false,
      missingFields: [...requiredYouthFields, 'resume', 'skills'],
    });
    expect(
      getResumeCompleteness(
        { ...profile(), firstName: ' ', birthDate: new Date('invalid') },
        { skills: ['Comunicação'] },
      ).missingFields,
    ).toEqual(['firstName', 'birthDate']);
  });
});

describe('resume validation', () => {
  it('normalizes entries without changing the caller data', () => {
    const data = {
      skills: [' Comunicação '],
      educations: [education],
      experiences: [experience],
    };
    const before = structuredClone(data);
    expect(normalizeResume(data)).toEqual({
      skills: ['Comunicação'],
      educations: [
        {
          ...education,
          institution: 'Escola técnica',
          course: 'Informática',
          level: 'Técnico',
        },
      ],
      experiences: [
        {
          ...experience,
          title: 'Aprendiz',
          organization: 'Empresa',
          description: 'Apoio à equipe.',
        },
      ],
    });
    expect(data).toEqual(before);
  });

  it.each(['', ' \t ', 'a'.repeat(101)])(
    'rejects invalid skill %j',
    (skill) => {
      expect(() => normalizeResume({ ...draft(), skills: [skill] })).toThrow(
        ValidationError,
      );
    },
  );

  it('rejects duplicate skills after trimming and case normalization', () => {
    expect(() =>
      normalizeResume({ ...draft(), skills: ['Comunicação', ' comunicação '] }),
    ).toThrow('Não repita a mesma habilidade.');
  });

  it.each(['institution', 'course', 'level'] as const)(
    'requires education %s only when adding an education',
    (key) => {
      expect(() =>
        normalizeResume({
          ...draft(),
          educations: [{ ...education, [key]: ' ' }],
        }),
      ).toThrow(ValidationError);
    },
  );

  it.each(['title', 'organization'] as const)(
    'requires experience %s only when adding an experience',
    (key) => {
      expect(() =>
        normalizeResume({
          ...draft(),
          experiences: [{ ...experience, [key]: ' ' }],
        }),
      ).toThrow(ValidationError);
    },
  );

  it.each([
    { startMonth: '2025-13', endMonth: null, ongoing: true },
    { startMonth: '0000-01', endMonth: null, ongoing: true },
    { startMonth: '2025-00', endMonth: null, ongoing: true },
    { startMonth: '2025-1', endMonth: null, ongoing: true },
    { startMonth: '2025-01-01', endMonth: null, ongoing: true },
    { startMonth: '2025-02', endMonth: '2025-01', ongoing: false },
    { startMonth: '2025-02', endMonth: null, ongoing: false },
    { startMonth: '2025-02', endMonth: '2025-13', ongoing: false },
    { startMonth: '2025-02', endMonth: '2025-03', ongoing: true },
  ])(
    'rejects an invalid period in both kinds of entry: %j',
    ({ startMonth, endMonth, ongoing }) => {
      expect(() =>
        normalizeResume({
          ...draft(),
          educations: [
            { ...education, startMonth, endMonth, inProgress: ongoing },
          ],
        }),
      ).toThrow(ValidationError);
      expect(() =>
        normalizeResume({
          ...draft(),
          experiences: [
            { ...experience, startMonth, endMonth, isCurrent: ongoing },
          ],
        }),
      ).toThrow(ValidationError);
    },
  );

  it('accepts ongoing periods and periods ending in the same month', () => {
    expect(
      normalizeResume({
        ...draft(),
        experiences: [
          { ...experience, endMonth: null, isCurrent: true, description: ' ' },
        ],
      }).experiences[0]?.description,
    ).toBeNull();
    expect(() =>
      normalizeResume({
        ...draft(),
        educations: [
          { ...education, endMonth: education.startMonth, inProgress: false },
        ],
      }),
    ).not.toThrow();
  });

  it('limits text lengths to the storage contract', () => {
    expect(() =>
      normalizeResume({
        ...draft(),
        educations: [{ ...education, institution: 'a'.repeat(201) }],
      }),
    ).toThrow(ValidationError);
    expect(() =>
      normalizeResume({
        ...draft(),
        experiences: [{ ...experience, title: 'a'.repeat(151) }],
      }),
    ).toThrow(ValidationError);
    expect(() =>
      normalizeResume({
        ...draft(),
        experiences: [{ ...experience, description: 'a'.repeat(2001) }],
      }),
    ).toThrow(ValidationError);
  });
});

it('projects only resume personal data and does not expose registration identifiers or address', () => {
  const youth = profile();
  const data = normalizeResume({
    ...draft(),
    skills: ['Comunicação'],
    educations: [education],
    experiences: [experience],
  });
  const view = toResumeView(youth, data);
  const persisted = {
    ...data,
    educations: data.educations.map((item) => ({
      ...item,
      id: 'internal',
      resumeId: 'private',
    })),
    experiences: data.experiences.map((item) => ({
      ...item,
      id: 'internal',
      resumeId: 'private',
    })),
  };
  expect(toResumeView(youth, persisted).educations[0]).not.toHaveProperty(
    'resumeId',
  );
  expect(toResumeView(youth, persisted).experiences[0]).not.toHaveProperty(
    'id',
  );
  expect(Object.keys(view.personalDetails).sort()).toEqual([
    'city',
    'firstName',
    'lastName',
    'phone',
    'state',
  ]);
  const serialized = JSON.stringify(view);
  for (const key of [
    'cpf',
    'postalCode',
    'street',
    'number',
    'complement',
    'neighborhood',
    'birthDate',
    'userId',
  ]) {
    expect(serialized).not.toContain(`"${key}":`);
  }
  view.skills.push('Nova habilidade');
  view.educations[0]!.course = 'Alterado';
  view.experiences[0]!.title = 'Alterado';
  expect(data.skills).toEqual(['Comunicação']);
  expect(data.educations[0]!.course).toBe('Informática');
  expect(data.experiences[0]!.title).toBe('Aprendiz');
});
