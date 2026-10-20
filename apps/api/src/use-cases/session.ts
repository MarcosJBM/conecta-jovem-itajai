import { createHash, randomBytes } from 'node:crypto';
import type { UsersRepository } from '../repositories/users-repository.js';
import type { SessionsRepository } from '../repositories/sessions-repository.js';
import type { AuthUser } from '../domain/types/auth.js';
import { UnauthorizedError } from './errors/unauthorized-error.js';

export const sessionDuration = 24 * 60 * 60 * 1000;
export const tokenHash = (token: string) =>
  createHash('sha256').update(token).digest('hex');
export class SessionUseCase {
  constructor(
    private sessions: SessionsRepository,
    private users: UsersRepository,
    private now = () => new Date(),
  ) {}
  async create(userId: string) {
    const token = randomBytes(32).toString('base64url');
    await this.sessions.create({
      tokenHash: tokenHash(token),
      userId,
      expiresAt: new Date(this.now().getTime() + sessionDuration),
    });
    return token;
  }
  async authenticate(token: string | undefined): Promise<AuthUser> {
    if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token))
      throw new UnauthorizedError();
    const session = await this.sessions.find(tokenHash(token));
    if (!session) throw new UnauthorizedError();
    if (session.expiresAt <= this.now()) {
      await this.sessions.delete(session.tokenHash);
      throw new UnauthorizedError('Sessão expirada. Entre novamente.');
    }
    const user = await this.users.findById(session.userId);
    if (!user) throw new UnauthorizedError();
    return { id: user.id, email: user.email, role: user.role };
  }
  async logout(token: string | undefined) {
    if (token) await this.sessions.delete(tokenHash(token));
  }
}
