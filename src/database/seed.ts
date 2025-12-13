import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { Role } from '../auth/role.enum';
import { DatabaseService } from './database.service';
import { UsersRepository } from '../users/users.repository';

async function seed() {
  const configService = new ConfigService();
  const databaseService = new DatabaseService(configService);
  const usersRepository = new UsersRepository(databaseService.db);

  const seeds = [
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

  for (const user of seeds) {
    await usersRepository.upsertUser({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      passwordHash: bcrypt.hashSync(user.password, 10),
    });
  }

  await databaseService.onModuleDestroy();

  console.log('Seed completed. Demo users are ready.');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
