import { hash, compare } from 'bcryptjs';
import { scrypt, timingSafeEqual } from 'node:crypto';
import type { PasswordHasher } from '../domain/types/password-hasher.js';

export class BcryptPasswordHasher implements PasswordHasher {
  hash(password: string) {
    return hash(password, 12);
  }

  async verify(password: string, stored: string): Promise<boolean> {
    if (/^\$2[aby]\$/.test(stored)) {
      if (Buffer.byteLength(password, 'utf8') > 72) return false;
      return compare(password, stored);
    }
    // Compatibility only: existing Scrypt accounts are upgraded after a valid login.
    const match = /^scrypt:([a-f0-9]{32}):([a-f0-9]{128})$/.exec(stored);
    if (!match) return false;
    const actual = await new Promise<Buffer>((resolve, reject) => {
      scrypt(password, match[1]!, 64, (error, key) =>
        error ? reject(error) : resolve(key),
      );
    });
    return timingSafeEqual(actual, Buffer.from(match[2]!, 'hex'));
  }
}
