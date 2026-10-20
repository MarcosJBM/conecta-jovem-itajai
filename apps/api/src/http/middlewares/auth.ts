import type { RequestHandler } from 'express';
import type { AuthUser } from '../../domain/types/auth.js';
import { makeSessionUseCase } from '../../use-cases/factories/make-auth.js';
import { ForbiddenError } from '../../use-cases/errors/forbidden-error.js';

declare global {
  // Express uses this global interface for request declaration merging.
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthUser;
    }
  }
}
export const cookieName = 'conecta_session';
export function readSessionCookie(cookie: string | undefined) {
  return cookie
    ?.split(';')
    .map((value) => value.trim())
    .find((value) => value.startsWith(cookieName + '='))
    ?.slice(cookieName.length + 1);
}
export const requireSession: RequestHandler = async (
  request,
  _response,
  next,
) => {
  request.auth = await makeSessionUseCase().authenticate(
    readSessionCookie(request.headers.cookie),
  );
  next();
};
export const requireAdmin: RequestHandler = (request, _response, next) => {
  if (request.auth?.role !== 'ADMIN') throw new ForbiddenError();
  next();
};
export const requireOwnerOrAdmin: RequestHandler = (
  request,
  _response,
  next,
) => {
  if (request.auth?.role !== 'ADMIN' && request.auth?.id !== request.params.id)
    throw new ForbiddenError();
  next();
};
// Cross-origin scripts cannot send this custom header without an approved CORS preflight.
// The API does not allow cross-origin CORS. SameSite=Lax is an additional defense.
export const requireSameOriginWrite: RequestHandler = (
  request,
  _response,
  next,
) => {
  if (request.get('X-Requested-With') !== 'Conecta')
    throw new ForbiddenError('Requisição não permitida.');
  const origin = request.get('Origin');
  if (origin && origin !== `${request.protocol}://${request.get('host')}`)
    throw new ForbiddenError('Origem não permitida.');
  next();
};
