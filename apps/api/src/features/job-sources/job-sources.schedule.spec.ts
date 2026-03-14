import { UnauthorizedException } from '@nestjs/common';

import { JobSourcesService } from './job-sources.service';

const createService = (configOverrides: Record<string, unknown> = {}) => {
  const configService = {
    get: jest.fn((key: string) => {
      if (key in configOverrides) {
        return configOverrides[key];
      }
      if (key === 'SCHEDULER_TRIGGER_BATCH_SIZE') {
        return 20;
      }
      return undefined;
    }),
  } as any;

  const logger = {
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as any;

  const db = {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
  } as any;

  const service = new JobSourcesService(configService, logger, db);
  return { service, db, configService };
};

describe('JobSourcesService schedule', () => {
  it('returns default schedule when user has no schedule row', async () => {
    const { service, db } = createService();
    db.select.mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            then: (cb: (rows: unknown[]) => unknown) => Promise.resolve(cb([])),
          }),
        }),
      }),
    });

    const result = await service.getSchedule('user-1');
    expect(result.enabled).toBe(false);
    expect(result.source).toBe('pracuj-pl-it');
    expect(result.nextRunAt).toBeNull();
    expect(result.lastRunStatus).toBeNull();
  });

  it('rejects scheduler trigger with invalid token', async () => {
    const { service } = createService({
      SCHEDULER_AUTH_TOKEN: 'secret',
    });

    await expect(service.triggerSchedules('Bearer wrong-token')).rejects.toThrow(UnauthorizedException);
  });

  it('writes a schedule event when the schedule is updated', async () => {
    const { service, db } = createService();
    const selectThen = jest
      .fn()
      .mockReturnValueOnce(Promise.resolve({ id: 'schedule-1' }))
      .mockReturnValueOnce(
        Promise.resolve({
          enabled: 1,
          cron: '0 9 * * *',
          timezone: 'Europe/Warsaw',
          source: 'pracuj-pl-it',
          limit: 20,
          careerProfileId: null,
          filters: null,
          lastTriggeredAt: null,
          nextRunAt: new Date('2026-03-15T09:00:00.000Z'),
          lastRunStatus: null,
        }),
      );

    db.select.mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            then: (cb: (rows: Array<Record<string, unknown>>) => unknown) =>
              selectThen().then((row) => cb(row ? [row] : [])),
          }),
        }),
      }),
    });
    db.update.mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue(undefined),
      }),
    });
    db.insert.mockReturnValue({
      values: jest.fn().mockResolvedValue(undefined),
    });

    const result = await service.updateSchedule('user-1', {
      enabled: true,
      cron: '0 9 * * *',
    });

    expect(result.enabled).toBe(true);
    expect(db.insert).toHaveBeenCalled();
  });
});
