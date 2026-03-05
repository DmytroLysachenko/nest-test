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
  });

  it('rejects scheduler trigger with invalid token', async () => {
    const { service } = createService({
      SCHEDULER_AUTH_TOKEN: 'secret',
    });

    await expect(service.triggerSchedules('Bearer wrong-token')).rejects.toThrow(UnauthorizedException);
  });
});
