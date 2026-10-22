import type { Pagination } from '../domain/types/pagination.js';
import { ValidationError } from './errors/validation-error.js';
export function validatePagination({ page, pageSize }: Pagination) {
  if (
    !Number.isSafeInteger(page) ||
    page < 1 ||
    !Number.isInteger(pageSize) ||
    pageSize < 1 ||
    pageSize > 100 ||
    !Number.isSafeInteger((page - 1) * pageSize)
  )
    throw new ValidationError('Paginação inválida.');
}
