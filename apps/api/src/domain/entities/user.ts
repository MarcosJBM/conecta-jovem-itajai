import type { UserRole } from '../enums/user-role.js';
export interface Profile {
  id: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}
export interface YouthRegistration {
  firstName: string;
  lastName: string;
  birthDate: Date;
  phone: string;
  cpf: string;
  postalCode: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
}
export type YouthProfile = Profile & {
  [K in keyof YouthRegistration]: YouthRegistration[K] | null;
};
export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  youthProfile: YouthProfile | null;
  companyProfile: Profile | null;
  createdAt: Date;
  updatedAt: Date;
}
export type PublicUser = Omit<User, 'passwordHash' | 'youthProfile'> & {
  youthProfile: Profile | null;
};
export function toPublicUser(user: User): PublicUser {
  const { passwordHash: _passwordHash, youthProfile, ...publicUser } = user;
  return {
    ...publicUser,
    youthProfile: youthProfile
      ? {
          id: youthProfile.id,
          userId: youthProfile.userId,
          createdAt: youthProfile.createdAt,
          updatedAt: youthProfile.updatedAt,
        }
      : null,
  };
}
