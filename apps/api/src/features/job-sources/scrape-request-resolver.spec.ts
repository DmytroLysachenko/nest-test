import { buildFiltersFromProfile } from './scrape-request-resolver';

const profileFixture = {
  schemaVersion: '1.0.0',
  candidateCore: {
    headline: 'Junior Frontend Developer',
    summary: 'Summary',
    seniority: { primary: 'junior', secondary: [] },
    languages: [],
  },
  targetRoles: [{ title: 'Junior Frontend Developer', confidenceScore: 0.9, confidenceLevel: 'high', priority: 1 }],
  competencies: Array.from({ length: 8 }).map((_, index) => ({
    name: `Skill ${index}`,
    type: 'technology',
    confidenceScore: 0.8,
    confidenceLevel: 'high',
    importance: 'medium',
    evidence: ['cv'],
    isTransferable: false,
  })),
  workPreferences: {
    hardConstraints: {
      workModes: ['remote'],
      employmentTypes: ['uop'],
      locations: [{ city: 'Tricity', country: 'PL' }],
      noPolishRequired: false,
      onlyEmployerOffers: false,
      onlyWithProjectDescription: false,
    },
    softPreferences: {
      workModes: [{ value: 'hybrid', weight: 0.6 }],
      employmentTypes: [],
      locations: [],
    },
  },
  searchSignals: {
    keywords: Array.from({ length: 12 }).map((_, index) => ({ value: `kw-${index}`, weight: 0.6 })),
    specializations: [
      { value: 'Frontend Development', weight: 1 },
      { value: 'Backend Development', weight: 0.7 },
    ],
    technologies: Array.from({ length: 6 }).map((_, index) => ({ value: `tech-${index}`, weight: 0.6 })),
  },
  riskAndGrowth: {
    gaps: [],
    growthDirections: [],
    transferableStrengths: [],
  },
} as const;

describe('buildFiltersFromProfile', () => {
  it('maps fuzzy specialization labels and canonicalizes tricity location', () => {
    const filters = buildFiltersFromProfile(profileFixture as any);

    expect(filters).toBeDefined();
    expect(filters?.specializations).toEqual(expect.arrayContaining(['frontend', 'backend']));
    expect(filters?.location).toBe('Gdynia');
    expect(filters?.radiusKm).toBe(35);
    expect(filters?.keywords).toBe('junior frontend');
  });

  it('builds focused role keyword phrase and avoids noisy keyword concatenation', () => {
    const filters = buildFiltersFromProfile({
      ...profileFixture,
      targetRoles: [
        { title: 'Frontend Engineer', confidenceScore: 0.95, confidenceLevel: 'high', priority: 1 },
        { title: 'Junior Fullstack Engineer', confidenceScore: 0.92, confidenceLevel: 'high', priority: 2 },
      ],
      searchSignals: {
        ...profileFixture.searchSignals,
        keywords: [
          { value: 'typescript', weight: 0.9 },
          { value: 'frontend', weight: 0.8 },
          { value: 'java', weight: 0.8 },
          { value: 'no code', weight: 0.7 },
        ],
      },
    } as any);

    expect(filters?.keywords).toBe('junior frontend');
    expect(filters?.keywords).not.toContain('java');
  });

  it('ignores soft-only constraints for scrape narrowing filters', () => {
    const filters = buildFiltersFromProfile({
      ...profileFixture,
      workPreferences: {
        hardConstraints: {
          ...profileFixture.workPreferences.hardConstraints,
          workModes: [],
          employmentTypes: [],
          locations: [],
          minSalary: undefined,
        },
        softPreferences: {
          workModes: [{ value: 'hybrid', weight: 1 }],
          employmentTypes: [{ value: 'b2b', weight: 1 }],
          locations: [{ value: { city: 'Warsaw', radiusKm: 100, country: 'PL' }, weight: 1 }],
          salary: { value: { amount: 22000, currency: 'PLN', period: 'month' }, weight: 1 },
        },
      },
    } as any);

    expect(filters?.keywords).toBe('junior frontend');
    expect(filters?.workModes).toBeUndefined();
    expect(filters?.contractTypes).toBeUndefined();
    expect(filters?.location).toBeUndefined();
    expect(filters?.radiusKm).toBeUndefined();
    expect(filters?.salaryMin).toBeUndefined();
  });
});
