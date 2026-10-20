import { isValidEmail } from '@brazilian-utils/brazilian-utils';
import { userRoles, type UserRole } from '../domain/enums/user-role.js';
import { ValidationError } from './errors/validation-error.js';
import { ForbiddenError } from './errors/forbidden-error.js';

export function normalizeEmail(email: string) {
  const normalized = email.trim().toLowerCase();

  if (normalized.length > 254 || !isValidEmail(normalized))
    throw new ValidationError('E-mail inválido.');

  return normalized;
}

export function validatePassword(password: string) {
  if (Buffer.byteLength(password, 'utf8') > 72)
    throw new ValidationError('A senha deve possuir no máximo 72 bytes.');
  if (password.length < 6)
    throw new ValidationError('A senha deve possuir no mínimo 6 caracteres.');
}

export function validateRegistrationRole(role: UserRole) {
  if (!userRoles.includes(role)) throw new ValidationError('Perfil inválido.');

  if (role === 'COMPANY')
    throw new ForbiddenError('Cadastre a empresa pelo formulário de empresas.');
  if (role === 'ADMIN')
    throw new ForbiddenError(
      'Administradores não podem ser criados pelo cadastro público.',
    );
}
