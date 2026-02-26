import { canonicalizeCandidateProfile } from './profile-canonicalization';

describe('canonicalizeCandidateProfile', () => {
  it('applies deterministic normalized input for location, salary and role/search enrichment', () => {
    const profile = {
      schemaVersion: '1.0.0',
      candidateCore: {
        headline: 'Frontend',
        summary: 'Summary',
        seniority: { primary: 'mid', secondary: [] },
        languages: [],
      },
      targetRoles: [{ title: 'Frontend Developer', confidenceScore: 0.9, confidenceLevel: 'high', priority: 1 }],
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
          workModes: [],
          employmentTypes: [],
          locations: [],
        },
      },
      searchSignals: {
        keywords: Array.from({ length: 12 }).map((_, index) => ({ value: `kw-${index}`, weight: 0.6 })),
        specializations: [{ value: 'frontend', weight: 1 }],
        technologies: Array.from({ length: 6 }).map((_, index) => ({ value: `tech-${index}`, weight: 0.6 })),
      },
      riskAndGrowth: {
        gaps: [],
        growthDirections: [],
        transferableStrengths: [],
      },
    } as const;

    const normalizedInput = {
      roles: [
        { name: 'Junior Frontend Developer', aliases: [], priority: 1 },
        { name: 'Junior Fullstack Developer', aliases: [], priority: 2 },
      ],
      seniority: ['junior'],
      specializations: ['frontend', 'fullstack'],
      technologies: ['react', 'typescript', 'node.js'],
      workModes: ['remote', 'hybrid'],
      workTime: ['full-time'],
      contractTypes: ['uop', 'b2b'],
      locations: [{ city: 'Gdynia', country: 'PL', radiusKm: 35 }],
      salary: { min: 12000, currency: 'PLN', period: 'month' },
      languages: [],
      constraints: {
        noPolishRequired: false,
        ukrainiansWelcome: false,
        onlyEmployerOffers: false,
        onlyWithProjectDescription: false,
      },
      searchPreferences: {
        sourceKind: 'it',
        seniority: ['junior'],
        workModes: ['remote', 'hybrid'],
        employmentTypes: ['uop', 'b2b'],
        timeModes: ['full-time'],
        salaryMin: 12000,
        city: 'Gdynia',
        radiusKm: 35,
        keywords: ['Junior Frontend Developer', 'React', 'TypeScript'],
      },
      freeText: '',
    } as const;

    const result = canonicalizeCandidateProfile(profile as any, normalizedInput as any);

    expect(result.candidateCore.seniority.primary).toBe('junior');
    expect(result.workPreferences.hardConstraints.locations[0]?.city).toBe('Gdynia');
    expect(result.workPreferences.hardConstraints.locations[0]?.radiusKm).toBe(35);
    expect(result.workPreferences.hardConstraints.minSalary?.amount).toBe(12000);
    expect(result.targetRoles.some((item) => item.title === 'Junior Fullstack Developer')).toBe(true);
    expect(result.searchSignals.technologies.some((item) => item.value === 'React')).toBe(true);
    expect(result.searchSignals.keywords.some((item) => item.value === 'Junior Frontend Developer')).toBe(true);
  });
});

