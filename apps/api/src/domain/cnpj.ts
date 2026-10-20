import {
  isValidCnpj as validateCnpj,
  parseCnpj,
} from '@brazilian-utils/brazilian-utils';
export const normalizeCnpj = (value: string) =>
  parseCnpj(value, { version: 2 });
export const isValidCnpj = (value: string) =>
  validateCnpj(value, { version: 2 });
