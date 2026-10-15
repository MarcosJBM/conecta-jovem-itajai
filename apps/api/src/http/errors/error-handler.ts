import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { ResourceNotFoundError } from '../../use-cases/errors/resource-not-found.js';
import { ConflictError } from '../../use-cases/errors/conflict-error.js';
import { ValidationError } from '../../use-cases/errors/validation-error.js';
import { UnauthorizedError } from '../../use-cases/errors/unauthorized-error.js';
import { ForbiddenError } from '../../use-cases/errors/forbidden-error.js';

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  _request,
  response,
  next,
) => {
  if (response.headersSent) {
    next(error);
    return;
  }

  if (error instanceof ZodError) {
    const fields: Record<string, string> = {};
    for (const issue of error.issues)
      fields[String(issue.path[0] ?? '_form')] ??= issue.message;
    response
      .status(400)
      .json({ message: 'Requisição inválida.', issues: error.issues, fields });
    return;
  }

  const status =
    error instanceof ValidationError
      ? 400
      : error instanceof UnauthorizedError
        ? 401
        : error instanceof ForbiddenError
          ? 403
          : error instanceof ResourceNotFoundError
            ? 404
            : error instanceof ConflictError
              ? 409
              : undefined;

  if (status && error instanceof Error) {
    response.status(status).json({
      message: error.message,
      ...(error instanceof ConflictError && error.field
        ? { fields: { [error.field]: error.message } }
        : {}),
    });
    return;
  }

  if (typeof error === 'object' && error !== null && 'type' in error) {
    if (error.type === 'entity.parse.failed') {
      response.status(400).json({ message: 'JSON inválido.' });
      return;
    }

    if (error.type === 'entity.too.large') {
      response
        .status(413)
        .json({ message: 'Corpo da requisição muito grande.' });
      return;
    }
  }

  console.error('Erro inesperado na API:', error);

  response.status(500).json({ message: 'Erro interno do servidor.' });
};
