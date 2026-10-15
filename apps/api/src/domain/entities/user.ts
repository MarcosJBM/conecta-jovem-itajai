import type { UserRole } from '../enums/user-role.js';
export interface Profile {
  id: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}
export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  youthProfile: Profile | null;
  companyProfile: Profile | null;
  createdAt: Date;
  updatedAt: Date;
}
export type PublicUser = Omit<User, 'passwordHash'>;
export function toPublicUser(user: User): PublicUser {
  const { passwordHash: _passwordHash, ...publicUser } = user;
  return publicUser;
}
