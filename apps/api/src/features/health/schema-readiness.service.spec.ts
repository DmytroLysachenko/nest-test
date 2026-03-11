import { SchemaReadinessService } from './schema-readiness.service';

describe('SchemaReadinessService', () => {
  it('throws in production when required tables are missing', async () => {
    const service = new SchemaReadinessService(
      { get: jest.fn().mockReturnValue('production') } as any,
      { findMissingTables: jest.fn().mockResolvedValue(['api_request_events']) } as any,
    );

    await expect(service.onModuleInit()).rejects.toThrow('Missing required database tables: api_request_events');
  });

  it('does not throw when required tables exist', async () => {
    const service = new SchemaReadinessService(
      { get: jest.fn().mockReturnValue('production') } as any,
      { findMissingTables: jest.fn().mockResolvedValue([]) } as any,
    );

    await expect(service.onModuleInit()).resolves.toBeUndefined();
  });
});
