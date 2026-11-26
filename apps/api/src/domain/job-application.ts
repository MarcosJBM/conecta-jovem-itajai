export const applicationStatuses = [
  'RECEIVED',
  'IN_REVIEW',
  'APPROVED',
  'REJECTED',
] as const;
export type ApplicationStatus = (typeof applicationStatuses)[number];

export const applicationTransitions: Record<
  ApplicationStatus,
  readonly ApplicationStatus[]
> = {
  RECEIVED: ['IN_REVIEW'],
  IN_REVIEW: ['APPROVED', 'REJECTED'],
  APPROVED: [],
  REJECTED: [],
};
