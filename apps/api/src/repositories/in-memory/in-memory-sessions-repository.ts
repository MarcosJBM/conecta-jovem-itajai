import type { SessionRecord } from '../../domain/types/auth.js';
import type { SessionsRepository } from '../sessions-repository.js';

export class InMemorySessionsRepository implements SessionsRepository {
  items = new Map<string, SessionRecord>();

  async create(session: SessionRecord) {
    this.items.set(session.tokenHash, structuredClone(session));
  }

  async find(tokenHash: string) {
    return structuredClone(this.items.get(tokenHash) ?? null);
  }

  async delete(tokenHash: string) {
    this.items.delete(tokenHash);
  }
}
