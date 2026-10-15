import { z } from 'zod';
import { userRoles } from '../../../domain/enums/user-role.js';
export const idSchema = z.object({ id: z.uuid() });
const fields = {
  email: z.email().max(254),
  password: z.string().min(8).max(128),
};
export const createSchema = z.strictObject({
  ...fields,
  role: z.enum(userRoles),
});
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
