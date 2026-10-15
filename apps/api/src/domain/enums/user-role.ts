export const userRoles = ['YOUTH', 'COMPANY', 'ADMIN'] as const;
export type UserRole = (typeof userRoles)[number];
