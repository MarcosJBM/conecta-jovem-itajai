import { Router } from 'express';
import { LoginLimiter } from '../../../libs/login-limiter.js';
import { UnauthorizedError } from '../../../use-cases/errors/unauthorized-error.js';
import { z } from 'zod';
import {
  makeLoginUseCase,
  makeSessionUseCase,
} from '../../../use-cases/factories/make-auth.js';
import {
  cookieName,
  readSessionCookie,
  requireSession,
  requireSameOriginWrite,
} from '../../middlewares/auth.js';
import { env } from '../../../env.js';
import { sessionDuration } from '../../../use-cases/session.js';
const loginSchema = z.strictObject({
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  password: z.string().min(1).max(1024),
});
const options = () => ({
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: env.nodeEnv === 'production',
  path: '/',
});
export const authRoutes = Router();
const limiter = new LoginLimiter();
authRoutes.post('/login', requireSameOriginWrite, async (request, response) => {
  const input = loginSchema.parse(request.body);
  const key = request.ip ?? 'unknown';
  if (limiter.blocked(key)) {
    response
      .status(429)
      .json({ message: 'Muitas tentativas. Tente novamente em 15 minutos.' });
    return;
  }
  let result;
  try {
    result = await makeLoginUseCase().execute(input.email, input.password);
  } catch (error) {
    if (error instanceof UnauthorizedError) limiter.failure(key);
    throw error;
  }
  limiter.clear(key);
  await makeSessionUseCase().logout(readSessionCookie(request.headers.cookie));
  response.cookie(cookieName, result.token, {
    ...options(),
    maxAge: sessionDuration,
  });
  response.json({ user: result.user });
});
authRoutes.post(
  '/logout',
  requireSameOriginWrite,
  async (request, response) => {
    await makeSessionUseCase().logout(
      readSessionCookie(request.headers.cookie),
    );
    response.clearCookie(cookieName, options()).status(204).end();
  },
);
authRoutes.get('/me', requireSession, (request, response) =>
  response.json({ user: request.auth }),
);
