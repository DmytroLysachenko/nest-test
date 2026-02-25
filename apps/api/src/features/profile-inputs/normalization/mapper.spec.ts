import { normalizeProfileInput } from './mapper';

describe('normalizeProfileInput', () => {
  it('normalizes mixed PL/EN input into canonical structure', () => {
    const result = normalizeProfileInput({
      targetRoles: 'Senior Frontend Developer, React Engineer',
      notes:
        'Szukam pracy zdalnie lub hybrydowo, B2B, Warszawa 30 km, min 20k PLN mies, angielski c1, bez polskiego',
    });

    expect(result.normalizedInput.roles.length).toBe(2);
    expect(result.normalizedInput.seniority).toContain('senior');
    expect(result.normalizedInput.specializations).toContain('frontend');
    expect(result.normalizedInput.workModes).toEqual(expect.arrayContaining(['remote', 'hybrid']));
    expect(result.normalizedInput.contractTypes).toContain('b2b');
    expect(result.normalizedInput.locations[0]).toMatchObject({ city: 'Warszawa', radiusKm: 30, country: 'PL' });
    expect(result.normalizedInput.salary).toMatchObject({ min: 20000, currency: 'PLN', period: 'month' });
    expect(result.normalizedInput.languages).toEqual(expect.arrayContaining([{ code: 'en', level: 'c1' }]));
    expect(result.normalizedInput.constraints.noPolishRequired).toBe(true);
    expect(result.normalizedInput.searchPreferences).toMatchObject({
      sourceKind: 'it',
      city: 'Warszawa',
      radiusKm: 30,
      salaryMin: 20000,
    });
    expect(result.normalizedInput.searchPreferences.keywords.length).toBeGreaterThan(0);
    expect(result.normalizationMeta.status).toBe('ok');
  });

  it('returns failed status when roles are missing', () => {
    const result = normalizeProfileInput({
      targetRoles: '',
      notes: 'just random note',
    });

    expect(result.normalizationMeta.status).toBe('failed');
    expect(result.normalizationMeta.errors).toEqual(
      expect.arrayContaining([{ code: 'MISSING_ROLES', value: '(empty)' }]),
    );
  });

  it('prioritizes structured intake payload when provided', () => {
    const result = normalizeProfileInput({
      targetRoles: 'legacy role',
      notes: 'legacy note',
      intakePayload: {
        desiredPositions: ['Backend Developer', 'Platform Engineer'],
        jobDomains: ['IT', 'DevOps'],
        coreSkills: ['Node.js', 'Docker', 'Kubernetes'],
        experienceYearsInRole: 5,
        targetSeniority: ['senior'],
        workModePreferences: {
          hard: ['remote'],
          soft: [{ value: 'hybrid', weight: 0.6 }],
        },
        contractPreferences: {
          hard: ['b2b'],
          soft: [{ value: 'uop', weight: 0.5 }],
        },
        sectionNotes: {
          positions: 'platform/backend',
          domains: 'infra and delivery',
          skills: 'apis and automation',
          experience: 'production ownership',
          preferences: 'remote first',
        },
        generalNotes: 'open to product companies',
      },
    });

    expect(result.normalizedInput.roles.map((item) => item.name)).toEqual(
      expect.arrayContaining(['Backend Developer', 'Platform Engineer']),
    );
    expect(result.normalizedInput.contractTypes).toEqual(expect.arrayContaining(['b2b', 'uop']));
    expect(result.normalizedInput.workModes).toEqual(expect.arrayContaining(['remote', 'hybrid']));
    expect(result.normalizedInput.technologies).toEqual(
      expect.arrayContaining(['node.js', 'docker', 'kubernetes']),
    );
    expect(result.normalizationMeta.status).toBe('ok');
    expect(result.normalizationMeta.rawSnapshot.intakePayload?.desiredPositions).toEqual(
      expect.arrayContaining(['Backend Developer']),
    );
  });
});
