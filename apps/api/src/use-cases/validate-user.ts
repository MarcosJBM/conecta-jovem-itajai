import { userRoles, type UserRole } from '../domain/enums/user-role.js';
import { ValidationError } from './errors/validation-error.js';
import { ForbiddenError } from './errors/forbidden-error.js';

export function normalizeEmail(email: string) {
  const normalized = email.trim().toLowerCase();

  if (normalized.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized))
    throw new ValidationError('E-mail inválido.');

  return normalized;
}

export function validatePassword(password: string) {
  if (password.length < 6)
    throw new ValidationError('A senha deve possuir no mínimo 6 caracteres.');
}

export function validateRegistrationRole(role: UserRole) {
  if (!userRoles.includes(role)) throw new ValidationError('Perfil inválido.');

  if (role === 'ADMIN')
    throw new ForbiddenError(
      'Administradores não podem ser criados pelo cadastro público.',
    );
}
