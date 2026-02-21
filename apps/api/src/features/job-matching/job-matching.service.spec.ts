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
    expect(result.matchedCompetencies.map((item) => item.name)).toEqual(expect.arrayContaining(['React', 'TypeScript']));
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
});
