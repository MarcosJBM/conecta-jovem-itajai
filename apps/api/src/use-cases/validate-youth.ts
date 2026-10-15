import type { YouthRegistration } from '../domain/entities/user.js';
import { ValidationError } from './errors/validation-error.js';

export type YouthInput = Omit<YouthRegistration, 'birthDate'> & {
  birthDate: string;
};
export const states = [
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
];
export function isValidCpf(cpf: string): boolean {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  for (const length of [9, 10]) {
    const sum = [...cpf.slice(0, length)].reduce(
      (total, digit, index) => total + Number(digit) * (length + 1 - index),
      0,
    );
    const remainder = (sum * 10) % 11;
    if ((remainder === 10 ? 0 : remainder) !== Number(cpf[length]))
      return false;
  }
  return true;
}
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
  if (acceptedTerms !== true)
    throw new ValidationError('O aceite dos termos é obrigatório.');
  const keys = [
    'firstName',
    'lastName',
    'birthDate',
    'phone',
    'cpf',
    'postalCode',
    'street',
    'number',
    'complement',
    'neighborhood',
    'city',
    'state',
  ] as const;
  const missing = keys.filter(
    (key) => typeof input?.[key] !== 'string' || !input[key].trim(),
  );
  if (missing.length)
    throw new ValidationError(`Campos obrigatórios: ${missing.join(', ')}.`);
  const data = Object.fromEntries(
    keys.map((key) => [key, input![key].trim()]),
  ) as unknown as YouthInput;
  if (!/^[\d.-]+$/.test(data.cpf)) throw new ValidationError('CPF inválido.');
  data.cpf = data.cpf.replace(/\D/g, '');
  if (!isValidCpf(data.cpf)) throw new ValidationError('CPF inválido.');
  if (!isValidBirthDate(data.birthDate))
    throw new ValidationError('Data de nascimento inválida.');
  if (!/^[\d() +-]+$/.test(data.phone))
    throw new ValidationError('Celular inválido.');
  data.phone = data.phone.replace(/\D/g, '');
  if (data.phone.startsWith('55') && data.phone.length === 13)
    data.phone = data.phone.slice(2);
  if (!/^[1-9]{2}9\d{8}$/.test(data.phone))
    throw new ValidationError('Celular inválido.');
  if (!/^\d{5}-?\d{3}$/.test(data.postalCode))
    throw new ValidationError('CEP inválido.');
  data.postalCode = data.postalCode.replace(/\D/g, '');
  data.state = data.state.toUpperCase();
  if (!states.includes(data.state))
    throw new ValidationError('Estado inválido.');
  return { ...data, birthDate: new Date(`${data.birthDate}T00:00:00.000Z`) };
}
