import type { PasswordHasher } from '../../domain/types/password-hasher.js';

export const userInput = {
  email: 'young@example.com',
  password: 'password-123',
  role: 'YOUTH' as const,
};

export const fakeHasher: PasswordHasher = {
  async hash(password) {
    return `hashed:${password}`;
  },
};
