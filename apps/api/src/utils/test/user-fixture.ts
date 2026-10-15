import type { PasswordHasher } from '../../domain/types/password-hasher.js';

export const userInput = {
  email: 'young@example.com',
  password: 'password-123',
  role: 'YOUTH' as const,
  acceptedTerms: true,
  youthProfile: {
    firstName: 'Ana',
    lastName: 'Silva',
    birthDate: '2005-03-12',
    phone: '(47) 99999-1234',
    cpf: '529.982.247-25',
    postalCode: '88301-000',
    street: 'Rua Central',
    number: '123',
    complement: 'Casa',
    neighborhood: 'Centro',
    city: 'Itajaí',
    state: 'SC',
  },
};

export const fakeHasher: PasswordHasher = {
  async hash(password) {
    return `hashed:${password}`;
  },
};

// Deterministic valid CPFs for tests that create multiple distinct users.
export function testCpf(seed: number): string {
  let cpf = String(100000000 + seed);
  for (const length of [9, 10]) {
    const sum = [...cpf].reduce(
      (total, digit, index) => total + Number(digit) * (length + 1 - index),
      0,
    );
    const digit = (sum * 10) % 11;
    cpf += String(digit === 10 ? 0 : digit);
  }
  return cpf;
}
