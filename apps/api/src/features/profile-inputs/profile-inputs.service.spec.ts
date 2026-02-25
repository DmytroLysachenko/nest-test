import { profileInputsTable } from '@repo/db';

import { ProfileInputsService } from './profile-inputs.service';

describe('ProfileInputsService', () => {
  it('persists normalized payload and metadata on create', async () => {
    const insertValues: Array<Record<string, unknown>> = [];
    const db = {
      insert: jest.fn().mockImplementation((table) => {
        if (table !== profileInputsTable) {
          throw new Error('Unexpected insert table');
        }
        return {
          values: jest.fn().mockImplementation((value: Record<string, unknown>) => {
            insertValues.push(value);
            return {
              returning: jest.fn().mockResolvedValue([{ id: 'pi-1', ...value }]),
            };
          }),
        };
      }),
    } as any;

    const service = new ProfileInputsService(db);
    await service.create('user-1', {
      intakePayload: {
        desiredPositions: ['Frontend Developer'],
        jobDomains: ['IT'],
        coreSkills: ['React', 'TypeScript'],
        experienceYearsInRole: 3,
        targetSeniority: ['mid'],
        workModePreferences: { hard: ['remote'], soft: [] },
        contractPreferences: { hard: ['b2b'], soft: [] },
        sectionNotes: {},
        generalNotes: 'B2B, remote, React',
      },
    });

    expect(insertValues).toHaveLength(1);
    expect(insertValues[0].normalizedInput).toBeDefined();
    expect(insertValues[0].normalizationMeta).toBeDefined();
    expect(insertValues[0].normalizationVersion).toBe('v1.2.0');
    expect(insertValues[0].targetRoles).toBe('Frontend Developer');
    expect(insertValues[0].intakePayload).toBeDefined();
  });
});
