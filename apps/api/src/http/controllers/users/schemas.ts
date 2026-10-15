import { z } from 'zod';
export const idSchema = z.object({ id: z.uuid() });
const fields = {
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  password: z.string().min(6),
};
const requiredText = z.string().trim().min(1, 'Campo obrigatório.');
const youthSchema = z.strictObject({
  firstName: requiredText,
  lastName: requiredText,
  birthDate: requiredText,
  phone: requiredText,
  cpf: requiredText,
  postalCode: requiredText,
  street: requiredText,
  number: requiredText,
  complement: requiredText,
  neighborhood: requiredText,
  city: requiredText,
  state: requiredText,
});
export const createSchema = z.discriminatedUnion('role', [
  z.strictObject({
    ...fields,
    role: z.literal('YOUTH'),
    youthProfile: z.preprocess(
      (value) => (value === undefined ? {} : value),
      youthSchema,
    ),
    acceptedTerms: z.literal(true, {
      error: 'O aceite dos termos é obrigatório.',
    }),
  }),
  z.strictObject({
    ...fields,
    role: z.literal('COMPANY'),
    youthProfile: youthSchema.optional(),
    acceptedTerms: z.boolean().optional(),
  }),
  z.strictObject({
    ...fields,
    role: z.literal('ADMIN'),
    youthProfile: youthSchema.optional(),
    acceptedTerms: z.boolean().optional(),
  }),
]);
export const replaceSchema = z.strictObject(fields);
export const updateSchema = replaceSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, 'Informe ao menos um campo.');
export const paginationSchema = z.strictObject({
  page: z.coerce
    .number()
    .int()
    .positive()
    .max(Number.MAX_SAFE_INTEGER)
    .default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
