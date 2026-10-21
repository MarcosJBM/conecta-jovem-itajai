import { z } from 'zod';
import { jobAreas, jobContracts, workRegimes } from '../../../domain/job.js';
const text = (max: number) =>
  z.string().trim().min(1, 'Campo obrigatório.').max(max);
export const jobSchema = z.strictObject({
  title: text(150),
  description: text(5000),
  requirements: text(5000),
  city: text(100),
  state: text(2),
  area: z.enum(jobAreas),
  contract: z.enum(jobContracts),
  regime: z.enum(workRegimes),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe uma data válida.'),
});
