import { beforeEach, describe, expect, it } from 'vitest';
import { InMemoryUsersRepository } from '../repositories/in-memory/in-memory-users-repository.js';
import { CreateUserUseCase } from './create-user.js';
import { GetUserUseCase } from './get-user.js';
import { FetchUsersUseCase } from './fetch-users.js';
import { UpdateUserUseCase } from './update-user.js';
import { DeleteUserUseCase } from './delete-user.js';
import { ConflictError } from './errors/conflict-error.js';
import { ForbiddenError } from './errors/forbidden-error.js';
import { ValidationError } from './errors/validation-error.js';
import { ResourceNotFoundError } from './errors/resource-not-found.js';
import { testCpf, userInput, fakeHasher } from '../utils/test/user-fixture.js';

let repository: InMemoryUsersRepository;
let create: CreateUserUseCase;

beforeEach(() => {
  repository = new InMemoryUsersRepository();
  create = new CreateUserUseCase(repository, fakeHasher);
});

describe('Create user', () => {
  it.each(['YOUTH'] as const)(
    'persists a %s and its matching profile atomically',
    async (role) => {
      const { user } = await create.execute({
        ...userInput,
        role,
        email: ' Young@Example.com ',
      });
      expect(user.email).toBe('young@example.com');
      expect(user).not.toHaveProperty('passwordHash');
      const stored = await repository.findById(user.id);
      expect(stored?.passwordHash).toBe('hashed:password-123');
      expect(stored?.youthProfile !== null).toBe(role === 'YOUTH');
      expect(stored?.companyProfile).toBeNull();
    },
  );

  it('rejects normalized duplicate email without adding a record', async () => {
    await create.execute(userInput);
    await expect(
      create.execute({ ...userInput, email: 'YOUNG@example.com' }),
    ).rejects.toBeInstanceOf(ConflictError);
    expect((await repository.findMany({ page: 1, pageSize: 20 })).total).toBe(
      1,
    );
  });

  it.each([
    { email: 'bad' },
    { password: 'short' },
    { role: 'INVALID' as 'YOUTH' },
  ])('validates before persistence: %j', async (changes) => {
    await expect(
      create.execute({ ...userInput, ...changes }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect((await repository.findMany({ page: 1, pageSize: 20 })).total).toBe(
      0,
    );
  });

  it('forbids public administrator creation', async () => {
    await expect(
      create.execute({ ...userInput, role: 'ADMIN' }),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect((await repository.findMany({ page: 1, pageSize: 20 })).total).toBe(
      0,
    );
  });
});

describe('Get user', () => {
  it('retrieves a stored user without its password hash', async () => {
    const { user } = await create.execute(userInput);
    expect(
      await new GetUserUseCase(repository).execute({ id: user.id }),
    ).toEqual({ user });
  });

  it('rejects a missing user', async () => {
    await expect(
      new GetUserUseCase(repository).execute({ id: 'missing' }),
    ).rejects.toBeInstanceOf(ResourceNotFoundError);
  });
});

describe('Fetch users', () => {
  it('returns stable pages, metadata and no password hashes', async () => {
    for (let i = 0; i < 5; i++)
      await create.execute({
        ...userInput,
        youthProfile: { ...userInput.youthProfile, cpf: testCpf(i) },
        email: `user${i}@example.com`,
      });
    const useCase = new FetchUsersUseCase(repository);
    const first = await useCase.execute({ page: 1, pageSize: 2 });
    const second = await useCase.execute({ page: 2, pageSize: 2 });
    expect(first).toMatchObject({
      total: 5,
      totalPages: 3,
      page: 1,
      pageSize: 2,
    });
    expect(
      new Set([...first.items, ...second.items].map((user) => user.id)).size,
    ).toBe(4);
    expect(await useCase.execute({ page: 1, pageSize: 2 })).toEqual(first);
    expect(first.items[0]).not.toHaveProperty('passwordHash');
    expect((await useCase.execute({ page: 4, pageSize: 2 })).items).toEqual([]);
  });

  it.each([
    { page: 0, pageSize: 20 },
    { page: 1.5, pageSize: 20 },
    { page: 1, pageSize: 101 },
    { page: 1, pageSize: 0 },
    { page: Number.MAX_SAFE_INTEGER, pageSize: 100 },
  ])('rejects invalid pagination %j', async (data) => {
    await expect(
      new FetchUsersUseCase(repository).execute(data),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

describe('Update user', () => {
  it('persists email and password and preserves the profile and role', async () => {
    const { user } = await create.execute(userInput);
    const result = await new UpdateUserUseCase(repository, fakeHasher).execute({
      id: user.id,
      email: 'NEW@example.com',
      password: 'new-password',
    });

    const stored = await repository.findById(user.id);

    expect(stored).toMatchObject({
      email: 'new@example.com',
      passwordHash: 'hashed:new-password',
      role: 'YOUTH',
      youthProfile: expect.objectContaining(user.youthProfile!),
    });

    expect(result.user).not.toHaveProperty('passwordHash');
  });

  it('rejects missing users', async () => {
    await expect(
      new UpdateUserUseCase(repository, fakeHasher).execute({
        id: 'missing',
        email: 'new@example.com',
      }),
    ).rejects.toBeInstanceOf(ResourceNotFoundError);
  });

  it('rejects duplicate emails without modifying storage', async () => {
    const { user } = await create.execute(userInput);

    await create.execute({
      ...userInput,
      youthProfile: { ...userInput.youthProfile, cpf: testCpf(100) },
      email: 'other@example.com',
    });

    await expect(
      new UpdateUserUseCase(repository, fakeHasher).execute({
        id: user.id,
        email: 'OTHER@example.com',
      }),
    ).rejects.toBeInstanceOf(ConflictError);

    expect((await repository.findById(user.id))?.email).toBe(userInput.email);
  });

  it.each([{ email: 'bad' }, { password: '' }, {}])(
    'rejects invalid changes before writing %j',
    async (changes) => {
      const { user } = await create.execute(userInput);

      const before = await repository.findById(user.id);

      await expect(
        new UpdateUserUseCase(repository, fakeHasher).execute({
          id: user.id,
          ...changes,
        }),
      ).rejects.toBeInstanceOf(ValidationError);

      expect(await repository.findById(user.id)).toEqual(before);
    },
  );

  it('allows retaining the same email', async () => {
    const { user } = await create.execute(userInput);

    await expect(
      new UpdateUserUseCase(repository, fakeHasher).execute({
        id: user.id,
        email: user.email,
      }),
    ).resolves.toMatchObject({ user: { email: user.email } });
  });
});

describe('Delete user', () => {
  it('removes persisted user and profile and rejects a second deletion', async () => {
    const { user } = await create.execute(userInput);

    const useCase = new DeleteUserUseCase(repository);

    await useCase.execute({ id: user.id });

    expect(await repository.findById(user.id)).toBeNull();

    expect((await repository.findMany({ page: 1, pageSize: 20 })).total).toBe(
      0,
    );

    await expect(useCase.execute({ id: user.id })).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );
  });

  it('rejects missing users', async () => {
    await expect(
      new DeleteUserUseCase(repository).execute({ id: 'missing' }),
    ).rejects.toBeInstanceOf(ResourceNotFoundError);
  });
});

describe('Persistence boundaries', () => {
  it('does not expose mutable references to stored aggregates', async () => {
    const { user } = await create.execute(userInput);

    const record = await repository.findById(user.id);

    record!.email = 'mutated@example.com';

    record!.youthProfile!.id = 'mutated';

    expect((await repository.findById(user.id))?.email).toBe(userInput.email);

    expect((await repository.findById(user.id))?.youthProfile?.id).toBe(
      user.youthProfile?.id,
    );
  });

  it('propagates unexpected errors to the caller', async () => {
    const error = new Error('database unavailable');

    repository.findById = async () => {
      throw error;
    };

    await expect(
      new GetUserUseCase(repository).execute({ id: 'id' }),
    ).rejects.toBe(error);
  });

  it('handles a record removed between lookup and update', async () => {
    const { user } = await create.execute(userInput);

    repository.update = async () => {
      await repository.delete(user.id);
      return null;
    };

    await expect(
      new UpdateUserUseCase(repository, fakeHasher).execute({
        id: user.id,
        email: 'new@example.com',
      }),
    ).rejects.toBeInstanceOf(ResourceNotFoundError);
  });

  it('handles a record removed between lookup and deletion', async () => {
    const { user } = await create.execute(userInput);

    const find = repository.findById.bind(repository);

    repository.findById = async (id) => {
      const record = await find(id);
      await repository.delete(id);
      return record;
    };

    await expect(
      new DeleteUserUseCase(repository).execute({ id: user.id }),
    ).rejects.toBeInstanceOf(ResourceNotFoundError);
  });
});

describe('Youth registration', () => {
  it('accepts six characters and persists normalized personal data privately', async () => {
    const { user } = await create.execute({ ...userInput, password: 'abcdef' });
    const stored = await repository.findById(user.id);
    expect(stored?.youthProfile).toMatchObject({
      firstName: 'Ana',
      cpf: '52998224725',
      phone: '47999991234',
      postalCode: '88301000',
      birthDate: new Date('2005-03-12T00:00:00Z'),
      complement: 'Casa',
    });
    expect(stored?.passwordHash).toBe('hashed:abcdef');
    expect(user.youthProfile).not.toHaveProperty('cpf');
    expect(user.youthProfile).not.toHaveProperty('street');
    expect(user.youthProfile).not.toHaveProperty('phone');
  });

  it.each([false, undefined])(
    'requires terms acceptance: %s',
    async (acceptedTerms) => {
      await expect(
        create.execute({ ...userInput, acceptedTerms }),
      ).rejects.toBeInstanceOf(ValidationError);
      expect((await repository.findMany({ page: 1, pageSize: 20 })).total).toBe(
        0,
      );
    },
  );

  it.each(
    Object.keys(userInput.youthProfile).filter((key) => key !== 'complement'),
  )('requires nonblank %s', async (field) => {
    await expect(
      create.execute({
        ...userInput,
        youthProfile: { ...userInput.youthProfile, [field]: '   ' },
      }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect((await repository.findMany({ page: 1, pageSize: 20 })).total).toBe(
      0,
    );
  });

  it.each([
    { cpf: '111.111.111-11' },
    { cpf: '52998224724' },
    { cpf: 'abc52998224725' },
    { birthDate: '2005-02-30' },
    { birthDate: '2999-01-01' },
    { phone: '123' },
    { postalCode: '8830' },
    { state: 'XX' },
  ])('rejects invalid personal data %j', async (changes) => {
    await expect(
      create.execute({
        ...userInput,
        youthProfile: { ...userInput.youthProfile, ...changes },
      }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect((await repository.findMany({ page: 1, pageSize: 20 })).total).toBe(
      0,
    );
  });

  it('rejects the same CPF with different formatting and email', async () => {
    await create.execute(userInput);
    await expect(
      create.execute({
        ...userInput,
        email: 'another@example.com',
        youthProfile: { ...userInput.youthProfile, cpf: '52998224725' },
      }),
    ).rejects.toThrow('CPF já cadastrado.');
    expect((await repository.findMany({ page: 1, pageSize: 20 })).total).toBe(
      1,
    );
  });
});

it('forbids company accounts through generic public registration', async () => {
  await expect(
    create.execute({ ...userInput, role: 'COMPANY' }),
  ).rejects.toBeInstanceOf(ForbiddenError);
  expect((await repository.findMany({ page: 1, pageSize: 20 })).total).toBe(0);
});
it('accepts an absent youth address complement', async () => {
  const { complement: _complement, ...youthProfile } = userInput.youthProfile;
  const { user } = await create.execute({ ...userInput, youthProfile });
  expect((await repository.findById(user.id))?.youthProfile?.complement).toBe(
    '',
  );
});
