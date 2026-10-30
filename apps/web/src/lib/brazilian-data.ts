import {
  isValidEmail,
  formatCep,
  formatCpf,
  formatCnpj,
  formatPhone,
  isValidCep,
  isValidCpf,
  isValidCnpj,
  isValidMobilePhone,
  isValidPhone,
  getStates,
} from '@brazilian-utils/brazilian-utils';

export const states = getStates();
export function formatBrazilianField(name: string, value: string) {
  if (name === 'cpf') return formatCpf(value);
  if (name === 'postalCode') return formatCep(value);
  if (name === 'phone') return formatPhone(value, { mask: 'nanp' });
  if (name === 'cnpj') return formatCnpj(value, { version: 2 });
  return value;
}
export function validateBrazilianField(
  name: string,
  value: string,
  mobileOnly = false,
): true | string {
  if (name === 'email')
    return isValidEmail(value.trim()) || 'Informe um e-mail válido.';
  if (name === 'cpf') return isValidCpf(value) || 'Informe um CPF válido.';
  if (name === 'cnpj')
    return isValidCnpj(value, { version: 2 }) || 'Informe um CNPJ válido.';
  if (name === 'postalCode')
    return isValidCep(value) || 'Informe um CEP válido.';
  if (name === 'phone')
    return (
      (mobileOnly
        ? isValidMobilePhone(value, { version: 2 })
        : isValidPhone(value, { version: 2 })) ||
      'Informe um telefone com DDD válido.'
    );
  if (name === 'state')
    return (
      states.some((state) => state.code === value) || 'Selecione uma UF válida.'
    );
  return true;
}
