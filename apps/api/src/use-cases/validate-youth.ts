import {
  getStates,
  isValidCpf,
  isValidCep,
  isValidMobilePhone,
  parseCpf,
  parseCep,
  parsePhone,
} from '@brazilian-utils/brazilian-utils';
export { isValidCpf } from '@brazilian-utils/brazilian-utils';
import type { YouthRegistration } from '../domain/entities/user.js';
import { requiredYouthFields } from '../domain/entities/user.js';
import { ValidationError } from './errors/validation-error.js';

export type YouthInput = Omit<YouthRegistration, 'birthDate' | 'complement'> & {
  birthDate: string;
  complement?: string;
};

export const states: string[] = getStates().map((state) => state.code);

export function isValidBirthDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value &&
    value <= new Date().toISOString().slice(0, 10)
  );
}

export function normalizeYouth(
  input: YouthInput | undefined,
  acceptedTerms: boolean | undefined,
): YouthRegistration {
  if (acceptedTerms !== true) {
    throw new ValidationError('O aceite dos termos é obrigatório.');
  }

  const keys = requiredYouthFields;

  const missing = keys.filter(
    (key) => typeof input?.[key] !== 'string' || !input[key].trim(),
  );

  if (missing.length) {
    throw new ValidationError(`Campos obrigatórios: ${missing.join(', ')}.`);
  }

  const data = Object.fromEntries(
    keys.map((key) => [key, input![key].trim()]),
  ) as unknown as YouthInput;

  data.complement = input?.complement?.trim() ?? '';

  if (!isValidCpf(data.cpf)) throw new ValidationError('CPF inválido.');
  data.cpf = parseCpf(data.cpf);

  if (!isValidBirthDate(data.birthDate)) {
    throw new ValidationError('Data de nascimento inválida.');
  }

  if (!isValidMobilePhone(data.phone, { version: 2 }))
    throw new ValidationError('Celular inválido.');
  data.phone = parsePhone(data.phone);
  if (!isValidCep(data.postalCode)) throw new ValidationError('CEP inválido.');
  data.postalCode = parseCep(data.postalCode);
  data.state = data.state.toUpperCase();

  if (!states.includes(data.state)) {
    throw new ValidationError('Estado inválido.');
  }

  return {
    ...data,
    complement: data.complement ?? '',
    birthDate: new Date(`${data.birthDate}T00:00:00.000Z`),
  };
}
