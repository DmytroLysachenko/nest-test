import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Role } from '../auth/role.enum';
import { SafeUser, UsagePolicy, User } from './user.entity';

interface SeedUser {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  password: string;
}

@Injectable()
export class UsersService {
  private readonly users: User[];
  private readonly usagePolicies: Record<Role, UsagePolicy>;

  constructor() {
    const seedUsers: SeedUser[] = [
      {
        id: 'u-guest',
        email: 'guest@example.com',
        displayName: 'Guest Account',
        role: Role.Guest,
        password: 'guestpass',
      },
      {
        id: 'u-user',
        email: 'user@example.com',
        displayName: 'Standard User',
        role: Role.User,
        password: 'userpass',
      },
      {
        id: 'u-premium',
        email: 'premium@example.com',
        displayName: 'Premium User',
        role: Role.UserPremium,
        password: 'premiumpass',
      },
      {
        id: 'u-admin',
        email: 'admin@example.com',
        displayName: 'Administrator',
        role: Role.Admin,
        password: 'adminpass',
      },
    ];

    this.users = seedUsers.map(
      ({ password, ...rest }): User => ({
        ...rest,
        passwordHash: bcrypt.hashSync(password, 10),
      }),
    );

    this.usagePolicies = {
      [Role.Guest]: {
        role: Role.Guest,
        maxJobApplicationsPerDay: 0,
        maxSavedJobs: 5,
        maxSavedSearches: 1,
        canAccessInsights: false,
        canManageUsers: false,
      },
      [Role.User]: {
        role: Role.User,
        maxJobApplicationsPerDay: 5,
        maxSavedJobs: 30,
        maxSavedSearches: 3,
        canAccessInsights: false,
        canManageUsers: false,
      },
      [Role.UserPremium]: {
        role: Role.UserPremium,
        maxJobApplicationsPerDay: 20,
        maxSavedJobs: 200,
        maxSavedSearches: 10,
        canAccessInsights: true,
        canManageUsers: false,
      },
      [Role.Admin]: {
        role: Role.Admin,
        maxJobApplicationsPerDay: Number.MAX_SAFE_INTEGER,
        maxSavedJobs: Number.MAX_SAFE_INTEGER,
        maxSavedSearches: Number.MAX_SAFE_INTEGER,
        canAccessInsights: true,
        canManageUsers: true,
      },
    };
  }

  async findByEmail(email: string): Promise<User | null> {
    const normalizedEmail = email.toLowerCase();
    const user = this.users.find((u) => u.email.toLowerCase() === normalizedEmail);
    return user ?? null;
  }

  async findById(id: string): Promise<User | null> {
    const user = this.users.find((u) => u.id === id);
    return user ?? null;
  }

  async isPasswordValid(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.passwordHash);
  }

  toSafeUser(user: User): SafeUser {
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }

  getUsagePolicyForRole(role: Role): UsagePolicy {
    return this.usagePolicies[role] ?? this.usagePolicies[Role.Guest];
  }
}
