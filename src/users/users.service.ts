import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { Role } from '../auth/role.enum';
import { SafeUser, UsagePolicy, User } from './user.entity';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService implements OnModuleInit {
  private readonly usagePolicies: Record<Role, UsagePolicy>;

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly configService: ConfigService,
  ) {
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

  async onModuleInit() {
    const shouldSeed =
      this.configService
        .get<string>('SEED_DEMO_USERS', 'false')
        .toLowerCase() === 'true';

    if (shouldSeed) {
      await this.seedDemoUsers();
    }
  }

  private async seedDemoUsers() {
    const seedUsers = [
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

    for (const user of seedUsers) {
      await this.usersRepository.upsertUser({
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        passwordHash: bcrypt.hashSync(user.password, 10),
      });
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findByEmail(email);
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findById(id);
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
