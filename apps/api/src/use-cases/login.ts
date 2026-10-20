import type { UsersRepository } from '../repositories/users-repository.js';
import type { SessionUseCase } from './session.js';
import { UnauthorizedError } from './errors/unauthorized-error.js';
import { normalizeEmail } from './validate-user.js';
interface Credentials {
  hash(password: string): Promise<string>;
  verify(password: string, stored: string): Promise<boolean>;
}
export class LoginUseCase {
  constructor(
    private users: UsersRepository,
    private sessions: SessionUseCase,
    private passwords: Credentials,
  ) {}
  async execute(email: string, password: string) {
    const user = await this.users.findByEmail(normalizeEmail(email));
    // Dummy BCrypt comparison keeps unknown accounts on the same expensive verification path.
    const stored =
      user?.passwordHash ??
      '$2b$12$C6UzMDM.H6dfI/f/IKcEe.yrk1RSEfVlV5A3C4cL6xLIlO3S0lxHq';
    const valid = await this.passwords.verify(password, stored);
    if (!user || !valid)
      throw new UnauthorizedError('E-mail ou senha inválidos.');
    if (
      stored.startsWith('scrypt:') &&
      Buffer.byteLength(password, 'utf8') <= 72
    ) {
      await this.users.update(user.id, {
        passwordHash: await this.passwords.hash(password),
      });
    }
    return {
      user: { id: user.id, email: user.email, role: user.role },
      token: await this.sessions.create(user.id),
    };
  }
}
