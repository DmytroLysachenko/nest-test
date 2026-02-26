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
  });
});
