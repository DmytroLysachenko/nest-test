import * as argon2 from 'argon2';
import { and, desc, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { config } from 'dotenv';
import { Pool } from 'pg';

import { careerProfilesTable, profileInputsTable, usersTable } from '../schema';

config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

type FixtureUser = {
  email: string;
  password: string;
  role: 'admin' | 'user';
  targetRoles: string;
  notes: string;
};

const fixtures: FixtureUser[] = [
  {
    email: 'admin@example.com',
    password: 'admin123',
    role: 'admin',
    targetRoles: 'Frontend Developer, Fullstack Developer',
    notes: 'E2E fixture profile for admin user.',
  },
  {
    email: 'user@example.com',
    password: 'user123',
    role: 'user',
    targetRoles: 'Frontend Developer',
    notes: 'E2E fixture profile for standard user.',
  },
];

const ensureUser = async (fixture: FixtureUser) => {
  const existing = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, fixture.email))
    .limit(1)
    .then((rows) => rows[0]);

  if (existing) {
    return existing;
  }

  const hashedPassword = await argon2.hash(fixture.password);
  const [created] = await db
    .insert(usersTable)
    .values({
      email: fixture.email,
      password: hashedPassword,
      role: fixture.role,
      isEmailVerified: true,
      isActive: true,
      lastLoginAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  return created;
};

const ensureProfileInput = async (userId: string, fixture: FixtureUser) => {
  const existing = await db
    .select()
    .from(profileInputsTable)
    .where(eq(profileInputsTable.userId, userId))
    .orderBy(desc(profileInputsTable.createdAt))
    .limit(1)
    .then((rows) => rows[0]);

  if (existing) {
    return existing;
  }

  const [created] = await db
    .insert(profileInputsTable)
    .values({
      userId,
      targetRoles: fixture.targetRoles,
      notes: fixture.notes,
      updatedAt: new Date(),
    })
    .returning();

  return created;
};

const ensureActiveCareerProfile = async (userId: string, profileInputId: string) => {
  await db
    .update(careerProfilesTable)
    .set({
      isActive: false,
      updatedAt: new Date(),
    })
    .where(eq(careerProfilesTable.userId, userId));

  const latest = await db
    .select({ version: careerProfilesTable.version })
    .from(careerProfilesTable)
    .where(eq(careerProfilesTable.userId, userId))
    .orderBy(desc(careerProfilesTable.version))
    .limit(1)
    .then((rows) => rows[0]);

  const nextVersion = (latest?.version ?? 0) + 1;

  const [created] = await db
    .insert(careerProfilesTable)
    .values({
      userId,
      profileInputId,
      version: nextVersion,
      isActive: true,
      status: 'READY',
      content: 'Fixture career profile generated for e2e smoke tests.',
      contentJson: {
        summary: 'Frontend engineer with practical web stack experience.',
        coreSkills: ['TypeScript', 'React', 'Node.js'],
        preferredRoles: ['Frontend Developer', 'Fullstack Developer'],
        strengths: ['Problem solving', 'Product thinking'],
        gaps: ['Advanced system design'],
        topKeywords: ['frontend', 'typescript', 'react'],
      },
      model: 'fixture',
      error: null,
      updatedAt: new Date(),
    })
    .returning();

  return created;
};

async function seedE2EFixtures() {
  console.log('Seeding e2e fixtures...');

  for (const fixture of fixtures) {
    const user = await ensureUser(fixture);
    const profileInput = await ensureProfileInput(user.id, fixture);
    const careerProfile = await ensureActiveCareerProfile(user.id, profileInput.id);

    console.log(
      `Prepared fixture: ${fixture.email} | active career profile: ${careerProfile.id} | version: ${careerProfile.version}`,
    );
  }

  console.log('E2E fixture seed completed.');
}

seedE2EFixtures()
  .catch((error) => {
    console.error('E2E fixture seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
