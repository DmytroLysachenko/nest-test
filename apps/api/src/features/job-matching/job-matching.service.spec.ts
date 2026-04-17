import { JobMatchingService } from './job-matching.service';
import { scoreCandidateAgainstJob } from './candidate-matcher';

describe('JobMatchingService scoring', () => {
  it('scores candidate profile with hard/soft constraints', () => {
    const result = scoreCandidateAgainstJob(
      {
        schemaVersion: '1.0.0',
        candidateCore: {
          headline: 'Frontend Engineer',
          summary: 'Frontend engineer with React/TypeScript focus.',
          seniority: {
            primary: 'senior',
            secondary: [],
          },
          languages: [],
        },
        targetRoles: [
          {
            title: 'Frontend Developer',
            confidenceScore: 0.9,
            confidenceLevel: 'high',
            priority: 1,
          },
        ],
        competencies: [
          {
            name: 'React',
            type: 'technology',
            confidenceScore: 0.9,
            confidenceLevel: 'high',
            importance: 'high',
            evidence: ['5 years in production'],
            isTransferable: false,
          },
          {
            name: 'TypeScript',
            type: 'technology',
            confidenceScore: 0.85,
            confidenceLevel: 'high',
            importance: 'high',
            evidence: ['daily usage'],
            isTransferable: false,
          },
        ],
        workPreferences: {
          hardConstraints: {
            workModes: ['remote'],
            employmentTypes: [],
            locations: [],
            noPolishRequired: false,
            onlyEmployerOffers: false,
            onlyWithProjectDescription: false,
          },
          softPreferences: {
            workModes: [{ value: 'remote', weight: 1 }],
            employmentTypes: [{ value: 'b2b', weight: 0.6 }],
            locations: [],
          },
        },
        searchSignals: {
          keywords: [{ value: 'frontend', weight: 1 }],
          specializations: [{ value: 'frontend', weight: 1 }],
          technologies: [{ value: 'react', weight: 1 }],
        },
        riskAndGrowth: {
          gaps: [],
          growthDirections: [],
          transferableStrengths: ['problem solving'],
        },
      },
      {
        text: 'Senior frontend developer role. Remote B2B with React and TypeScript.',
      },
    );

    expect(result.score).toBeGreaterThan(0);
    expect(result.hardConstraintViolations).toHaveLength(0);
    expect(result.softPreferenceGaps).toEqual([]);
    expect(result.matchedCompetencies.map((item) => item.name)).toEqual(
      expect.arrayContaining(['React', 'TypeScript']),
    );
  });

  it('blocks higher seniority jobs when candidate seniority is lower', () => {
    const result = scoreCandidateAgainstJob(
      {
        schemaVersion: '1.0.0',
        candidateCore: {
          headline: 'Junior Frontend Engineer',
          summary: 'Junior frontend profile',
          seniority: {
            primary: 'junior',
            secondary: [],
          },
          languages: [],
        },
        targetRoles: [
          {
            title: 'Frontend Developer',
            confidenceScore: 0.8,
            confidenceLevel: 'medium',
            priority: 1,
          },
        ],
        competencies: [
          {
            name: 'React',
            type: 'technology',
            confidenceScore: 0.8,
            confidenceLevel: 'medium',
            importance: 'high',
            evidence: ['projects'],
            isTransferable: false,
          },
        ],
        workPreferences: {
          hardConstraints: {
            workModes: [],
            employmentTypes: [],
            locations: [],
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
          keywords: [{ value: 'frontend', weight: 1 }],
          specializations: [{ value: 'frontend', weight: 1 }],
          technologies: [{ value: 'react', weight: 1 }],
        },
        riskAndGrowth: {
          gaps: [],
          growthDirections: [],
          transferableStrengths: [],
        },
      },
      {
        text: 'Senior Frontend Developer role with React.',
      },
    );

    expect(result.hardConstraintViolations).toContain('seniority');
    expect(result.blockedByHardConstraints).toBe(true);
  });

  it('recognizes broader wording aliases for seniority, work mode, and employment type', () => {
    const result = scoreCandidateAgainstJob(
      {
        schemaVersion: '1.0.0',
        candidateCore: {
          headline: 'Junior Frontend Engineer',
          summary: 'Junior frontend profile',
          seniority: { primary: 'junior', secondary: [] },
          languages: [],
        },
        targetRoles: [{ title: 'Frontend Developer', confidenceScore: 0.8, confidenceLevel: 'medium', priority: 1 }],
        competencies: [],
        workPreferences: {
          hardConstraints: {
            workModes: ['remote'],
            employmentTypes: ['uop'],
            locations: [],
            noPolishRequired: false,
            onlyEmployerOffers: false,
            onlyWithProjectDescription: false,
          },
          softPreferences: { workModes: [], employmentTypes: [], locations: [] },
        },
        searchSignals: { keywords: [], specializations: [], technologies: [] },
        riskAndGrowth: { gaps: [], growthDirections: [], transferableStrengths: [] },
      } as any,
      {
        text: 'Associate frontend engineer. Fully remote. Employment agreement.',
      },
    );

    expect(result.hardConstraintViolations).not.toContain('employmentTypes');
    expect(result.hardConstraintViolations).not.toContain('workModes');
    expect(result.hardConstraintViolations).not.toContain('seniority');
  });

  it('treats missing work mode and employment wording as soft gaps instead of hard blockers', () => {
    const result = scoreCandidateAgainstJob(
      {
        schemaVersion: '1.0.0',
        candidateCore: {
          headline: 'Junior Frontend Engineer',
          summary: 'Junior frontend profile',
          seniority: { primary: 'junior', secondary: [] },
          languages: [],
        },
        targetRoles: [{ title: 'Frontend Developer', confidenceScore: 0.8, confidenceLevel: 'medium', priority: 1 }],
        competencies: [],
        workPreferences: {
          hardConstraints: {
            workModes: ['remote'],
            employmentTypes: ['uop'],
            locations: [],
            noPolishRequired: false,
            onlyEmployerOffers: false,
            onlyWithProjectDescription: false,
          },
          softPreferences: { workModes: [], employmentTypes: [], locations: [] },
        },
        searchSignals: { keywords: [], specializations: [], technologies: [] },
        riskAndGrowth: { gaps: [], growthDirections: [], transferableStrengths: [] },
      } as any,
      {
        text: 'Junior frontend engineer role with React and TypeScript.',
      },
    );

    expect(result.hardConstraintViolations).not.toContain('employmentTypes');
    expect(result.hardConstraintViolations).not.toContain('workModes');
    expect(result.softPreferenceGaps).toEqual(
      expect.arrayContaining(['employmentTypes:unspecified', 'workModes:unspecified']),
    );
  });

  it('treats unknown salary as a soft gap instead of a hard blocker', () => {
    const result = scoreCandidateAgainstJob(
      {
        schemaVersion: '1.0.0',
        candidateCore: {
          headline: 'Frontend Engineer',
          summary: 'Frontend profile',
          seniority: { primary: 'mid', secondary: [] },
          languages: [],
        },
        targetRoles: [{ title: 'Frontend Developer', confidenceScore: 0.8, confidenceLevel: 'medium', priority: 1 }],
        competencies: [],
        workPreferences: {
          hardConstraints: {
            workModes: [],
            employmentTypes: [],
            locations: [],
            minSalary: { amount: 18000, currency: 'PLN', period: 'month' },
            noPolishRequired: false,
            onlyEmployerOffers: false,
            onlyWithProjectDescription: false,
          },
          softPreferences: { workModes: [], employmentTypes: [], locations: [] },
        },
        searchSignals: { keywords: [], specializations: [], technologies: [] },
        riskAndGrowth: { gaps: [], growthDirections: [], transferableStrengths: [] },
      } as any,
      {
        text: 'Frontend developer role with product work.',
      },
    );

    expect(result.hardConstraintViolations).not.toContain('minSalary');
    expect(result.softPreferenceGaps).toContain('minSalary:unknown');
    expect(result.evidence.salary).toBe('unknown');
  });

  it('uses structured salary for hard salary mismatches', () => {
    const result = scoreCandidateAgainstJob(
      {
        schemaVersion: '1.0.0',
        candidateCore: {
          headline: 'Frontend Engineer',
          summary: 'Frontend profile',
          seniority: { primary: 'mid', secondary: [] },
          languages: [],
        },
        targetRoles: [],
        competencies: [],
        workPreferences: {
          hardConstraints: {
            workModes: [],
            employmentTypes: [],
            locations: [],
            minSalary: { amount: 18000, currency: 'PLN', period: 'month' },
            noPolishRequired: false,
            onlyEmployerOffers: false,
            onlyWithProjectDescription: false,
          },
          softPreferences: { workModes: [], employmentTypes: [], locations: [] },
        },
        searchSignals: { keywords: [], specializations: [], technologies: [] },
        riskAndGrowth: { gaps: [], growthDirections: [], transferableStrengths: [] },
      } as any,
      {
        text: 'Frontend developer role.',
        salaryMin: 12000,
        salaryMax: 15000,
      },
    );

    expect(result.hardConstraintViolations).toContain('minSalary');
    expect(result.evidence.salary).toBe('structured');
  });

  it('matches common technology aliases deterministically', () => {
    const result = scoreCandidateAgainstJob(
      {
        schemaVersion: '1.0.0',
        candidateCore: {
          headline: 'Frontend Engineer',
          summary: 'Frontend profile',
          seniority: { primary: 'senior', secondary: [] },
          languages: [],
        },
        targetRoles: [],
        competencies: [
          {
            name: 'TypeScript',
            type: 'technology',
            confidenceScore: 0.9,
            confidenceLevel: 'high',
            importance: 'high',
            evidence: [],
            isTransferable: false,
          },
        ],
        workPreferences: {
          hardConstraints: {
            workModes: [],
            employmentTypes: [],
            locations: [],
            noPolishRequired: false,
            onlyEmployerOffers: false,
            onlyWithProjectDescription: false,
          },
          softPreferences: { workModes: [], employmentTypes: [], locations: [] },
        },
        searchSignals: { keywords: [], specializations: [], technologies: [] },
        riskAndGrowth: { gaps: [], growthDirections: [], transferableStrengths: [] },
      },
      {
        text: 'Senior frontend role using TS and React.',
      },
    );

    expect(result.matchedCompetencies.map((item) => item.name)).toContain('TypeScript');
  });
});
