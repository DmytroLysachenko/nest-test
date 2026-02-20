import { CareerProfilesService } from './career-profiles.service';

describe('CareerProfilesService prompt builder', () => {
  it('injects normalized input context into prompt', () => {
    const service = new CareerProfilesService({} as any, {} as any);

    const prompt = (service as any).buildPrompt(
      'Frontend Developer',
      'note',
      [
        {
          storagePath: 'docs/cv.pdf',
          originalName: 'cv.pdf',
          mimeType: 'application/pdf',
          extractedText: 'Some text',
          extractedAt: new Date('2026-02-14T00:00:00.000Z'),
        },
      ],
      undefined,
      {
        roles: [{ name: 'Frontend Developer', aliases: [], priority: 1 }],
        seniority: ['mid'],
        specializations: ['frontend'],
        technologies: ['typescript', 'react'],
        workModes: ['remote'],
        workTime: ['full-time'],
        contractTypes: ['b2b'],
        locations: [],
        salary: null,
        languages: [],
        constraints: {
          noPolishRequired: false,
          ukrainiansWelcome: false,
          onlyEmployerOffers: false,
          onlyWithProjectDescription: false,
        },
        searchPreferences: {
          sourceKind: 'it',
          seniority: ['mid'],
          workModes: ['remote'],
          employmentTypes: ['b2b'],
          timeModes: ['full-time'],
          salaryMin: null,
          city: null,
          radiusKm: null,
          keywords: ['Frontend Developer', 'frontend', 'typescript', 'react'],
        },
        freeText: 'note',
      },
      {
        mapperVersion: 'v1.1.0',
        status: 'ok',
        warnings: [],
        errors: [],
        rawSnapshot: {
          targetRoles: 'Frontend Developer',
          notes: 'note',
        },
      },
    );

    expect(prompt).toContain('Normalized profile input (canonical, deterministic):');
    expect(prompt).toContain('"specializations": [');
    expect(prompt).toContain('Normalization status: ok (v1.1.0)');
  });
});
