import type { SessionRecord } from '../domain/types/auth.js';
export interface SessionsRepository {
  create(session: SessionRecord): Promise<void>;
  find(tokenHash: string): Promise<SessionRecord | null>;
  delete(tokenHash: string): Promise<void>;
}
