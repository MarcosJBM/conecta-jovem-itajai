import { z } from 'zod';
const text = (max: number) =>
  z.string().trim().min(1, 'Campo obrigatório.').max(max);
const month = z
  .string()
  .regex(/^(?!0000)\d{4}-(0[1-9]|1[0-2])$/, 'Informe um mês válido.');
const period = { startMonth: month, endMonth: month.nullable() };
export const resumeSchema = z
  .strictObject({
    skills: z.array(text(100)).max(50),
    educations: z
      .array(
        z.strictObject({
          institution: text(200),
          course: text(200),
          level: text(100),
          ...period,
          inProgress: z.boolean(),
        }),
      )
      .max(20),
    experiences: z
      .array(
        z.strictObject({
          title: text(150),
          organization: text(200),
          ...period,
          isCurrent: z.boolean(),
          description: z.string().trim().max(2000).nullable(),
        }),
      )
      .max(20),
  })
  .superRefine((data, context) => {
    for (const key of ['educations', 'experiences'] as const) {
      data[key].forEach((entry, index) => {
        const ongoing =
          'inProgress' in entry ? entry.inProgress : entry.isCurrent;
        if (
          ongoing
            ? entry.endMonth !== null
            : entry.endMonth === null || entry.endMonth < entry.startMonth
        ) {
          context.addIssue({
            code: 'custom',
            path: [key, index, 'endMonth'],
            message: ongoing
              ? 'Remova o término da atividade em andamento.'
              : 'Informe um término igual ou posterior ao início.',
          });
        }
      });
    }
  });
