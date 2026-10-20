import type { UserRole } from '../enums/user-role.js';
export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}
export interface SessionRecord {
  tokenHash: string;
  userId: string;
  expiresAt: Date;
}
