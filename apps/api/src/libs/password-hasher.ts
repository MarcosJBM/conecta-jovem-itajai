import { randomBytes, scrypt } from 'node:crypto';
import type { PasswordHasher } from '../domain/types/password-hasher.js';

export class ScryptPasswordHasher implements PasswordHasher {
  async hash(password: string) {
    const salt = randomBytes(16).toString('hex');

    const key = await new Promise<Buffer>((resolve, reject) => {
      scrypt(password, salt, 64, (error, result) =>
        error ? reject(error) : resolve(result),
      );
    });

    return `scrypt:${salt}:${key.toString('hex')}`;
  }
}
