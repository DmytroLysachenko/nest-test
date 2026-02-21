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

const ensureActiveCareerProfile = async (userId: string, profileInputId: string, fixture: FixtureUser) => {
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
        schemaVersion: '1.0.0',
        candidateCore: {
          fullName: fixture.email.split('@')[0],
          headline: 'Frontend engineer with practical web stack experience',
          summary: 'Frontend-focused engineer with TypeScript and React, open to fullstack roles.',
          totalExperienceYears: 4,
          seniority: {
            primary: 'mid',
            secondary: ['senior'],
          },
          languages: [
            { code: 'pl', level: 'native' },
            { code: 'en', level: 'b2' },
          ],
        },
        targetRoles: [
          {
            title: 'Frontend Developer',
            confidenceScore: 0.95,
            confidenceLevel: 'high',
            priority: 1,
            rationale: 'Primary hands-on experience in React + TypeScript',
          },
          {
            title: 'Fullstack Developer',
            confidenceScore: 0.7,
            confidenceLevel: 'medium',
            priority: 2,
            rationale: 'Solid backend basics with Node.js',
          },
        ],
        competencies: [
          {
            name: 'TypeScript',
            type: 'technology',
            confidenceScore: 0.95,
            confidenceLevel: 'high',
            importance: 'high',
            evidence: ['Production SPA development'],
            yearsUsed: 4,
            recencyMonths: 0,
            isTransferable: false,
          },
          {
            name: 'React',
            type: 'technology',
            confidenceScore: 0.95,
            confidenceLevel: 'high',
            importance: 'high',
            evidence: ['Daily frontend delivery'],
            yearsUsed: 4,
            recencyMonths: 0,
            isTransferable: false,
          },
          {
            name: 'Node.js',
            type: 'technology',
            confidenceScore: 0.65,
            confidenceLevel: 'medium',
            importance: 'medium',
            evidence: ['API development'],
            yearsUsed: 2,
            recencyMonths: 1,
            isTransferable: true,
          },
          {
            name: 'JavaScript',
            type: 'technology',
            confidenceScore: 0.9,
            confidenceLevel: 'high',
            importance: 'high',
            evidence: ['Frontend app delivery'],
            yearsUsed: 5,
            recencyMonths: 0,
            isTransferable: false,
          },
          {
            name: 'HTML',
            type: 'technology',
            confidenceScore: 0.9,
            confidenceLevel: 'high',
            importance: 'medium',
            evidence: ['UI implementation'],
            yearsUsed: 5,
            recencyMonths: 0,
            isTransferable: false,
          },
          {
            name: 'CSS',
            type: 'technology',
            confidenceScore: 0.88,
            confidenceLevel: 'high',
            importance: 'medium',
            evidence: ['UI implementation'],
            yearsUsed: 5,
            recencyMonths: 0,
            isTransferable: false,
          },
        ],
        workPreferences: {
          hardConstraints: {
            workModes: ['remote'],
            employmentTypes: ['uop', 'b2b'],
            locations: [{ city: 'Gdynia', country: 'PL', radiusKm: 35 }],
            minSalary: { amount: 16000, currency: 'PLN', period: 'month' },
            noPolishRequired: false,
            onlyEmployerOffers: false,
            onlyWithProjectDescription: false,
          },
          softPreferences: {
            workModes: [{ value: 'hybrid', weight: 0.6 }],
            employmentTypes: [{ value: 'b2b', weight: 0.7 }],
            locations: [{ value: { city: 'Gdansk', country: 'PL', radiusKm: 45 }, weight: 0.4 }],
            salary: { value: { amount: 18000, currency: 'PLN', period: 'month' }, weight: 0.5 },
          },
        },
        searchSignals: {
          keywords: [
            { value: 'frontend', weight: 1 },
            { value: 'typescript', weight: 1 },
            { value: 'react', weight: 1 },
            { value: 'javascript', weight: 0.95 },
            { value: 'html', weight: 0.8 },
            { value: 'css', weight: 0.8 },
            { value: 'web performance', weight: 0.6 },
            { value: 'responsive design', weight: 0.6 },
            { value: 'ui', weight: 0.7 },
            { value: 'git', weight: 0.6 },
          ],
          specializations: [
            { value: 'frontend', weight: 1 },
            { value: 'fullstack', weight: 0.45 },
          ],
          technologies: [
            { value: 'react', weight: 1 },
            { value: 'typescript', weight: 1 },
            { value: 'node.js', weight: 0.55 },
            { value: 'javascript', weight: 0.95 },
            { value: 'html', weight: 0.8 },
          ],
        },
        riskAndGrowth: {
          gaps: ['Advanced system design'],
          growthDirections: ['Backend architecture', 'Cloud deployment'],
          transferableStrengths: ['Problem solving', 'Product thinking'],
        },
      },
      model: 'fixture',
      primarySeniority: 'mid',
      targetRoles: ['Frontend Developer', 'Fullstack Developer'],
      searchableKeywords: [
        'frontend',
        'typescript',
        'react',
        'javascript',
        'html',
        'css',
        'web performance',
        'responsive design',
        'ui',
        'git',
      ],
      searchableTechnologies: ['react', 'typescript', 'node.js', 'javascript', 'html'],
      preferredWorkModes: ['remote', 'hybrid'],
      preferredEmploymentTypes: ['uop', 'b2b'],
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
    const careerProfile = await ensureActiveCareerProfile(user.id, profileInput.id, fixture);

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
