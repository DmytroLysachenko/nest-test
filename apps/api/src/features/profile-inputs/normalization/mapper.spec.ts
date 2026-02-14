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
});
