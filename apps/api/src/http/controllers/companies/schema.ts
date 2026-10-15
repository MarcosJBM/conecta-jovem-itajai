import { z } from 'zod';
import { isValidCnpj, normalizeCnpj } from '../../../domain/cnpj.js';

const requiredText = (max: number) =>
  z
    .string({ error: 'Campo obrigatório.' })
    .trim()
    .min(1, 'Campo obrigatório.')
    .max(max, `Use no máximo ${max} caracteres.`);
const states = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
] as const;

export const registerCompanySchema = z.strictObject({
  email: requiredText(254)
    .toLowerCase()
    .pipe(z.email({ error: 'Informe um e-mail válido.' })),
  password: z
    .string({ error: 'Campo obrigatório.' })
    .min(8, 'Use pelo menos 8 caracteres.')
    .refine(
      (value) => Buffer.byteLength(value, 'utf8') <= 72,
      'Use no máximo 72 bytes na senha.',
    ),
  cnpj: requiredText(18)
    .transform(normalizeCnpj)
    .refine(isValidCnpj, 'Informe um CNPJ válido.'),
  legalName: requiredText(200),
  tradeName: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((value) => value || undefined),
  city: requiredText(100),
  state: z.enum(states, { error: 'Selecione uma UF válida.' }),
  contactName: requiredText(150),
  contactRole: requiredText(100),
  phone: requiredText(20)
    .regex(/^[0-9()+ .-]+$/, 'Informe um telefone válido.')
    .transform((value) => value.replace(/\D/g, ''))
    .refine(
      (value) => /^[1-9]{2}[0-9]{8,9}$/.test(value),
      'Informe DDD e telefone com 10 ou 11 dígitos.',
    ),
});
