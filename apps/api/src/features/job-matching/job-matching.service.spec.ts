import { JobMatchingService } from './job-matching.service';

describe('JobMatchingService scoring', () => {
  it('uses normalized profile input to improve deterministic matching coverage', () => {
    const service = new JobMatchingService({} as any);

    const result = (service as any).calculateScore(
      'We need a senior frontend developer with React and TypeScript for a remote role.',
      {
        coreSkills: [],
        preferredRoles: [],
        strengths: [],
        topKeywords: [],
      },
      {
        roles: [{ name: 'Frontend Developer', aliases: [], priority: 1 }],
        seniority: ['senior'],
        specializations: ['frontend'],
        technologies: ['react', 'typescript'],
        workModes: ['remote'],
        workTime: [],
        contractTypes: [],
        locations: [],
        salary: null,
        languages: [],
        constraints: {
          noPolishRequired: false,
          ukrainiansWelcome: false,
          onlyEmployerOffers: false,
          onlyWithProjectDescription: false,
        },
        freeText: '',
      },
    );

    expect(result.score).toBeGreaterThan(0);
    expect(result.matchedSkills).toEqual(expect.arrayContaining(['react', 'typescript', 'frontend']));
    expect(result.matchedRoles).toEqual(expect.arrayContaining(['senior', 'frontend', 'developer']));
  });
});

