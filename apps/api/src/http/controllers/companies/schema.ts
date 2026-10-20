import {
  getStates,
  isValidPhone,
  parsePhone,
} from '@brazilian-utils/brazilian-utils';
import { z } from 'zod';
import { isValidCnpj, normalizeCnpj } from '../../../domain/cnpj.js';

const requiredText = (max: number) =>
  z
    .string({ error: 'Campo obrigatório.' })
    .trim()
    .min(1, 'Campo obrigatório.')
    .max(max, `Use no máximo ${max} caracteres.`);
const states = new Set<string>(getStates().map((state) => state.code));

export const registerCompanySchema = z.strictObject({
  email: requiredText(254)
    .toLowerCase()
    .pipe(z.email({ error: 'Informe um e-mail válido.' })),
  password: z
    .string({ error: 'Campo obrigatório.' })
    .min(6, 'Use pelo menos 6 caracteres.')
    .refine(
      (value) => Buffer.byteLength(value, 'utf8') <= 72,
      'Use no máximo 72 bytes na senha.',
    ),
  cnpj: requiredText(18)
    .refine(isValidCnpj, 'Informe um CNPJ válido.')
    .transform(normalizeCnpj),
  legalName: requiredText(200),
  tradeName: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((value) => value || undefined),
  city: requiredText(100),
  state: requiredText(2)
    .toUpperCase()
    .refine((value) => states.has(value), 'Selecione uma UF válida.'),
  contactName: requiredText(150),
  contactRole: requiredText(100),
  phone: requiredText(25)
    .refine(
      (value) => isValidPhone(value, { version: 2 }),
      'Informe um telefone com DDD válido.',
    )
    .transform(parsePhone),
});

export const companyDataSchema = registerCompanySchema.omit({
  email: true,
  password: true,
});
