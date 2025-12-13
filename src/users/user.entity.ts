import { Role } from '../auth/role.enum';

export interface User {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string;
  role: Role;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export type SafeUser = Omit<User, 'passwordHash'>;

export interface UsagePolicy {
  role: Role;
  maxJobApplicationsPerDay: number;
  maxSavedJobs: number;
  maxSavedSearches: number;
  canAccessInsights: boolean;
  canManageUsers: boolean;
}
