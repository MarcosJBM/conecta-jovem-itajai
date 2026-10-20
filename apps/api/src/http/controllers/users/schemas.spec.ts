import { describe, expect, it } from 'vitest';
import { createSchema } from './schemas.js';
import { userInput } from '../../../utils/test/user-fixture.js';

describe('Youth HTTP contract', () => {
  it('reports every missing field including terms', () => {
    const result = createSchema.safeParse({
      role: 'YOUTH',
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.map((issue) => issue.path.join('.'))).toEqual(
      expect.arrayContaining([
        'acceptedTerms',
        ...Object.keys(userInput.youthProfile)
          .filter((key) => key !== 'complement')
          .map((key) => `youthProfile.${key}`),
      ]),
    );
  });
  it.each(
    Object.keys(userInput.youthProfile).filter((key) => key !== 'complement'),
  )('rejects missing %s', (key) => {
    const youthProfile = { ...userInput.youthProfile } as Record<
      string,
      string
    >;
    delete youthProfile[key];
    expect(createSchema.safeParse({ ...userInput, youthProfile }).success).toBe(
      false,
    );
  });
});
